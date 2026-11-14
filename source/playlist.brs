function ParsePlaylist(text as String, playlistPath as String, fs as Object) as Object
    result = []
    slash = 0
    for i = 1 to len(playlistPath)
        if mid(playlistPath, i, 1) = "/" then slash = i
    end for
    base = left(playlistPath, slash)
    volume = playlistPath.split(":")[0] + ":"
    text = text.replace(chr(65279), "").replace(chr(13), "")
    fade = 1.5
    duration = -1
    for each line in text.split(chr(10))
        entry = line.trim()
        if left(entry, 8) = "#EXTINF:"
            rawDuration = mid(entry, 9).split(",")[0].trim()
            if CreateObject("roRegex", "^-?[0-9]+([.][0-9]+)?$", "").isMatch(rawDuration) then duration = val(rawDuration)
        end if
        if left(entry, 12) = "#EXT-X-FADE:"
            value = mid(entry, 13).trim()
            if CreateObject("roRegex", "^[0-9]+([.][0-9]+)?$", "").isMatch(value)
                fade = val(value)
                if fade > 10 then fade = 10
            end if
        end if
        if entry <> "" and left(entry, 1) <> "#"
            entry = entry.replace(chr(92), "/")
            if left(entry, 1) = "/"
                url = volume + entry
            else if instr(1, entry, ":") = 0
                url = base + entry
            else
                url = entry
            end if
            ' This player deliberately accepts only local USB media.
            if lcase(left(url, len(volume) + 1)) = lcase(volume + "/") and fs.exists(url)
                extension = lcase(url.split(".").peek())
                format = ""
                if extension = "mp4" or extension = "m4v" or extension = "mov" then format = "mp4"
                if extension = "mkv" then format = "mkv"
                if extension = "ts" then format = "ts"
                kind = "video"
                if extension = "jpg" or extension = "jpeg" or extension = "png"
                    format = "image"
                    kind = "image"
                    if duration <= 0 then duration = 10
                end if
                if format <> ""
                    image = url + ".end.jpg"
                    if not fs.exists(image)
                        image = "pkg:/images/endframes/" + url.split("/").peek() + ".end.jpg"
                        if not fs.exists(image) then image = ""
                    end if
                    firstImage = url + ".start.jpg"
                    if not fs.exists(firstImage)
                        firstImage = "pkg:/images/endframes/" + url.split("/").peek() + ".start.jpg"
                        if not fs.exists(firstImage) then firstImage = ""
                    end if
                    if kind = "image"
                        image = url
                        firstImage = url
                    end if
                    result.push({url: url, format: format, fade: fade, endImage: image, kind: kind, duration: duration, firstImage: firstImage})
                end if
            end if
            fade = 1.5
            duration = -1
        end if
    end for
    return result
end function
