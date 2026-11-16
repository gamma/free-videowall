"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const parse = require("../js/playlist.js");
function setup(options = {}) {
    const events = {}, elements = {}, timers = new Map(), opened = [], frames = [], stillModes = [];
    let serial = 0, listener, state = "NONE", scans = 0;
    const playlist = {name:"playlist.m3u", readAsText(done, fail) { if (options.readError) return fail(options.readError); done("#EXTINF:2\na.jpg\n#EXTINF:3\nb.mp4"); }};
    const root = {listFiles(done) { done(options.noPlaylist ? [] : [playlist]); }, resolve(path) { if (options.missingMedia) throw new Error("NotFoundError"); return {toURI() { return "file:///usb/" + path; }}; }};
    const player = {close() { state = "NONE"; }, open(uri) { opened.push(uri); },
        setListener(value) { listener = value; }, setVideoStillMode(value) { stillModes.push(value); }, setDisplayRect() {}, setDisplayMethod() {},
        prepareAsync(done) { done(); }, play() { state = "PLAYING"; }, pause() { state = "PAUSED"; }, getState() { return state; }};
    const document = {hidden:false, getElementById(id) { return elements[id] ||= {style:{}, removeAttribute() {}}; },
        addEventListener(name, handler) { events[name] = handler; }};
    const context = {console, document, parsePlaylist:parse,
        Image: class { set src(uri) { this.uri = uri; if (this.onload) this.onload(); } get src() { return this.uri; } },
        setTimeout(fn, delay) { timers.set(++serial, {fn, delay}); return serial; }, clearTimeout(id) { timers.delete(id); },
        addEventListener(name, handler) { events[name] = handler; },
        requestAnimationFrame(fn) { if (options.deferPaint) frames.push(fn); else fn(); },
        webapis:{avplay:player, appcommon:{AppCommonScreenSaverState:{}, setScreenSaver() {}}},
        tizen:{filesystem:{listStorages(done) { scans++; done([{label:"removable_sda1", type:"EXTERNAL", state:"MOUNTED"}]); },
            resolve(label, done) { done(root); }, addStorageStateChangeListener() {}}, tvinputdevice:{registerKey() {}}}};
    context.window = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(require.resolve("../js/transitions.js"), "utf8"), context);
    vm.runInContext(fs.readFileSync(require.resolve("../js/app.js"), "utf8"), context);
    events.load();
    return {events, elements, timers, opened, player, document, frames, stillModes, get listener() { return listener; }, get scans() { return scans; }};
}
test("USB image duration advances to AVPlay, video limit reloads playlist", () => {
    const app = setup();
    assert.equal(app.elements.slide.src, "file:///usb/a.jpg");
    app.elements.slide.onload();
    const duration = [...app.timers.values()].find(timer => timer.delay === 2000);
    assert.ok(duration);
    duration.fn();
    assert.deepEqual(app.opened, ["file:///usb/b.mp4"]);
    app.listener.oncurrentplaytime(3000);
    assert.equal(app.scans, 2);
    assert.equal(app.elements.slide.src, "file:///usb/a.jpg");
});
test("stale AVPlay callbacks cannot restart playback after backgrounding", () => {
    const app = setup();
    app.elements.slide.onerror();
    [...app.timers.values()].find(timer => timer.delay === 1000).fn();
    const old = app.listener;
    app.document.hidden = true;
    app.events.visibilitychange();
    old.onstreamcompleted();
    old.onerror();
    assert.equal(app.scans, 1);
    assert.equal(app.player.getState(), "NONE");
    app.document.hidden = false;
    app.events.visibilitychange();
    assert.equal(app.scans, 2);
});

