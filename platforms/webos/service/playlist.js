/* Pure playlist parser; filesystem resolution belongs to the platform adapter. */
(function (root) {
    "use strict";
    function parse(text) {
        var result = [], duration = -1, fade = 1.5;
        text.replace(/\uFEFF/g, "").replace(/\r/g, "").split("\n").forEach(function (line) {
            var entry = line.trim(), raw, extension;
            if (entry.indexOf("#EXTINF:") === 0) {
                raw = entry.slice(8).split(",")[0].trim();
                if (/^-?[0-9]+([.][0-9]+)?$/.test(raw)) duration = Number(raw);
            }
            if (entry.indexOf("#EXT-X-FADE:") === 0) {
                raw = entry.slice(12).trim();
                if (/^[0-9]+([.][0-9]+)?$/.test(raw)) fade = Math.min(10, Number(raw));
            }
            if (!entry || entry.charAt(0) === "#") return;
            entry = entry.replace(/\\/g, "/");
            extension = entry.split(".").pop().toLowerCase();
            // Keep paths within the selected USB root; never accept network URLs.
            if (entry.indexOf(":") === -1 && entry.charAt(0) !== "/" &&
                    entry.split("/").every(function (part) { return part !== ".."; }) &&
                    /^(mp4|m4v|mov|mkv|ts|jpg|jpeg|png)$/.test(extension)) {
                var image = /^(jpg|jpeg|png)$/.test(extension);
                result.push({path: entry, kind: image ? "image" : "video",
                    duration: image && duration <= 0 ? 10 : duration, fade: fade});
            }
            duration = -1;
            fade = 1.5;
        });
        return result;
    }
    if (typeof module !== "undefined") module.exports = parse;
    else root.parsePlaylist = parse;
}(this));
