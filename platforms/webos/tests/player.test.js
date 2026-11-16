"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
function player(options){
    options=options || {};
    const nodes={},events={},requests=[],frames=[],timers=new Map(),delays=new Map();let id=0,plays=0,reveals=0,frameCallback,cancelled=0,resets=0;
    for(const name of ["video","slide","status","outgoing","incoming"])nodes[name]={style:{},removeAttribute(){},load(){if(name==="video")resets++;},pause(){},play(){plays++;},duration:30,currentTime:0};
    if(!options.legacy){nodes.video.requestVideoFrameCallback=fn=>{frameCallback=fn;return 1;};nodes.video.cancelVideoFrameCallback=()=>{cancelled++;};}
    const document={hidden:false,getElementById:n=>nodes[n],addEventListener:(n,f)=>events[n]=f};
    function Bridge(){requests.push(this);this.call=(uri)=>{this.uri=uri;};this.cancel=()=>{};}
    const window={PalmServiceBridge:Bridge,addEventListener:(n,f)=>events[n]=f};
    const context={document,window,PalmServiceBridge:Bridge,VideowallTransitions:function(){return {prepare(){},hold(done){done();},clear(){},reveal(item,done){reveals++;done();}};},
        setInterval(){},setTimeout(fn,delay){timers.set(++id,fn);delays.set(id,delay);return id;},clearTimeout(id){timers.delete(id);delays.delete(id);},requestAnimationFrame:fn=>frames.push(fn)};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../app/js/app.js"),"utf8"),context);
    const item={kind:"video",duration:30,fade:1.5,uri:"http://127.0.0.1/clip"};
    return {nodes,events,requests,frames,timers,delays,document,window,get plays(){return plays;},get reveals(){return reveals;},get cancelled(){return cancelled;},get resets(){return resets;},decoded(){frameCallback();},paint(){while(frames.length)frames.shift()();},respond(items){requests.filter(r=>r.uri.endsWith("/scan")).at(-1).onservicecallback(JSON.stringify({returnValue:true,revision:"1",items}));},item};
}
test("single full-length video repeats within one decoder",()=>{
    const p=player();p.respond([p.item]);p.nodes.video.onloadedmetadata();p.nodes.video.onplaying();p.decoded();p.paint();
    assert.equal(p.nodes.video.loop,true);assert.equal(p.plays,1);assert.equal(p.nodes.status.style.display,"none");
});
test("concurrent end events advance only once",()=>{
    const p=player();p.respond([p.item,p.item]);p.nodes.video.onended();p.nodes.video.onended();
    assert.equal(p.frames.length,1);p.frames.shift()();p.frames.shift()();assert.equal(p.plays,2);
    assert.equal(p.window.videowallState().index,1);
});
test("hiding during an outgoing frame prevents background restart",()=>{
    const p=player();p.respond([p.item,p.item]);p.nodes.video.onended();p.document.hidden=true;p.events.visibilitychange();
    p.frames.shift()();p.frames.shift()();assert.equal(p.plays,1);assert.equal(p.window.videowallState().active,false);
});
test("late USB response cannot resume a hidden app",()=>{
    const p=player();p.document.hidden=true;p.events.visibilitychange();p.respond([p.item]);assert.equal(p.plays,0);
});

test("playing does not uncover video before a decoded frame paints; reveal is once only",()=>{
    const p=player();p.respond([p.item,p.item]);p.nodes.video.onplaying();
    assert.equal(p.reveals,0);p.decoded();assert.equal(p.reveals,0);
    p.paint();assert.equal(p.reveals,1);p.nodes.video.onplaying();p.nodes.video.ontimeupdate();
    assert.equal(p.reveals,1);
});
test("decoded frame from a hidden player cannot uncover an old transition",()=>{
    const p=player();p.respond([p.item]);p.decoded();p.document.hidden=true;p.events.visibilitychange();
    p.paint();assert.equal(p.reveals,0);assert.ok(p.cancelled>0);
});
test("older webOS waits for positive playback time and data before uncovering",()=>{
    const p=player({legacy:true});p.respond([p.item]);p.nodes.video.onplaying();assert.equal(p.frames.length,0);
    p.nodes.video.currentTime=0.1;p.nodes.video.readyState=2;p.nodes.video.ontimeupdate();p.paint();
    assert.equal(p.reveals,1);
});

