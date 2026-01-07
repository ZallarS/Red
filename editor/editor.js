import { render } from './render.js'
import { drawGrid } from './grid.js'
import { screenToWorld } from './camera.js'
import { TILE_SIZE, loadMap } from './map.js'
import { push, undo, redo } from './history.js'
import { createSetTileAction, applyAction } from './actions.js'

// ================= WEBSOCKET =================
const ws = new WebSocket('wss://lib31.ru/ws')
let ready = false

ws.onmessage = e => {
    const msg = JSON.parse(e.data)

    // ===== SNAPSHOT =====
    if (msg.type === 'snapshot') {
        loadMap(msg.map)
        ready = true
        log('map loaded')
        return
    }

    // ===== ACTION =====
    if (msg.type === 'action') {
        applyAction(msg.action)
        push(msg.action)
    }

    // ===== USER EVENTS =====
    if (msg.type === 'user') {
        if (msg.event === 'join') log('user connected')
        if (msg.event === 'leave') log('user disconnected')
    }
}

// ================= UI LOG =================
function log(text) {
    console.log('[Editor]', text)
}

// ================= EDITOR =================
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let isDrawing = false
    let brushActions = []
    const painted = new Set()

    function paint(e) {
        if (!ready) return

        const rect = canvas.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top

        const pos = screenToWorld(sx, sy)
        const x = Math.floor(pos.x / TILE_SIZE)
        const y = Math.floor(pos.y / TILE_SIZE)

        const key = `${x},${y}`
        if (painted.has(key)) return
        painted.add(key)

        const action = createSetTileAction(x, y, 1)
        if (!action) return

        applyAction(action)
        brushActions.push(action)
    }

    // ===== MOUSE =====
    canvas.addEventListener('mousedown', e => {
        isDrawing = true
        brushActions = []
        painted.clear()
        paint(e)
    })

    canvas.addEventListener('mousemove', e => {
        if (isDrawing) paint(e)
    })

    window.addEventListener('mouseup', () => {
        if (!isDrawing) return
        isDrawing = false
        if (!brushActions.length) return

        const brush = {
            type: 'brush',
            actions: brushActions
        }

        push(brush)
        ws.send(JSON.stringify({ type: 'action', action: brush }))
    })

    // ===== KEYBOARD =====
    window.addEventListener('keydown', e => {
        // UNDO
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault()
            const a = undo()
            if (!a) return
            ws.send(JSON.stringify({
                type: 'action',
                action: { ...a, after: a.before }
            }))
        }

        // REDO
        if (e.ctrlKey && (e.key === 'y' || e.key === 'Z')) {
            e.preventDefault()
            const a = redo()
            if (!a) return
            ws.send(JSON.stringify({ type: 'action', action: a }))
        }

        // SAVE (MANUAL)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault()
            ws.send(JSON.stringify({ type: 'save' }))
            log('manual save')
        }
    })

    // ===== RENDER LOOP =====
    function loop() {
        render(ctx, canvas)
        drawGrid(ctx, canvas)
        requestAnimationFrame(loop)
    }

    loop()
})
