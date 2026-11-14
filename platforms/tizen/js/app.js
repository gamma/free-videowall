/* Samsung-only adapter. No Roku source or packaging depends on this directory. */
(function () {
    "use strict";
    var player, items = [], index = 0, timer, generation = 0, hidden = false;
    var slide = document.getElementById("slide"), status = document.getElementById("status");
    function message(text) {
        status.textContent = text;
        status.style.display = text ? "block" : "none";
        if (text) console.log("Free Videowall: " + text);
    }
    function stop() {
        generation++;
        clearTimeout(timer);
        slide.onload = slide.onerror = null;
        slide.style.display = "none";
        slide.removeAttribute("src");
        if (player) {
            try { player.close(); } catch (error) { console.log(error); }
        }
    }
    function retry(error) {
        stop();
        message("USB-Playlist nicht verfügbar. Neuer Versuch in 5 Sekunden. " + (error && (error.message || error.name) || ""));
        if (!hidden) timer = setTimeout(scan, 5000);
    }
    function next() {
        index++;
        if (index >= items.length) scan();
        else play();
    }
    function play() {
        stop();
        if (hidden) return;
        var item = items[index], token = generation;
        function failed(error) {
            if (token !== generation) return;
            stop();
            message("Datei übersprungen: " + item.path + " (" + (error && (error.message || error.name) || "Wiedergabefehler") + ")");
            timer = setTimeout(next, 1000);
        }
        if (item.kind === "image") {
            // A missing or undecodable image must not stall the playlist.
            timer = setTimeout(function () { failed(); }, 15000);
            slide.onload = function () {
                if (token !== generation) return;
                clearTimeout(timer);
                message("");
                slide.style.display = "block";
                timer = setTimeout(next, item.duration * 1000);
            };
            slide.onerror = failed;
            slide.src = item.uri;
            return;
        }
        try {
            player.open(item.uri);
            player.setListener({
                onstreamcompleted: function () { if (token === generation) next(); },
                onerror: failed,
                oncurrentplaytime: function (milliseconds) {
                    if (token === generation && item.duration > 0 && milliseconds >= item.duration * 1000) next();
                }
            });
            player.setDisplayRect(0, 0, 1920, 1080);
            player.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");
            timer = setTimeout(function () { failed(); }, 20000);
            player.prepareAsync(function () {
                if (token !== generation) return;
                clearTimeout(timer);
                try { player.play(); message(""); } catch (error) { failed(error); }
            }, failed);
        } catch (error) { failed(error); }
    }
    function scan() {
        stop();
        if (hidden) return;
        var token = generation;
        message("Suche USB-Playlist …");
        function valid() { return token === generation && !hidden; }
        function error(err) { if (valid()) retry(err); }
        // Also recover if a device API never calls its completion callback.
        timer = setTimeout(function () { error(); }, 20000);
        tizen.filesystem.listStorages(function (storages) {
            if (!valid()) return;
            storages = storages.filter(function (storage) {
                return storage.type === "EXTERNAL" && storage.state === "MOUNTED" && storage.label.indexOf("removable_") === 0;
            }).sort(function (a, b) { return a.label.localeCompare(b.label); });
            function storageAt(n) {
                if (!valid()) return;
                if (n >= storages.length) { error(); return; }
                tizen.filesystem.resolve(storages[n].label, function (root) {
                    if (!valid()) return;
                    root.listFiles(function (files) {
                        if (!valid()) return;
                        files = files.filter(function (file) { return !file.isDirectory && /\.m3u8?$/i.test(file.name); });
                        files.sort(function (a, b) {
                            var ap = a.name.toLowerCase() === "playlist.m3u", bp = b.name.toLowerCase() === "playlist.m3u";
                            return ap !== bp ? (ap ? -1 : 1) : a.name.localeCompare(b.name);
                        });
                        function playlistAt(p) {
                            if (!valid()) return;
                            if (p >= files.length) { storageAt(n + 1); return; }
                            files[p].readAsText(function (text) {
                                if (!valid()) return;
                                var loaded = [];
                                window.parsePlaylist(text).forEach(function (item) {
                                    try {
                                        var file = root.resolve(item.path);
                                        if (!file.isDirectory) { item.uri = file.toURI(); loaded.push(item); }
                                    } catch (err) { console.log("Missing USB file: " + item.path); }
                                });
                                if (!loaded.length) { playlistAt(p + 1); return; }
                                items = loaded;
                                index = 0;
                                play();
                            }, function () { playlistAt(p + 1); }, "UTF-8");
                        }
                        playlistAt(0);
                    }, function () { storageAt(n + 1); });
                }, function () { storageAt(n + 1); }, "r");
            }
            storageAt(0);
        }, error);
    }
    function screensaver(enabled) {
        try { webapis.appcommon.setScreenSaver(enabled ? webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_ON : webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF); }
        catch (error) { console.log("Screensaver: " + error); }
    }
    window.addEventListener("load", function () {
        if (!window.tizen || !window.webapis || !webapis.avplay) {
            message("Dieser Prototyp benötigt einen Samsung/Tizen-TV mit AVPlay.");
            return;
        }
        player = webapis.avplay;
        ["MediaPlay", "MediaPause", "MediaPlayPause"].forEach(function (name) {
            try { tizen.tvinputdevice.registerKey(name); } catch (error) { console.log(error); }
        });
        document.addEventListener("keydown", function (event) {
            try {
                if (event.keyCode === 10009) {
                    stop(); screensaver(true); tizen.application.getCurrentApplication().exit();
                } else if (event.keyCode === 415 && player.getState() === "PAUSED") player.play();
                else if (event.keyCode === 19 && player.getState() === "PLAYING") player.pause();
                else if (event.keyCode === 10252) {
                    if (player.getState() === "PLAYING") player.pause();
                    else if (player.getState() === "PAUSED") player.play();
                }
            } catch (error) { console.log(error); }
        });
        document.addEventListener("visibilitychange", function () {
            hidden = document.hidden;
            if (hidden) { stop(); screensaver(true); }
            else { screensaver(false); scan(); }
        });
        try { tizen.filesystem.addStorageStateChangeListener(scan, retry); }
        catch (error) { console.log(error); }
        screensaver(false);
        scan();
    });
}());
