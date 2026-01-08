// editor/editorCore.js

import { render } from './render.js'
import { drawGrid } from './grid.js'
import { camera } from './camera.js'
import { loadMap } from './map.js'

import { initUI } from './ui/ui.js'
import { subscribe, getState } from './ui/store.js'

import { on } from './ws.js'
import { WS } from './protocol.js'

import { createDebugOverlay } from './debug.js'
import { initDrawing } from './drawing.js'
import { applyAction } from './actions.js'
import { initInput } from './input.js' // ✅ ДОБАВЛЕНО

import { setUsers } from './ui/modules/usersPanel.js'

const CAMERA_KEY_PREFIX = 'editor-camera-room-'

export function initEditor(snapshot) {
    const { roomId, role, map } = snapshot

    const users = new Map()
    const cursors = new Map()
    const softLocks = new Map()

    const SOFT_LOCK_RADIUS = 48
    const SOFT_LOCK_TTL = 500

    let uiState = getState()
    subscribe(s => (uiState = s))

    const CAMERA_KEY = CAMERA_KEY_PREFIX + roomId

    function restoreCamera() {
        try {
            const c = JSON.parse(localStorage.getItem(CAMERA_KEY))
            if (c) Object.assign(camera, c)
        } catch {}
    }

    function saveCamera() {
        localStorage.setItem(CAMERA_KEY, JSON.stringify(camera))
    }

    // ===== CANVAS =====
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.tabIndex = 0
    canvas.focus()

    restoreCamera()

    // ✅ ПОДКЛЮЧЕНИЕ INPUT
    initInput(canvas)

    // ===== UI =====
    initUI({ role })

    // ===== DEBUG =====
    const debug = createDebugOverlay()
    debug.init()

    // ===== DRAWING =====
    const drawing = initDrawing(canvas, () => uiState)
    drawing.setReady(true)

    // ===== MAP =====
    loadMap(map)

    // ===== WS EVENTS =====
    on('message', msg => {
        switch (msg.type) {
            case 'room-users':
                users.clear()
                msg.users.forEach(u => users.set(u.id, u))
                setUsers(new Map(users))
                break

            case WS.ACTION:
            case 'action':
                applyAction(msg.action)
                break

            case WS.CURSOR:
            case 'cursor':
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
        }
    })

    // ===== CLEANUP SOFT LOCKS =====
    setInterval(() => {
        const now = performance.now()
        for (const [id, lock] of softLocks) {
            if (now - lock.t > SOFT_LOCK_TTL) {
                softLocks.delete(id)
            }
        }
    }, 250)

    // ===== RENDER LOOP =====
    function loop() {
        render(ctx, canvas, cursors, softLocks)
        if (uiState.grid) drawGrid(ctx, canvas)

        debug.update(null, uiState, users.size)
        saveCamera()

        requestAnimationFrame(loop)
    }

    loop()
}
