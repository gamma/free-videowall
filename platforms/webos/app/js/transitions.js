/* webOS: fade an outgoing still directly onto the decoded HTML video. */
(function (root) {
    "use strict";
    function Transitions(outgoing, incoming) {
        var current = null, held = false, duration = 0, timer, serial = 0;
        function hide(layer) {
            layer.onload = layer.onerror = null;
            layer.style.transition = "none";
            layer.style.opacity = "0";
            layer.style.display = "none";
            layer.removeAttribute("src");
        }
        function load(uri, done) {
            if (!uri) { done(null); return; }
            var image = new Image(), settled = false;
            var timeout = setTimeout(function () { finish(null); }, 2000);
            function finish(value) {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                image.onload = image.onerror = null;
                done(value);
            }
            image.onload = function () { finish(image); };
            image.onerror = function () { finish(null); };
            image.src = uri;
        }
        function clear() {
            serial++;
            clearTimeout(timer);
            current = null;
            held = false;
            hide(outgoing);
            hide(incoming);
        }
        function prepare(item) {
            var token = serial;
            current = {fade:item.fade, image:null};
            var entry = current;
            load(item.kind === "image" ? item.uri : item.endImage, function (image) {
                if (token === serial && current === entry) entry.image = image;
            });
        }
        function hold(done) {
            serial++;
            var token = serial, settled = false;
            clearTimeout(timer);
            hide(incoming);
            hide(outgoing);
            held = !!(current && current.image && current.fade > 0);
            if (!held) { if (done) done(); return; }
            duration = current.fade;
            function ready(loaded) {
                if (settled || token !== serial) return;
                settled = true;
                clearTimeout(timer);
                outgoing.onload = outgoing.onerror = null;
                held = loaded;
                if (loaded) {
                    outgoing.style.display = "block";
                    outgoing.style.opacity = "1";
                } else hide(outgoing);
                if (done) done();
            }
            // This DOM image can refetch even though the detached preload is
            // ready (USB responses use no-store). Never expose its black
            // background or reset the decoder until it has actually loaded.
            outgoing.onload = function () { ready(true); };
            outgoing.onerror = function () { ready(false); };
            timer = setTimeout(function () { ready(false); }, 2000);
            outgoing.src = current.image.src;
            if (outgoing.complete && outgoing.naturalWidth > 0) ready(true);
        }
        function reveal(item, done) {
            var token = serial;
            function start(image) {
                if (token !== serial) return;
                if (!held) { done(); return; }
                if (image) {
                    incoming.src = image.src;
                    incoming.style.display = "block";
                    incoming.style.opacity = "1";
                }
                // Force the initial opacity to be painted before applying CSS fade.
                void outgoing.offsetWidth;
                outgoing.style.transition = "opacity " + duration + "s linear";
                outgoing.style.opacity = "0";
                timer = setTimeout(function () {
                    if (token !== serial) return;
                    hide(outgoing);
                    hide(incoming);
                    held = false;
                    done();
                }, duration * 1000);
            }
            // app.js calls reveal only after a decoded frame is displayed.
            // A start-frame overlay would freeze the opening of a moving video
            // and jump forward when removed while playback runs underneath.
            start(null);
        }
        return {prepare:prepare, hold:hold, reveal:reveal, clear:clear};
    }
    if (typeof module !== "undefined") module.exports = Transitions;
    else root.VideowallTransitions = Transitions;
}(this));
