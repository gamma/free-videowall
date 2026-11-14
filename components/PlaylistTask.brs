sub init()
    m.top.functionName = "scan"
end sub

sub scan()
    fs = CreateObject("roFileSystem")
    volumes = []
    for each volume in fs.getVolumeList()
        if lcase(left(volume, 3)) = "ext" then volumes.push(volume)
    end for
    volumes.sort()
    for each volume in volumes
        root = volume
        if right(root, 1) <> "/" then root += "/"
        names = []
        for each name in fs.getDirectoryListing(root)
            ext = lcase(name.split(".").peek())
            if ext = "m3u" or ext = "m3u8" then names.push(name)
        end for
        names.sort()
        ' Prefer playlist.m3u, otherwise the alphabetically first usable playlist.
        ordered = []
        for each name in names
            if lcase(name) = "playlist.m3u" then ordered.push(name)
        end for
        for each name in names
            if lcase(name) <> "playlist.m3u" then ordered.push(name)
        end for
        for each name in ordered
            path = root + name
            items = ParsePlaylist(ReadAsciiFile(path), path, fs)
            if items.count() > 0
                print "Free Videowall: loaded "; path
                m.top.items = items
                return
            end if
        end for
    end for
    m.top.items = []
end sub
