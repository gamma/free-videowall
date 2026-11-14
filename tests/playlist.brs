sub Main()
    fs = {exists: function(path as String) as Boolean
        return instr(1, path, "missing") = 0
    end function}
    text = chr(65279) + "#EXTM3U" + chr(13) + chr(10)
    text += "#EXTINF:-1,First" + chr(10) + "videos/a.mp4" + chr(10)
    text += "/b.mkv" + chr(10) + "videos" + chr(92) + "c.mov" + chr(10)
    text += "missing.mp4" + chr(10) + "https://example.com/a.mp4" + chr(10)
    text += "C:/a.mp4" + chr(10) + "other.txt" + chr(10) + "ext2:/wrong.mp4"
    items = ParsePlaylist(text, "ext1:/playlist.m3u", fs)
    if items.count() <> 3 then stop
    if items[0].url <> "ext1:/videos/a.mp4" then stop
    if items[1].url <> "ext1:/b.mkv" then stop
    if items[1].format <> "mkv" then stop
    if items[2].url <> "ext1:/videos/c.mov" then stop
    if ParsePlaylist("", "ext1:/playlist.m3u", fs).count() <> 0 then stop
    fades = ParsePlaylist("#EXT-X-FADE:2.0" + chr(10) + "a.mp4" + chr(10) + "b.mp4", "ext1:/playlist.m3u", fs)
    if fades[0].fade <> 2.0 then stop
    if fades[1].fade <> 1.5 then stop
    if fades[0].endImage <> "ext1:/a.mp4.end.jpg" then stop
    invalidFade = ParsePlaylist("#EXT-X-FADE:no" + chr(10) + "a.mp4", "ext1:/playlist.m3u", fs)
    if invalidFade[0].fade <> 1.5 then stop
    mixed = ParsePlaylist("#EXTINF:8,Slide" + chr(10) + "bilder/a.jpg" + chr(10) + "#EXTINF:-1,Clip" + chr(10) + "videos/b.mp4" + chr(10) + "c.png", "ext1:/autostart.m3u", fs)
    if mixed.count() <> 3 then stop
    if mixed[0].kind <> "image" or mixed[0].duration <> 8 then stop
    if mixed[0].endImage <> mixed[0].url then stop
    if mixed[1].kind <> "video" or mixed[1].duration <> -1 then stop
    if mixed[2].duration <> 10 then stop
    skipped = ParsePlaylist("#EXTINF:8,Missing" + chr(10) + "missing.jpg" + chr(10) + "b.mp4", "ext1:/playlist.m3u", fs)
    if skipped[0].duration <> -1 then stop
    print "PASS: missing entry resets metadata"
    print "PASS: mixed image/video playlist, EXTINF duration, duration reset, default image duration"
    print "PASS: fade duration, default, invalid duration, sidecar path"
    print "PASS: BOM, CRLF, comments, relative/root paths, Windows separators, missing files, external URLs, containers, empty playlist"
end sub
