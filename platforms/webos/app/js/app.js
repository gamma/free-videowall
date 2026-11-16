/* Menu-free offline USB loop, one hardware video decoder. */
(function () {
    "use strict";
    var video=document.getElementById("video"), slide=document.getElementById("slide"), status=document.getElementById("status");
    var transitions=new VideowallTransitions(document.getElementById("outgoing"),document.getElementById("incoming"));
    var items=[], revision="", index=0, generation=0, timer, bridge, scanning=false, active=false, failed=false;
    var switching=false, scanTimer, scanSerial=0;
    function message(text) { status.textContent=text; status.style.display=text ? "block" : "none"; }
    function stop() {
        generation++; clearTimeout(timer); video.pause(); video.removeAttribute("src"); video.load();
        slide.style.display="none"; active=false;
    }
    function fail(text) { failed=true; message(text); clearTimeout(timer); timer=setTimeout(function(){ revision=""; scan(); },5000); }
    function next() {
        if (!active || !items.length || switching) return;
        switching=true;
        var token=generation;
        transitions.hold();
        // Let the outgoing still paint before closing the decoder.
        requestAnimationFrame(function(){ requestAnimationFrame(function(){
            if(token===generation && !document.hidden)play((index+1)%items.length);
        }); });
    }
    function play(position) {
        stop(); active=true; failed=false; switching=false; index=position;
        var item=items[index], token=generation;
        transitions.prepare(item);
        if (item.kind === "image") {
            slide.onload=function(){ if(token!==generation)return; message(""); transitions.reveal(item,function(){});
                timer=setTimeout(next,Math.max(0.1,item.duration)*1000); };
            slide.onerror=function(){ if(token===generation)fail("USB-Bild konnte nicht geladen werden."); };
            slide.src=item.uri; slide.style.display="block";
        } else {
            video.loop=items.length===1 && item.duration<=0;
            // A single full-length clip uses the decoder's own repeat mode.
            video.onloadedmetadata=function(){ if(token!==generation)return;
                if(items.length===1 && (item.duration<=0 || item.duration>=video.duration-0.25))video.loop=true; };
            video.onplaying=function(){ if(token!==generation)return; message(""); transitions.reveal(item,function(){}); };
            video.onended=function(){ if(token===generation)next(); };
            video.ontimeupdate=function(){ if(token!==generation || video.loop)return;
                if(item.duration>0 && video.currentTime>=item.duration)next(); };
            video.onerror=function(){ if(token===generation)fail("USB-Video konnte nicht abgespielt werden ("+(video.error ? video.error.code : "?")+")."); };
            video.src=item.uri;
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
    document.addEventListener("visibilitychange",function(){
        if(document.hidden){ scanSerial++;clearTimeout(scanTimer);if(bridge)bridge.cancel();scanning=false;stop();transitions.clear();revision=""; }
        else scan();
    });
    document.addEventListener("keydown",function(event){if(event.keyCode===461)window.close();});
    window.videowallState=function(){return {version:"0.1.0",active:active,index:index,count:items.length,
        currentTime:video.currentTime,duration:video.duration,paused:video.paused,readyState:video.readyState,
        loop:video.loop,status:status.textContent,hidden:document.hidden};};
    setInterval(scan,5000); scan();
}());