test("image-to-video dissolve holds the old image over AVPlay until fade completes", () => {
    const app = setup();
    app.elements.slide.onload();
    [...app.timers.values()].find(timer => timer.delay === 2000).fn();
    assert.equal(app.elements.outgoing.src, "file:///usb/a.jpg");
    app.listener.oncurrentplaytime(100);
    assert.equal(app.elements.outgoing.style.transition, "opacity 1.5s linear");
    assert.equal(app.elements.incoming.src, "file:///usb/b.mp4.start.jpg");
    [...app.timers.values()].find(timer => timer.delay === 1500).fn();
    assert.equal(app.elements.outgoing.style.display, "none");
    assert.equal(app.elements.incoming.style.display, "none");
});
test("last-video-to-first-image dissolve survives playlist rescan", () => {
    const app = setup();
    app.elements.slide.onload();
    [...app.timers.values()].find(timer => timer.delay === 2000).fn();
    app.listener.oncurrentplaytime(100);
    [...app.timers.values()].find(timer => timer.delay === 1500).fn();
    app.listener.onstreamcompleted();
    assert.equal(app.elements.outgoing.src, "file:///usb/b.mp4.end.jpg");
    assert.equal(app.elements.outgoing.style.opacity, "1");
    app.elements.slide.onload();
    assert.equal(app.elements.outgoing.style.opacity, "0");
    assert.ok([...app.timers.values()].find(timer => timer.delay === 1500));
});

test("missing playlist reports root-directory search rather than an empty generic error", () => {
    const app = setup({noPlaylist:true});
    assert.match(app.elements.status.textContent, /Keine M3U\/M3U8 im Hauptverzeichnis/);
    assert.ok([...app.timers.values()].some(timer => timer.delay === 5000));
});
test("playlist read error and unresolved media remain visible in USB diagnostics", () => {
    const unreadable = setup({readError:{name:"IOError", message:"USB read failed"}});
    assert.match(unreadable.elements.status.textContent, /playlist.m3u: Lesen fehlgeschlagen \(USB read failed\)/);
    const missing = setup({missingMedia:true});
    assert.match(missing.elements.status.textContent, /Keine referenzierte Mediendatei gefunden.*a.jpg, b.mp4/);
});

test("outgoing video stays open until the held overlay can paint; hidden callbacks are discarded", () => {
    const app = setup({deferPaint:true});
    app.elements.slide.onerror();
    [...app.timers.values()].find(timer => timer.delay === 1000).fn();
    app.frames.shift()(); app.frames.shift()();
    assert.equal(app.player.getState(), "PLAYING");
    app.listener.onstreamcompleted();
    assert.equal(app.elements.outgoing.style.opacity, "1");
    assert.equal(app.player.getState(), "PLAYING");
    app.frames.shift()();
    assert.equal(app.player.getState(), "PLAYING");
    app.document.hidden = true; app.events.visibilitychange();
    const scans = app.scans;
    app.frames.shift()();
    assert.equal(app.scans, scans);
    assert.equal(app.player.getState(), "NONE");
});
test("held image covers video preparation until playback actually advances", () => {
    const app = setup();
    app.elements.slide.onload();
    [...app.timers.values()].find(timer => timer.delay === 2000).fn();
    assert.equal(app.player.getState(), "PLAYING");
    assert.equal(app.elements.outgoing.style.opacity, "1");
    app.listener.oncurrentplaytime(0);
    assert.equal(app.elements.outgoing.style.opacity, "1");
    app.listener.oncurrentplaytime(100);
    assert.equal(app.elements.outgoing.style.opacity, "0");
    const fade = [...app.timers.values()].find(timer => timer.delay === 1500);
    app.listener.oncurrentplaytime(500);
    assert.ok([...app.timers.values()].includes(fade));
});

test("video loop freezes display buffer and keeps successful rescan feedback hidden", () => {
    const app = setup();
    app.elements.slide.onload();
    [...app.timers.values()].find(timer => timer.delay === 2000).fn();
    app.listener.oncurrentplaytime(100);
    [...app.timers.values()].find(timer => timer.delay === 1500).fn();
    const feedback = [];
    let text = app.elements.status.textContent;
    Object.defineProperty(app.elements.status, "textContent", {get() { return text; }, set(value) { feedback.push(value); text = value; }});
    app.listener.onstreamcompleted();
    assert.equal(app.stillModes.at(-1), "true");
    assert.ok(!feedback.includes("Suche USB-Playlist …"));
    assert.equal(app.elements.slide.src, "file:///usb/a.jpg");
});
