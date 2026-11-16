"use strict";
const {test} = require("node:test"), assert=require("node:assert/strict");
const fs=require("fs"),os=require("os"),path=require("path"),http=require("http");
const {mounts,inside,range,adapter}=require("../service/usb");
test("only actual USB mounts, octal escapes and duplicate removal",()=>{
    assert.deepEqual(mounts("tmpfs /tmp/usb tmpfs rw 0 0\n/dev/sda /tmp/usb/a\\040b exfat rw 0 0\n/dev/sda /tmp/usb/a\\040b exfat rw 0 0\n/dev/sda /jail/tmp/usb/a exfat rw 0 0"),["/tmp/usb/a b"]);
});
test("single byte ranges, suffix and invalid ranges",()=>{
    assert.deepEqual(range("bytes=2-5",10),{start:2,end:5,partial:true});
    assert.deepEqual(range("bytes=-3",10),{start:7,end:9,partial:true});
    assert.deepEqual(range("bytes=5-",10),{start:5,end:9,partial:true});
    for(const value of ["bytes=10-","bytes=-0","bytes=4-2","bytes=0-1,4-5","bytes=-"])assert.equal(range(value,10),null);
});
test("USB scan skips AppleDouble, confines paths, streams ranges and clears on unplug",async()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"videowall-usb-"));
    const root=path.join(dir,"usb");fs.mkdirSync(root);let connected=true;
    fs.writeFileSync(path.join(root,"._autostart.m3u"),Buffer.from([0,255,254]));
    fs.writeFileSync(path.join(root,"autostart.m3u"),"#EXTM3U\n#EXTINF:30,Test\nclip.mp4\n../outside.mp4\nhttps://example.com/v.mp4\nlink.mp4\n");
    fs.writeFileSync(path.join(root,"clip.mp4"),"0123456789");
    fs.writeFileSync(path.join(dir,"outside.mp4"),"private");
    fs.symlinkSync(path.join(dir,"outside.mp4"),path.join(root,"link.mp4"));
    assert.throws(()=>inside(root,"../outside.mp4"));assert.throws(()=>inside(root,"link.mp4"));
    const usb=adapter({roots:()=>connected ? [root] : []});
    await new Promise(resolve=>usb.server.listen(0,"127.0.0.1",resolve));
    function get(url,headers={}) {return new Promise((resolve,reject)=>http.get(url,{headers},r=>{
        let data="";r.on("data",chunk=>data+=chunk);r.on("end",()=>resolve({status:r.statusCode,data,headers:r.headers}));
    }).on("error",reject));}
    try {
        const result=usb.scan();assert.equal(result.items.length,1);assert.equal(result.playlist,"autostart.m3u");
        assert.equal(usb.scan().revision,result.revision);
        const uri=result.items[0].uri;
        const response=await get(uri,{range:"bytes=2-5"});assert.equal(response.status,206);assert.equal(response.data,"2345");
        assert.equal((await get(uri,{range:"bytes=99-"})).status,416);
        assert.equal((await get(new URL("/etc/passwd",uri))).status,404);
        connected=false;assert.equal(usb.scan().items.length,0);assert.equal((await get(uri)).status,404);
        connected=true;assert.equal(usb.scan().items.length,1);
    } finally {await new Promise(resolve=>usb.server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
