"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const manager=require("../service/overscan");
function setup(t,initial="off"){
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"overscan-"));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    let value=initial,input="dtv",fail=false;const writes=[],file=path.join(dir,"saved.json");
    const call=async(uri,args)=>{
        if(uri.endsWith("debugScalerStatus"))return {MAIN:{setting:{"cache input":input,"cache resolution":"fhd","cache justscan":value}}};
        if(uri.endsWith("getSystemSettings"))return {settings:{justScan:value}};
        if(fail)throw Error("write failed");
        writes.push(args);value=args.settings.justScan;return {returnValue:true};
    };
    return {manager:manager(call,{file}),call,file,writes,get value(){return value;},set value(v){value=v;},set input(v){input=v;},set fail(v){fail=v;}};
}
test("temporary setting restores original off and auto values",async t=>{
    for(const initial of ["off","auto"]){const s=setup(t,initial);await s.manager.acquire();assert.equal(s.value,"on");
        await s.manager.acquire();assert.equal(s.writes.length,1);await s.manager.release();assert.equal(s.value,initial);assert.equal(fs.existsSync(s.file),false);}
});
test("already enabled Just Scan remains enabled",async t=>{const s=setup(t,"on");await s.manager.acquire();await s.manager.release();assert.equal(s.writes.length,0);});
test("HDMI context is never changed",async t=>{const s=setup(t);s.input="hdmi2";await s.manager.acquire();assert.equal(s.writes.length,0);});
test("restart recovers a persisted prior setting",async t=>{const s=setup(t);await s.manager.acquire();await manager(s.call,{file:s.file}).recover();assert.equal(s.value,"off");});
test("independent owner setting is preserved",async t=>{const s=setup(t);await s.manager.acquire();s.value="auto";await s.manager.release();assert.equal(s.value,"auto");assert.equal(s.writes.length,1);});
test("failed restore retains journal and can retry",async t=>{const s=setup(t);await s.manager.acquire();s.fail=true;await assert.rejects(s.manager.release());assert.ok(fs.existsSync(s.file));s.fail=false;await s.manager.release();assert.equal(s.value,"off");});
test("overlapping acquire and release serialize without losing original value",async t=>{const s=setup(t);await Promise.all([s.manager.acquire(),s.manager.release(),s.manager.acquire()]);assert.equal(s.value,"on");await s.manager.release();assert.equal(s.value,"off");});
