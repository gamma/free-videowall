"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
function setup() {
    const images = [], timers = new Map();
    let id = 0;
    const context = {Image:class { constructor() { images.push(this); } },
        setTimeout(fn, delay) { timers.set(++id, {fn, delay}); return id; }, clearTimeout(id) { timers.delete(id); }};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(require.resolve("../js/transitions.js"), "utf8"), context);
    const layer = () => ({style:{}, removeAttribute() {}});
    const outgoing = layer(), incoming = layer();
    return {transitions:context.VideowallTransitions(outgoing, incoming), outgoing, incoming, images, timers};
}
test("missing end frame falls back immediately without leaving an overlay", () => {
    const app = setup();
    let completed = false;
    app.transitions.prepare({kind:"video", endImage:"end.jpg", fade:1.5});
    app.images[0].onerror();
    app.transitions.hold();
    app.transitions.reveal({kind:"image"}, () => { completed = true; });
    assert.equal(completed, true);
    assert.equal(app.outgoing.style.display, "none");
});
test("missing start frame times out and fades to the running video", () => {
    const app = setup();
    let completed = false;
    app.transitions.prepare({kind:"image", uri:"old.jpg", fade:2.5});
    app.images[0].onload();
    app.transitions.hold();
    app.transitions.reveal({kind:"video", firstImage:"missing.jpg"}, () => { completed = true; });
    [...app.timers.values()].find(timer => timer.delay === 2000).fn();
    assert.equal(app.outgoing.style.transition, "opacity 2.5s linear");
    assert.equal(completed, false);
    [...app.timers.values()].find(timer => timer.delay === 2500).fn();
    assert.equal(completed, true);
    assert.equal(app.incoming.style.display, "none");
});
test("clearing while a start frame loads prevents stale layers from appearing", () => {
    const app = setup();
    app.transitions.prepare({kind:"image", uri:"old.jpg", fade:1.5});
    app.images[0].onload();
    app.transitions.hold();
    app.transitions.reveal({kind:"video", firstImage:"start.jpg"}, () => assert.fail("stale completion"));
    app.transitions.clear();
    app.images[1].onload();
    assert.equal(app.outgoing.style.display, "none");
    assert.equal(app.incoming.style.display, "none");
});
test("zero fade bypasses the outgoing overlay", () => {
    const app = setup();
    app.transitions.prepare({kind:"image", uri:"old.jpg", fade:0});
    app.images[0].onload();
    app.transitions.hold();
    app.transitions.reveal({kind:"image"}, () => {});
    assert.equal(app.outgoing.style.display, "none");
    assert.equal(app.timers.size, 0);
});
