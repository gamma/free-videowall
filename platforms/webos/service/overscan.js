"use strict";
const fs=require("fs"),path=require("path");
const SETTINGS="luna://com.webos.settingsservice/setSystemSettings";
// Only the active video context is changed. HDMI profiles are never touched.
function manager(call,options){
    options=options || {};
    const file=options.file || "/var/lib/freevideowall/overscan.json";
    let queue=Promise.resolve();
    function read(){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch(error){if(error.code==="ENOENT")return null;throw error;}}
    function save(value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+".tmp",JSON.stringify(value),{mode:0o600});fs.renameSync(file+".tmp",file);}
    function remove(){try{fs.unlinkSync(file);}catch(error){if(error.code!=="ENOENT")throw error;}}
    function set(saved,value){return call(SETTINGS,{category:"aspectRatio",dimension:saved.dimension,settings:{justScan:value}});}
    async function restore(){
        const saved=read();if(!saved)return;
        // Do not overwrite a setting changed independently by the owner.
        const result=await call("luna://com.webos.settingsservice/getSystemSettings",{
            category:"aspectRatio",keys:["justScan"],app_id:"com.webos.app.livetv",dimension:saved.dimension});
        if(result.settings.justScan==="on")await set(saved,saved.previous);
        remove();
    }
    async function acquire(){
        const result=await call("luna://com.webos.service.videooutput/display/debugScalerStatus",{});
        const setting=result.MAIN && result.MAIN.setting;
        if(!setting)throw Error("Video scaler context unavailable");
        const dimension={input:setting["cache input"],resolution:setting["cache resolution"]};
        if(!dimension.input || !dimension.resolution)throw Error("Video scaler context incomplete");
        // The app video plane uses DTV; a background HDMI context is not ours.
        if(dimension.input!=="dtv")return;
        let saved=read();
        if(saved && JSON.stringify(saved.dimension)!==JSON.stringify(dimension)){await restore();saved=null;}
        if(!saved){
            const previous=setting["cache justscan"];
            if(!["on","off","auto"].includes(previous))throw Error("Unknown Just Scan value");
            if(previous==="on")return;
            saved={dimension,previous};save(saved);
        }
        // Reassert until the video plane has adopted the current context.
        if(setting["cache justscan"]!=="on")await set(saved,"on");
    }
    function serial(fn){const result=queue.then(fn);queue=result.catch(()=>{});return result;}
    return {acquire:()=>serial(acquire),release:()=>serial(restore),recover:()=>serial(restore)};
}
module.exports=manager;
