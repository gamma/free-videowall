sub Main()
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.SetMessagePort(port)
    scene = screen.CreateScene("PlayerScene")
    scene.observeField("exitRequested", port)
    screen.Show()
    while true
        event = wait(0, port)
        if type(event) = "roSGNodeEvent"
            if event.getField() = "exitRequested" and event.getData() = true
                screen.Close()
                return
            end if
        end if
        if type(event) = "roSGScreenEvent"
            if event.IsScreenClosed() then return
        end if
    end while
end sub
