import { send, on } from './ws.js'

let root = null
let input = null
let styleEl = null
let listEl = null
let requested = false

function ensureStyles() {
    if (styleEl) return

    styleEl = document.createElement('style')
    styleEl.textContent = `
        #lobby {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            font-family: system-ui;
        }
        .lobby-window {
            background: #1e1e1e;
            padding: 24px;
            border-radius: 12px;
            min-width: 340px;
            color: #fff;
        }
        .lobby-input {
            width: 100%;
            margin-bottom: 12px;
            padding: 8px;
        }
        .lobby-buttons {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
        }
        .lobby-btn {
            flex: 1;
            padding: 8px;
            cursor: pointer;
        }
        .lobby-rooms {
            margin-top: 12px;
            max-height: 240px;
            overflow-y: auto;
        }
        .lobby-room {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            background: #2a2a2a;
            margin-bottom: 6px;
            border-radius: 6px;
            cursor: pointer;
        }
        .lobby-room:hover {
            background: #3a3a3a;
        }
        .lobby-room-id {
            font-family: monospace;
        }
        .lobby-room-users {
            opacity: .7;
            font-size: 12px;
        }
    `
    document.head.appendChild(styleEl)
}

export function mountLobby() {
    if (root) return
    ensureStyles()

    root = document.createElement('div')
    root.id = 'lobby'
    root.innerHTML = `
        <div class="lobby-window">
            <h2>Лобби</h2>

            <input
                id="roomIdInput"
                class="lobby-input"
                placeholder="Room ID"
                autocomplete="off"
            />

            <div class="lobby-buttons">
                <button id="joinBtn" class="lobby-btn">Join</button>
                <button id="createBtn" class="lobby-btn">Create</button>
            </div>

            <div class="lobby-rooms" id="roomsList">
                <div style="opacity:.6">Loading…</div>
            </div>
        </div>
    `

    document.body.appendChild(root)

    input = root.querySelector('#roomIdInput')
    listEl = root.querySelector('#roomsList')

    root.querySelector('#joinBtn').onclick = () => {
        const id = input.value.trim()
        if (!id) return
        history.pushState({}, '', `/room/${id}`)
        window.dispatchEvent(new Event('routechange'))
    }

    root.querySelector('#createBtn').onclick = () => {
        send({ type: 'room-create' })
    }

    // ===== WS EVENTS =====
    on('message', msg => {
        if (msg.type === 'auth-ok' && !requested) {
            requested = true
            send({ type: 'room-list' })
        }

        if (msg.type === 'room-list-response') {
            renderRooms(msg.rooms)
        }
    })
}

function renderRooms(rooms) {
    listEl.innerHTML = ''

    if (!rooms || rooms.length === 0) {
        listEl.innerHTML = `<div style="opacity:.6">No rooms</div>`
        return
    }

    rooms.forEach(room => {
        const el = document.createElement('div')
        el.className = 'lobby-room'

        el.innerHTML = `
            <div class="lobby-room-id">${room.id}</div>
            <div class="lobby-room-users">${room.users} user(s)</div>
        `

        el.onclick = () => {
            history.pushState({}, '', `/room/${room.id}`)
            window.dispatchEvent(new Event('routechange'))
        }

        listEl.appendChild(el)
    })
}

export function unmountLobby() {
    if (!root) return
    root.remove()
    root = null
    input = null
    listEl = null
    requested = false
}

export function onRoomCreated(roomId) {
    history.pushState({}, '', `/room/${roomId}`)
    window.dispatchEvent(new Event('routechange'))
}
