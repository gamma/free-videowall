"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Transitions=require("../app/js/transitions");
test("fade reveals the running video without freezing its start frame",()=>{
    const previous=global.Image,images=[];
    global.Image=class {constructor(){images.push(this);}};
    const layer=()=>({style:{},removeAttribute(){}}),outgoing=layer(),incoming=layer();
    const transitions=Transitions(outgoing,incoming);
    try {
        transitions.prepare({kind:"image",uri:"old.png",fade:0.01});images[0].onload();
        transitions.hold();outgoing.onload();assert.equal(outgoing.style.opacity,"1");
        transitions.reveal({kind:"video",firstImage:"start.jpg"},()=>{});
        assert.equal(images.length,1,"Do not load an incoming start frame over a moving video");
        assert.equal(outgoing.style.transition,"opacity 0.01s linear");
        assert.notEqual(incoming.style.display,"block");
    } finally {transitions.clear();global.Image=previous;}
});

test("decoder reset waits for the actual DOM image, not its detached preload",()=>{
    const previous=global.Image,images=[];
    global.Image=class {constructor(){images.push(this);}};
    const layer=()=>({style:{},removeAttribute(){}}),outgoing=layer(),incoming=layer();
    const transitions=Transitions(outgoing,incoming);let ready=0;
    try {
        transitions.prepare({kind:"video",endImage:"end.jpg",fade:1.5});images[0].onload();
        transitions.hold(()=>{ready++;});
        assert.equal(ready,0);assert.equal(outgoing.style.display,"none");
        outgoing.onload();assert.equal(ready,1);assert.equal(outgoing.style.display,"block");
    } finally {transitions.clear();global.Image=previous;}
});
test("hiding while the DOM cover loads cancels the pending decoder reset",()=>{
    const previous=global.Image,images=[];
    global.Image=class {constructor(){images.push(this);}};
    const layer=()=>({style:{},removeAttribute(){}}),outgoing=layer(),incoming=layer();
    const transitions=Transitions(outgoing,incoming);let ready=0;
    try {
        transitions.prepare({kind:"video",endImage:"end.jpg",fade:1.5});images[0].onload();
        transitions.hold(()=>{ready++;});const late=outgoing.onload;transitions.clear();late();
        assert.equal(ready,0);assert.equal(outgoing.style.display,"none");
    } finally {transitions.clear();global.Image=previous;}
});
