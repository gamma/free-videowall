"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
function player(){
    const nodes={},events={},requests=[],frames=[],timers=new Map();let id=0,plays=0;
    for(const name of ["video","slide","status","outgoing","incoming"])nodes[name]={style:{},removeAttribute(){},load(){},pause(){},play(){plays++;},duration:30,currentTime:0};
    const document={hidden:false,getElementById:n=>nodes[n],addEventListener:(n,f)=>events[n]=f};
    function Bridge(){requests.push(this);this.call=()=>{};this.cancel=()=>{};}
    const window={PalmServiceBridge:Bridge};
    const context={document,window,PalmServiceBridge:Bridge,VideowallTransitions:function(){return {prepare(){},hold(){},clear(){},reveal(item,done){done();}};},
        setInterval(){},setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);},requestAnimationFrame:fn=>frames.push(fn)};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../app/js/app.js"),"utf8"),context);
    const item={kind:"video",duration:30,fade:1.5,uri:"http://127.0.0.1/clip"};
    return {nodes,events,requests,frames,timers,document,window,get plays(){return plays;},respond(items){requests.at(-1).onservicecallback(JSON.stringify({returnValue:true,revision:"1",items}));},item};
}
test("single full-length video repeats within one decoder",()=>{
    const p=player();p.respond([p.item]);p.nodes.video.onloadedmetadata();p.nodes.video.onplaying();
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
