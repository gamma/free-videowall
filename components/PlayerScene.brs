sub init()
    m.top.backgroundColor = "0x000000FF"
    m.top.backgroundURI = ""
    m.video = m.top.findNode("video")
    m.slide = m.top.findNode("slide")
    m.slide.observeField("loadStatus", "onSlideLoaded")
    m.slideTimer = m.top.findNode("slideTimer")
    m.slideTimer.observeField("fire", "onSlideFinished")
    m.cutPending = false
    m.endFrame = m.top.findNode("endFrame")
    m.incoming = m.top.findNode("incomingFrame")
    m.incoming.observeField("loadStatus", "tryReveal")
    m.revealReady = false
    m.cover = m.top.findNode("cover")
    m.dissolve = m.top.findNode("dissolve")
    m.dissolve.observeField("state", "onDissolveState")
    m.video.notificationInterval = 0.05
    m.video.observeField("position", "onPosition")
    m.holding = false
    m.awaitingReveal = false
    m.started = false
    m.outgoingFade = 1.5
    m.loader = m.top.findNode("loader")
    m.retry = m.top.findNode("retry")
    m.video.observeField("state", "onState")
    m.loader.observeField("items", "onItems")
    m.retry.observeField("fire", "loadPlaylist")
    m.items = []
    m.index = 0
    m.failures = 0
    m.top.setFocus(true)
    loadPlaylist()
end sub

sub loadPlaylist()
    m.loader.control = "RUN"
end sub

sub onItems()
    m.items = m.loader.items
    m.index = 0
    m.failures = 0
    if m.items.count() = 0
        print "Free Videowall: no playable USB playlist; retrying in 5s"
        m.retry.control = "start"
    else
        playCurrent()
    end if
end sub

sub playCurrent()
    item = m.items[m.index]
    print "Free Videowall: playing "; item.url
    m.awaitingReveal = m.holding
    m.revealReady = false
    m.incoming.opacity = 0
    m.incoming.uri = item.firstImage
    m.slideTimer.control = "stop"
    m.slide.visible = false
    m.started = false
    m.endFrame.uri = item.endImage
    m.endFrame.opacity = 0
    if item.endImage = "" then print "Free Videowall: WARNING missing end-frame image: "; item.url
    if item.kind = "image"
        m.top.setFocus(true)
        m.slide.visible = true
        if m.slide.uri = item.url and m.slide.loadStatus = "ready"
            onSlideLoaded()
        else
            m.slide.uri = item.url
        end if
        return
    end if
    content = CreateObject("roSGNode", "ContentNode")
    content.url = item.url
    content.streamFormat = item.format
    m.video.setFocus(true)
    m.video.content = content
    m.video.control = "play"
end sub

sub onState()
    state = m.video.state
    if state = "stopped" and m.cutPending
        m.cutPending = false
        advanceItem()
        return
    end if
    if state = "playing"
        m.failures = 0
        m.started = true
    end if
    if state = "finished" or state = "error"
        holdEndFrame()
        if state = "error"
            print "Free Videowall: playback error "; m.video.errorCode; " "; m.video.errorMsg
            m.failures++
        end if
        advanceItem()
    end if
end sub

sub advanceItem()
        m.index = (m.index + 1) mod m.items.count()
        if m.index = 0 or m.failures >= m.items.count()
            ' Reload at every loop; an absent stick or broken playlist retries quietly.
            if m.failures >= m.items.count()
                m.retry.control = "start"
            else
                loadPlaylist()
            end if
        else
            playCurrent()
        end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false
    if key = "back"
        m.top.exitRequested = true
        return true
    end if
    ' Let Roku own Options and other system keys. No custom playback chrome.
    if key = "options" then return false
    if m.items.count() = 0 then return false
    if m.items[m.index].kind <> "video" then return false
    if key = "play"
        if m.video.state = "playing"
            m.video.control = "pause"
        else if m.video.state = "paused"
            m.video.control = "resume"
        end if
        return true
    end if
    if key = "fastforward" or key = "rewind" or key = "replay"
        if m.video.state <> "playing" and m.video.state <> "paused" then return true
        target = m.video.position - 10
        if key = "fastforward" then target = m.video.position + 10
        if target < 0 then target = 0
        if m.video.duration > 0 and target >= m.video.duration then target = m.video.duration - 0.1
        m.video.seek = target
        return true
    end if
    return false
end function

sub onPosition()
    if not m.started or m.video.state <> "playing" then return
    ' Wait for rendered samples, rather than exposing the decoder on a state event.
    info = m.video.positionInfo
    if m.awaitingReveal and m.holding and m.dissolve.state <> "running" and info <> invalid
        if info.video <> invalid and info.video > 0 and m.video.position > 0
            m.revealReady = true
            tryReveal()
        end if
    end if
    ' Cover the decoder before end-of-stream can clear its surface. The image
    ' is pre-extracted from this clip's tail; loading takes place during playback.
    limit = m.video.duration
    if m.items[m.index].duration > 0 and (limit <= 0 or m.items[m.index].duration < limit) then limit = m.items[m.index].duration
    if not m.holding and m.dissolve.state <> "running" and limit > 0
        if m.video.position >= limit - 0.25 then holdEndFrame()
    end if
    if m.items[m.index].duration > 0 and m.video.position >= m.items[m.index].duration and not m.cutPending
        holdEndFrame()
        m.cutPending = true
        m.started = false
        m.video.control = "stop"
    end if
end sub

sub holdEndFrame()
    if m.holding or m.dissolve.state = "running" then return
    if m.endFrame.loadStatus <> "ready" then return
    print "Free Videowall: holding end frame"
    m.cover.uri = m.endFrame.uri
    ' Both posters refer to the cached image; endFrame covers any async load.
    m.endFrame.opacity = 1
    m.cover.opacity = 1
    m.outgoingFade = m.items[m.index].fade
    m.holding = true
end sub

sub onDissolveState()
    if m.dissolve.state = "stopped"
        print "Free Videowall: dissolve complete"
        m.cover.opacity = 0
        m.incoming.opacity = 0
        m.holding = false
    end if
end sub

sub tryReveal()
    if not m.awaitingReveal or not m.revealReady then return
    if m.incoming.uri <> "" and m.incoming.loadStatus <> "ready" then return
    revealCurrent()
end sub

sub revealCurrent()
    m.awaitingReveal = false
    if m.incoming.loadStatus = "ready"
        m.incoming.opacity = 1
        print "Free Videowall: crossfade over opaque start frame"
    else
        print "Free Videowall: WARNING missing start frame; fading over video plane"
    end if
            print "Free Videowall: dissolve start "; m.outgoingFade; "s"
            m.dissolve.duration = m.outgoingFade
            if m.outgoingFade > 0
                m.dissolve.control = "start"
            else
                m.cover.opacity = 0
                m.incoming.opacity = 0
                m.holding = false
            end if
end sub

sub onSlideLoaded()
    if m.items.count() = 0 then return
    if m.items[m.index].kind <> "image" then return
    if m.slide.loadStatus = "failed"
        print "Free Videowall: image failed "; m.slide.uri
        m.failures++
        advanceItem()
    else if m.slide.loadStatus = "ready"
        m.failures = 0
        m.revealReady = true
        if m.holding then tryReveal()
        m.slideTimer.duration = m.items[m.index].duration
        m.slideTimer.control = "start"
        print "Free Videowall: image ready for "; m.slideTimer.duration; "s"
    end if
end sub

sub onSlideFinished()
    holdEndFrame()
    advanceItem()
end sub
