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
        requestAnimationFrame(loop)
    }

    loop()
})
