"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const parse = require("../js/playlist.js");
test("mixed USB playlist preserves timing and resets directives", () => {
    const result = parse("\uFEFF#EXTM3U\r\n#EXTINF:3.5,Slide\r\n#EXT-X-FADE:20\r\nbilder\\test.JPG\r\nvideo.mp4\nplain.png");
    assert.deepEqual(result, [
        {path:"bilder/test.JPG", kind:"image", duration:3.5, fade:10},
        {path:"video.mp4", kind:"video", duration:-1, fade:1.5},
        {path:"plain.png", kind:"image", duration:10, fade:1.5}
    ]);
});
test("rejects remote media and paths escaping the USB root", () => {
    assert.equal(parse("https://host/a.mp4\n../a.mp4\na/../../a.png\n/root.png\nfile:///a.mp4\nnotes.txt").length, 0);
});
test("invalid directives keep defaults; skipped entries consume directives", () => {
    assert.deepEqual(parse("#EXTINF:nonsense\n#EXT-X-FADE:-2\na.png\n#EXTINF:2\nmissing.txt\nb.mp4"), [
        {path:"a.png", kind:"image", duration:10, fade:1.5},
        {path:"b.mp4", kind:"video", duration:-1, fade:1.5}
    ]);
});
