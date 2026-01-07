import { render } from './render.js'
import { drawGrid } from './grid.js'
import { screenToWorld } from './camera.js'
import { TILE_SIZE, loadMap } from './map.js'
import { push, undo, redo } from './history.js'
import { createSetTileAction, applyAction } from './actions.js'

// ================= WEBSOCKET =================
const ws = new WebSocket('wss://lib31.ru/ws')

let ready = false
let dirty = false
let saving = false
let lastSaved = null

let myId = null
const cursors = new Map()

// ================= UI =================
let statusEl, barEl

function updateStatus() {
    if (!statusEl) return

    if (saving) {
        statusEl.textContent = 'Saving…'
        statusEl.style.color = '#ffb300'
        return
    }

    if (dirty) {
        statusEl.textContent = '● Unsaved'
        statusEl.style.color = '#ff5252'
        return
    }

    if (lastSaved) {
        const t = new Date(lastSaved).toLocaleTimeString()
        statusEl.textContent = `✓ Saved ${t}`
        statusEl.style.color = '#4caf50'
    }
}

// ================= WS =================
ws.onmessage = e => {
    const msg = JSON.parse(e.data)

    if (msg.type === 'hello') {
        myId = msg.id
    }

    if (msg.type === 'snapshot') {
        loadMap(msg.map)
        ready = true
        dirty = false
        updateStatus()
        return
    }

    if (msg.type === 'action') {
        applyAction(msg.action)
        push(msg.action)
        dirty = true
        updateStatus()
    }

    if (msg.type === 'saving') {
        saving = true
        barEl.style.width = '100%'
        updateStatus()
    }

    if (msg.type === 'saved') {
        saving = false
        dirty = false
        lastSaved = msg.time
        barEl.style.width = '0%'
        updateStatus()
    }

    // ===== CURSORS =====
    if (msg.type === 'cursor') {
        cursors.set(msg.id, { x: msg.x, y: msg.y })
    }

    if (msg.type === 'cursor-leave') {
        cursors.delete(msg.id)
    }
}

// ================= EDITOR =================
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    statusEl = document.getElementById('status')
    barEl = document.getElementById('autosave-bar')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let isDrawing = false
    let brushActions = []
    const painted = new Set()

    function paint(e) {
        if (!ready) return

        const rect = canvas.getBoundingClientRect()
        const pos = screenToWorld(
            e.clientX - rect.left,
            e.clientY - rect.top
        )

        const x = Math.floor(pos.x / TILE_SIZE)
        const y = Math.floor(pos.y / TILE_SIZE)

        const key = `${x},${y}`
        if (painted.has(key)) return
        painted.add(key)

        const action = createSetTileAction(x, y, 1)
        if (!action) return

        applyAction(action)
        brushActions.push(action)
        dirty = true
        updateStatus()
    }

    canvas.addEventListener('mousedown', e => {
        isDrawing = true
        brushActions = []
        painted.clear()
        paint(e)
    })

    canvas.addEventListener('mousemove', e => {
        if (isDrawing) paint(e)

        // ==== SEND CURSOR ====
        if (myId) {
            const rect = canvas.getBoundingClientRect()
            ws.send(JSON.stringify({
                type: 'cursor',
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            }))
        }
    })

    window.addEventListener('mouseup', () => {
        if (!isDrawing) return
        isDrawing = false
        if (!brushActions.length) return

        const brush = { type: 'brush', actions: brushActions }
        push(brush)
        ws.send(JSON.stringify({ type: 'action', action: brush }))
    })

    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault()
            ws.send(JSON.stringify({ type: 'save' }))
        }
    })

    function loop() {
        render(ctx, canvas)
        drawGrid(ctx, canvas)

        // ==== DRAW OTHER CURSORS ====
        for (const [id, c] of cursors) {
            if (id === myId) continue

            ctx.fillStyle = 'rgba(0,150,255,0.9)'
            ctx.beginPath()
            ctx.arc(c.x, c.y, 4, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = '#09f'
            ctx.font = '10px monospace'
            ctx.fillText(id, c.x + 6, c.y - 6)
        }

        requestAnimationFrame(loop)
    }

    loop()
})
