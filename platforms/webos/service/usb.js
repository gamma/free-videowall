/* Rooted webOS adapter. Only registered playlist media are served on loopback. */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), http = require("http");
const parse = require("./playlist");
const mime = {mp4:"video/mp4",m4v:"video/mp4",mov:"video/quicktime",mkv:"video/x-matroska",
    ts:"video/mp2t",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png"};
function mounts(text) {
    return Array.from(new Set(text.split("\n").map(line => line.split(" ")).filter(p =>
        p.length > 2 && /^\/(tmp|media)\/usb\//.test(p[1]) && !/^(tmpfs|devtmpfs)$/.test(p[2]))
        .map(p => p[1].replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))))).sort();
}
function inside(root, relative) {
    if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw Error("Invalid USB path");
    const file = fs.realpathSync(path.join(root, relative));
    if (!file.startsWith(fs.realpathSync(root) + path.sep) || !fs.statSync(file).isFile()) throw Error("Outside USB root");
    return file;
}
function range(header, size) {
    if (!header) return {start:0,end:size-1,partial:false};
    const m = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!m || (!m[1] && !m[2]) || size === 0) return null;
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(size-1, Number(m[2])) : size-1;
    return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size
        ? {start,end,partial:true} : null;
}
function adapter(options) {
    options = options || {};
    let files = new Map(), fingerprint = "", items = [], serial = 0;
    const secret = crypto.randomBytes(24).toString("hex");
    const server = http.createServer((req, res) => {
        // The token URL is handed only to our app over Luna. No directory browsing or arbitrary paths.
        const entry = files.get(req.url);
        if (!entry || !["GET", "HEAD"].includes(req.method)) { res.writeHead(404); res.end(); return; }
        let file, stat;
        try { file = inside(entry.root, entry.relative); stat = fs.statSync(file); }
        catch (_) { res.writeHead(404); res.end(); return; }
        const part = range(req.headers.range, stat.size);
        if (!part) { res.writeHead(416, {"Content-Range":"bytes */" + stat.size}); res.end(); return; }
        const headers = {"Content-Type":mime[path.extname(file).slice(1).toLowerCase()] || "application/octet-stream",
            "Content-Length":Math.max(0, part.end-part.start+1),"Accept-Ranges":"bytes",
            "Access-Control-Allow-Origin":"*","Cache-Control":"no-store"};
        if (part.partial) headers["Content-Range"] = `bytes ${part.start}-${part.end}/${stat.size}`;
        res.writeHead(part.partial ? 206 : 200, headers);
        if (req.method === "HEAD" || !stat.size) { res.end(); return; }
        const stream = fs.createReadStream(file, {start:part.start,end:part.end});
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        stream.pipe(res);
    });
    function scan() {
        const roots = options.roots ? options.roots() : mounts(fs.readFileSync("/proc/mounts", "utf8"));
        let selected, text;
        for (const root of roots) {
            try {
                const names = fs.readdirSync(root).filter(n => !n.startsWith(".") && /\.m3u8?$/i.test(n));
                const rank = n => /^(autostart|playlist)\.m3u8?$/i.test(n) ? 0 : 1;
                names.sort((a,b) => rank(a)-rank(b) || a.localeCompare(b));
                if (!names.length) continue;
                const playlist = inside(root,names[0]);
                if (fs.statSync(playlist).size > 1048576) throw Error("Playlist exceeds 1 MiB");
                text = fs.readFileSync(playlist, "utf8");
                selected = {root,name:names[0]}; break;
            } catch (_) { /* Try the next real USB mount. */ }
        }
        if (!selected) { files.clear(); items=[]; fingerprint="";
            return {returnValue:true,items:[],revision:"",errorText:roots.length ? "Keine lesbare M3U im USB-Hauptverzeichnis." : "Bitte USB-Stick einstecken."}; }
        // Include media size/mtime so edits on an attached stick are picked up.
        const parsed = parse(text), metadata = [];
        const valid = parsed.filter(item => {
            try { const stat=fs.statSync(inside(selected.root,item.path)); metadata.push([item.path,stat.size,stat.mtimeMs]); return true; }
            catch (_) { return false; }
        });
        const next = JSON.stringify([selected,text,metadata]);
        if (next !== fingerprint) {
            files = new Map(); serial++;
            function uri(relative) {
                try { inside(selected.root,relative); } catch (_) { return null; }
                const key = "/" + secret + "/" + serial + "/" + files.size;
                files.set(key,{root:selected.root,relative});
                return "http://127.0.0.1:" + server.address().port + key;
            }
            items = valid.map(item => Object.assign({},item,{uri:uri(item.path),
                endImage:uri(item.path+".end.jpg"),firstImage:uri(item.path+".start.jpg")}));
            fingerprint = next;
        }
        return {returnValue:true,items,revision:String(serial),playlist:selected.name,
            errorText:items.length ? "" : "Keine lesbaren Medien in der USB-Playlist."};
    }
    return {server,scan};
}
module.exports = {mounts,inside,range,adapter};