test("advertised frame callback may never fire on the LG hardware plane",()=>{
    const p=player();p.respond([p.item]);p.nodes.video.onplaying();assert.equal(p.reveals,0);
    p.nodes.video.currentTime=0.2;p.nodes.video.readyState=4;p.nodes.video.ontimeupdate();p.paint();
    assert.equal(p.reveals,1);p.decoded();p.paint();assert.equal(p.reveals,1);
});

test("video to PNG retains the decoder and paints the PNG before fading",()=>{
    const p=player(),image={kind:"image",duration:30,fade:1.5,uri:"http://127.0.0.1/logo.png"};
    p.respond([p.item,image]);p.decoded();p.paint();const resets=p.resets,reveals=p.reveals;
    p.nodes.video.onended();p.paint();
    assert.equal(p.window.videowallState().index,1);
    assert.equal(p.resets,resets,"Do not empty the hardware plane before an image");
    p.nodes.slide.onload();assert.equal(p.reveals,reveals);
    p.paint();assert.equal(p.reveals,reveals+1);
    p.document.hidden=true;p.events.visibilitychange();assert.ok(p.resets>resets,"Backgrounding must still release the decoder");
});

test("PNG fades over the final 1.5 seconds of running video, then holds for 30 seconds",()=>{
    const p=player(),image={kind:"image",duration:30,fade:1.5,uri:"http://127.0.0.1/logo.png"};
    p.respond([p.item,image]);p.nodes.slide.onload();p.decoded();p.paint();
    const resets=p.resets;
    p.nodes.video.currentTime=28.4;p.nodes.video.ontimeupdate();assert.equal(p.window.videowallState().blend,null);
    assert.equal(p.nodes.slide.style.opacity,"0");
    p.nodes.video.currentTime=28.5;p.nodes.video.ontimeupdate();
    assert.equal(p.window.videowallState().index,0,"Keep video active during its outgoing fade");
    assert.equal(p.nodes.slide.style.transition,"opacity 1.5s linear");
    assert.equal(p.nodes.video.style.transition,"none");
    assert.equal(p.nodes.video.style.opacity,"1");
    assert.equal(p.nodes.slide.style.mixBlendMode,"normal");assert.equal(p.resets,resets);
    assert.equal(p.window.videowallState().blend.start,28.5);
    p.nodes.video.currentTime=30;p.nodes.video.ontimeupdate();
    assert.equal(p.window.videowallState().index,1);assert.equal(p.window.videowallState().blend,null);
    assert.equal(p.nodes.slide.style.opacity,"1");
    assert.equal(p.nodes.slide.style.mixBlendMode,"normal");assert.equal(p.resets,resets);
    assert.ok([...p.delays.values()].includes(30000),"Full image hold starts after video end");
    p.nodes.video.onended();assert.equal(p.frames.length,0,"Duplicate end cannot skip the PNG");
});
test("video-to-image overlap respects a shorter EXTINF and cancels when hidden",()=>{
    const p=player(),image={kind:"image",duration:30,fade:1.5,uri:"http://127.0.0.1/logo.png"};
    p.respond([{...p.item,duration:5},image]);p.nodes.slide.onload();
    p.nodes.video.currentTime=3.5;p.nodes.video.ontimeupdate();assert.equal(p.window.videowallState().blend.start,3.5);
    p.document.hidden=true;p.events.visibilitychange();
    p.nodes.video.currentTime=5;p.nodes.video.onended();assert.equal(p.window.videowallState().active,false);
    assert.equal(p.nodes.slide.style.display,"none");assert.equal(p.window.videowallState().blend,null);
});

test("leaving or hiding the app releases its temporary TV display setting",()=>{
    const p=player();p.document.hidden=true;p.events.visibilitychange();
    assert.ok(p.requests.at(-1).uri.endsWith("/release"));
    p.events.pagehide();assert.ok(p.requests.at(-1).uri.endsWith("/release"));
});
