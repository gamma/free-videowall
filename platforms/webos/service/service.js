"use strict";
const Service = require("webos-service");
const service = new Service("de.gammaproduction.freevideowall.usb");
const usb = require("./usb").adapter();
function call(uri,args){return new Promise((resolve,reject)=>{
    let request,settled=false;
    const timer=setTimeout(()=>finish(null,Error("TV settings timeout")),4000);
    function finish(result,error){if(settled)return;settled=true;clearTimeout(timer);if(request)request.cancel();
        if(error)reject(error);else if(!result.returnValue)reject(Error(result.errorText || "TV settings unavailable"));else resolve(result);}
    try{request=service.call(uri,args,message=>finish(message.payload));}catch(error){finish(null,error);}
});}
const overscan=require("./overscan")(call);
let ready=false,lease,activity,leaseGeneration=0;
const recovery=overscan.recover().catch(error=>console.error("Overscan recovery: "+error.message));
usb.server.listen(0,"127.0.0.1",()=>{ready=true;});
usb.server.on("error",error=>{console.error(error.message);process.exit(1);});
function expire(){release().catch(error=>console.error("Overscan restore: "+error.message));}
function release(){
    clearTimeout(lease);const token=++leaseGeneration;
    return recovery.then(()=>overscan.release()).catch(error=>{
        if(token===leaseGeneration)lease=setTimeout(expire,5000);
        throw error;
    }).then(()=>{
        if(token===leaseGeneration && activity){service.activityManager.complete(activity);activity=null;}
    });
}
service.register("release",message=>{release().then(()=>message.respond({returnValue:true}),error=>message.respond({returnValue:false,errorText:error.message}));});
service.register("scan",message=>{
    if(!ready){message.respond({returnValue:false,errorText:"USB-Dienst startet …"});return;}
    if(!activity)service.activityManager.create("USB playback",value=>{activity=value;});
    leaseGeneration++;clearTimeout(lease);lease=setTimeout(expire,35000);
    recovery.then(()=>overscan.acquire()).catch(error=>console.error("Overscan setup: "+error.message)).then(()=>{
        try{message.respond(usb.scan());}
        catch(error){message.respond({returnValue:false,errorText:"USB-Lesefehler: "+error.message});}
    });
});
