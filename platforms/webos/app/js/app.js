/* Menu-free offline USB loop, one hardware video decoder. */
(function () {
    "use strict";
    var video=document.getElementById("video"), slide=document.getElementById("slide"), status=document.getElementById("status");
    var transitions=new VideowallTransitions(document.getElementById("outgoing"),document.getElementById("incoming"));
    var items=[], revision="", index=0, generation=0, timer, bridge, scanning=false, active=false, failed=false;
    var switching=false, scanTimer, scanSerial=0, frameRequest, blendTimer, blend=null;
    function message(text) { status.textContent=text; status.style.display=text ? "block" : "none"; }
    function stop(preserveVideo) {
        generation++; clearTimeout(timer);clearTimeout(blendTimer);blend=null;
        slide.onload=slide.onerror=null;slide.style.transition="none";slide.style.opacity="1";slide.style.mixBlendMode="normal";
        if(frameRequest!==undefined && video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameRequest);
        frameRequest=undefined; video.pause();
        video.style.transition="none";video.style.opacity="1";
        // A following PNG needs no decoder reset. Keep the last video buffer
        // until another video is opened or the app is hidden/stopped.
        if(!preserveVideo){video.removeAttribute("src");video.load();}
        slide.style.display="none"; active=false;
    }
    function fail(text) { clearTimeout(blendTimer);blend=null;failed=true; message(text); clearTimeout(timer); timer=setTimeout(function(){ revision=""; scan(); },5000); }
    function next() {
        if (!active || !items.length || switching) return;
        switching=true;
        var token=generation;
        // Hold must finish loading the actual DOM cover, then let it paint.
        transitions.hold(function(){
            if(token!==generation || document.hidden)return;
            requestAnimationFrame(function(){ requestAnimationFrame(function(){
                if(token===generation && !document.hidden)play((index+1)%items.length);
            }); });
        });
    }
    function play(position) {
        var item=items[position];
        stop(item.kind === "image"); active=true; failed=false; switching=false; index=position;
        var token=generation, revealed=false, revealing=false;
        function revealVideo() {
            if(token!==generation || document.hidden || revealed || revealing)return;
            revealing=true;
            // The hardware video plane must paint before fading its cover.
            requestAnimationFrame(function(){ requestAnimationFrame(function(){
                if(token!==generation || document.hidden)return;
                revealed=true;message("");transitions.reveal(item,function(){});
            }); });
        }
        transitions.prepare(item);
        if (item.kind === "image") {
            slide.onload=function(){
                if(token!==generation)return;
                // Loaded pixels must paint below the cover before it fades.
                requestAnimationFrame(function(){ requestAnimationFrame(function(){
                    if(token!==generation || document.hidden)return;
                    message("");transitions.reveal(item,function(){});
                    timer=setTimeout(next,Math.max(0.1,item.duration)*1000);
                }); });
            };
            slide.onerror=function(){ if(token===generation)fail("USB-Bild konnte nicht geladen werden."); };
            slide.src=item.uri; slide.style.display="block";
        } else {
            var imagePosition=(index+1)%items.length, upcoming=items[imagePosition], imageReady=false;
            function finishImageBlend() {
                if(token!==generation || !blend || document.hidden)return;
                generation++;clearTimeout(timer);clearTimeout(blendTimer);
                if(frameRequest!==undefined && video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameRequest);
                frameRequest=undefined;video.pause();video.style.transition="none";video.style.opacity="0";
                blend=null;switching=false;index=imagePosition;
                slide.onload=slide.onerror=null;
                slide.style.transition="none";slide.style.opacity="1";slide.style.mixBlendMode="normal";
                transitions.clear();transitions.prepare(upcoming);message("");
                timer=setTimeout(next,Math.max(0.1,upcoming.duration)*1000);
            }
            function checkImageBlend() {
                clearTimeout(blendTimer);
                if(token!==generation || document.hidden || failed || video.loop || upcoming.kind!=="image" || item.fade<=0)return;
                var end=video.duration;
                if(item.duration>0)end=isFinite(end) ? Math.min(end,item.duration) : item.duration;
                if(isFinite(end) && end>0){
                    if(blend && video.currentTime>=end){finishImageBlend();return;}
                    if(!blend && imageReady && video.currentTime>=Math.max(0,end-item.fade) && video.currentTime<end){
                        var seconds=end-video.currentTime;
                        blend={from:index,to:imagePosition,start:video.currentTime,seconds:seconds};
                        // Fade the real PNG over the still-running video plane.
                        // No end-frame substitution and no decoder reset.
                        // Source-over already weights the opaque video by
                        // (1 - image opacity). Fading it too darkens the mix.
                        slide.style.mixBlendMode="normal";
                        void slide.offsetWidth;
                        slide.style.transition="opacity "+seconds+"s linear";
                        slide.style.opacity="1";
                    }
                    if(video.currentTime>=end)return;
                }
                blendTimer=setTimeout(checkImageBlend,40);
            }
            if(upcoming.kind==="image" && item.fade>0){
                slide.style.opacity="0";slide.style.display="block";
                slide.onload=function(){if(token===generation){imageReady=true;checkImageBlend();}};
                slide.onerror=function(){if(token===generation)imageReady=false;};
                slide.src=upcoming.uri;
            }
            video.loop=items.length===1 && item.duration<=0;
            // A single full-length clip uses the decoder's own repeat mode.
            video.onloadedmetadata=function(){ if(token!==generation)return;
                if(items.length===1 && (item.duration<=0 || item.duration>=video.duration-0.25))video.loop=true; };
            video.onplaying=function(){
                // playing may precede the first displayed hardware frame on webOS.
                if(video.currentTime>0 && video.readyState>=2)revealVideo();
                checkImageBlend();
            };
            video.onended=function(){ if(token===generation){if(blend)finishImageBlend();else next();} };
            video.ontimeupdate=function(){ if(token!==generation)return;
                // Some LG engines expose frame callbacks but never deliver them.
                if(video.currentTime>0 && video.readyState>=2)revealVideo();
                if(video.loop)return;
                checkImageBlend();
                if(token!==generation || blend)return;
                if(item.duration>0 && video.currentTime>=item.duration)next(); };
            video.onerror=function(){ if(token===generation)fail("USB-Video konnte nicht abgespielt werden ("+(video.error ? video.error.code : "?")+")."); };
            video.src=item.uri;
            if(video.requestVideoFrameCallback)frameRequest=video.requestVideoFrameCallback(revealVideo);
            var promise=video.play(); if(promise && promise.catch)promise.catch(function(){ if(token===generation)fail("Wiedergabe konnte nicht gestartet werden."); });
        }
    }
    function scan() {
        if(document.hidden || scanning)return;
        if(!window.PalmServiceBridge){ message("Dieser Player benötigt webOS mit dem USB-Homebrew-Dienst."); return; }
        scanning=true;
        var token=generation, request=++scanSerial;
        bridge=new PalmServiceBridge();
        scanTimer=setTimeout(function(){
            if(request!==scanSerial)return;
            scanSerial++; bridge.cancel(); scanning=false;
            if(!active)message("USB-Dienst antwortet nicht. Bitte Homebrew-Einrichtung prüfen.");
        },7000);
        bridge.onservicecallback=function(raw){
            if(request!==scanSerial)return;
            clearTimeout(scanTimer);
            scanning=false;
            if(document.hidden || token!==generation)return;
            try {
                var result=JSON.parse(raw);
                if(!result.returnValue){ if(!active)message(result.errorText || "USB-Dienst nicht verfügbar."); return; }
                if(!result.items.length){ stop(); transitions.clear(); items=[];revision="";message(result.errorText);return; }
                if(result.revision!==revision || !active || failed){
                    stop(); transitions.clear();items=result.items;revision=result.revision;play(0);
                }
            }catch(error){ if(!active)message("USB-Antwort konnte nicht gelesen werden."); }
        };
        bridge.call("luna://de.gammaproduction.freevideowall.usb/scan","{}");
    }
    var releaseBridge;
    function releaseDisplay(){
        if(!window.PalmServiceBridge)return;
        releaseBridge=new PalmServiceBridge();releaseBridge.onservicecallback=function(){};
        releaseBridge.call("luna://de.gammaproduction.freevideowall.usb/release","{}");
    }
    window.addEventListener("pagehide",releaseDisplay);
    document.addEventListener("visibilitychange",function(){
        if(document.hidden){ scanSerial++;clearTimeout(scanTimer);if(bridge)bridge.cancel();scanning=false;stop();transitions.clear();revision="";releaseDisplay(); }
        else scan();
    });
    document.addEventListener("keydown",function(event){if(event.keyCode===461){releaseDisplay();window.close();}});
    window.videowallState=function(){return {version:window.videowallVersion || "0.1.0",active:active,index:index,count:items.length,
        currentTime:video.currentTime,duration:video.duration,paused:video.paused,readyState:video.readyState,
        loop:video.loop,blend:blend,status:status.textContent,hidden:document.hidden};};
    setInterval(scan,5000); scan();
}());
