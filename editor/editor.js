// editor/editor.js

import { getRoute } from './router.js'
import { mountLobby, unmountLobby, onRoomCreated } from './lobby.js'
import { connect, on, send } from './ws.js'
import { initEditor } from './editorCore.js'

let editorStarted = false

function startEditor(snapshot) {
    if (editorStarted) return
    editorStarted = true
    unmountLobby()
    initEditor(snapshot)
}

function handleRoute() {
    const route = getRoute()

    if (route.type === 'lobby') {
        mountLobby()
        return
    }

    if (route.type === 'room') {
        send({ type: 'room-join', roomId: route.roomId })
    }
}

window.addEventListener('routechange', handleRoute)
window.addEventListener('popstate', handleRoute)

window.addEventListener('DOMContentLoaded', () => {
    connect()

    on('message', msg => {
        if (msg.type === 'room-created') {
            onRoomCreated(msg.roomId)
        }

        if (msg.type === 'room-snapshot') {
            startEditor(msg)
        }

        if (msg.type === 'error') {
            alert(msg.message)
            history.pushState({}, '', '/')
            handleRoute()
        }
    })

    handleRoute()
})
