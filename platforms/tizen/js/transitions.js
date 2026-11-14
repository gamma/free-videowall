/* One video decoder: dissolve cached stills above AVPlay, never two videos. */
(function (root) {
    "use strict";
    function Transitions(outgoing, incoming) {
        var current = null, held = false, duration = 0, timer, serial = 0;
        function hide(layer) {
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
        function hold() {
            serial++;
            clearTimeout(timer);
            hide(incoming);
            held = !!(current && current.image && current.fade > 0);
            if (held) {
                duration = current.fade;
                outgoing.src = current.image.src;
                outgoing.style.transition = "none";
                outgoing.style.display = "block";
                outgoing.style.opacity = "1";
            } else hide(outgoing);
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
            // Images already occupy the underlying slide. Videos use the same
            // start-frame sidecars as Roku, falling back to the running video.
            if (held && item.kind === "video") load(item.firstImage, start);
            else start(null);
        }
        return {prepare:prepare, hold:hold, reveal:reveal, clear:clear};
    }
    if (typeof module !== "undefined") module.exports = Transitions;
    else root.VideowallTransitions = Transitions;
}(this));
