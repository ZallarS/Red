// editor/editor.js

import { render } from './render.js'
import { drawGrid } from './grid.js'
import { camera } from './camera.js'
import { loadMap } from './map.js'

import { initUI } from './ui/ui.js'
import { subscribe, getState } from './ui/store.js'

import { connect, on } from './ws.js'
import { WS } from './protocol.js'

import { createDebugOverlay } from './debug.js'
import { initDrawing } from './drawing.js'
import { applyAction } from './actions.js'

// 🔽 НОВОЕ: API панели пользователей
import { setUsers } from './ui/modules/usersPanel.js'

const users = new Map()
const cursors = new Map()        // курсоры пользователей
const softLocks = new Map()      // soft-lock зоны рисования

const SOFT_LOCK_RADIUS = 48
const SOFT_LOCK_TTL = 500

let barEl
let serverStats = null

let uiState = getState()
subscribe(s => (uiState = s))

const CAMERA_KEY = 'editor-camera'

function restoreCamera() {
    try {
        const c = JSON.parse(localStorage.getItem(CAMERA_KEY))
        if (!c) return
        Object.assign(camera, c)
    } catch {}
}

function saveCamera() {
    localStorage.setItem(CAMERA_KEY, JSON.stringify(camera))
}

window.addEventListener('DOMContentLoaded', () => {
    connect()

    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    barEl = document.getElementById('autosave-bar')

    // ✅ UI теперь полностью модульный
    initUI()
    restoreCamera()

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.tabIndex = 0
    canvas.focus()

    const debug = createDebugOverlay()
    debug.init()

    const drawing = initDrawing(canvas, () => uiState)

    on('message', msg => {
        switch (msg.type) {
            case WS.SNAPSHOT:
                loadMap(msg.map)
                drawing.setReady(true)
                break

            case WS.HELLO:
                drawing.setMyId(msg.id)
                break

            case WS.USERS:
                users.clear()
                msg.users.forEach(u => users.set(u.id, u))

                // ✅ передаём пользователей в модуль панели
                setUsers(new Map(users))
                break

            case WS.ACTION:
                applyAction(msg.action)
                break

            // ===== CURSORS + SOFT LOCK =====
            case WS.CURSOR:
                cursors.set(msg.id, {
                    x: msg.x,
                    y: msg.y,
                    color: msg.color,
                    name: msg.name,
                    t: msg.t || Date.now()
                })

                if (msg.painting) {
                    softLocks.set(msg.id, {
                        x: msg.x,
                        y: msg.y,
                        radius: SOFT_LOCK_RADIUS,
                        color: msg.color,
                        name: msg.name,
                        t: performance.now()
                    })
                }
                break

            case WS.CURSOR_LEAVE:
                cursors.delete(msg.id)
                softLocks.delete(msg.id)
                break

            case WS.SERVER_STATS:
                serverStats = msg.stats
                break

            case WS.SAVING:
                barEl.style.width = '100%'
                break

            case WS.SAVED:
                barEl.style.width = '0%'
                break
        }
    })

    // ===== CLEANUP OLD SOFT LOCKS =====
    setInterval(() => {
        const now = performance.now()
        for (const [id, lock] of softLocks) {
            if (now - lock.t > SOFT_LOCK_TTL) {
                softLocks.delete(id)
            }
        }
    }, 250)

    function loop() {
        render(ctx, canvas, cursors, softLocks)
        if (uiState.grid) drawGrid(ctx, canvas)

        debug.update(serverStats, uiState, users.size)
        saveCamera()

        requestAnimationFrame(loop)
    }

    loop()
})
