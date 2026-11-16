"use strict";
const Service = require("webos-service");
const service = new Service("de.gammaproduction.freevideowall.usb");
const usb = require("./usb").adapter();
let ready = false, lease, activity;
usb.server.listen(0, "127.0.0.1", () => { ready = true; });
usb.server.on("error", error => { console.error(error.message); process.exit(1); });
service.register("scan", message => {
    if (!ready) { message.respond({returnValue:false,errorText:"USB-Dienst startet …"}); return; }
    // Keep the streaming server alive while the foreground app renews its lease.
    if (!activity) service.activityManager.create("USB playback", value => { activity = value; });
    clearTimeout(lease);
    lease = setTimeout(() => {
        if (activity) service.activityManager.complete(activity);
        activity = null;
    }, 35000);
    try { message.respond(usb.scan()); }
    catch (error) { message.respond({returnValue:false,errorText:"USB-Lesefehler: " + error.message}); }
});
