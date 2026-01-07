import { render } from './render.js'
import { drawGrid } from './grid.js'
import { screenToWorld } from './camera.js'
import { TILE_SIZE, loadMap } from './map.js'
import { push } from './history.js'
import { createSetTileAction, applyAction } from './actions.js'
import {
    connect,
    send,
    on,
    getStatus,
    getPing
} from './ws.js'

/* ================= STATE ================= */

let ready = false
let dirty = false

let saving = false
let lastSaved = null

let myId = null
let myName = ''
let myColor = '#09f'

const cursors = new Map()
const users = new Map()

let statusEl, barEl, usersEl
let isRenaming = false

/* ================= DEBUG OVERLAY ================= */

let debugEnabled = localStorage.getItem('debug-overlay') === '1'
let debugEl = null

let fps = 0
let frames = 0
let lastFpsTime = performance.now()

function initDebugOverlay() {
    debugEl = document.createElement('div')
    debugEl.style.position = 'fixed'
    debugEl.style.top = '8px'
    debugEl.style.left = '8px'
    debugEl.style.padding = '6px 8px'
    debugEl.style.background = 'rgba(0,0,0,0.6)'
    debugEl.style.color = '#0f0'
    debugEl.style.font = '11px monospace'
    debugEl.style.pointerEvents = 'none'
    debugEl.style.zIndex = '9999'
    debugEl.style.whiteSpace = 'pre'
    debugEl.style.display = debugEnabled ? 'block' : 'none'
    document.body.appendChild(debugEl)
}

function updateDebugOverlay() {
    if (!debugEnabled || !debugEl) return

    let afk = 0
    let timeout = 0
    for (const u of users.values()) {
        if (u.timeout) timeout++
        else if (u.afk) afk++
    }

    debugEl.textContent =
        `FPS: ${fps}
WS: ${getStatus()}
RTT: ${getPing() ?? '-'}ms
Users: ${users.size}
AFK: ${afk}
Timeout: ${timeout}`
}

/* ================= STATUS ================= */

function updateStatus() {
    if (!statusEl) return

    const wsStatus = getStatus()
    const ping = getPing()
    const pingText = ping != null ? ` · ${ping}ms` : ''

    if (wsStatus === 'reconnecting') {
        statusEl.textContent = '⟳ Reconnecting…'
        statusEl.style.color = '#ffb300'
        return
    }

    if (wsStatus === 'offline') {
        statusEl.textContent = '✕ Offline'
        statusEl.style.color = '#ff5252'
        return
    }

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

    statusEl.textContent = `✓ Online${pingText}`
    statusEl.style.color = '#4caf50'
}

/* ================= WS ================= */

on('status', updateStatus)
on('ping', updateStatus)

on('message', msg => {

    if (msg.type === 'hello') {
        myId = msg.id
        myName = msg.name
        myColor = msg.color
    }

    if (msg.type === 'snapshot') {
        loadMap(msg.map)
        cursors.clear()
        ready = true
        dirty = false
        updateStatus()
    }

    if (msg.type === 'users') {
        users.clear()
        msg.users.forEach(u => users.set(u.id, u))
        if (!isRenaming) renderUsers()
        updateDebugOverlay()
    }

    if (msg.type === 'cursor') {
        cursors.set(msg.id, {
            x: msg.x,
            y: msg.y,
            name: msg.name,
            color: msg.color,
            time: msg.t
        })
    }

    if (msg.type === 'cursor-leave') {
        cursors.delete(msg.id)
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
})

/* ================= INIT ================= */

window.addEventListener('DOMContentLoaded', () => {
    connect()

    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    statusEl = document.getElementById('status')
    barEl = document.getElementById('autosave-bar')
    usersEl = document.getElementById('users')

    initDebugOverlay()

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.tabIndex = 0
    canvas.focus()

    canvas.addEventListener('contextmenu', e => e.preventDefault())

    /* ===== DEBUG TOGGLE ===== */

    window.addEventListener('keydown', e => {
        if (e.key === '`' || e.key === '~') {
            debugEnabled = !debugEnabled
            localStorage.setItem('debug-overlay', debugEnabled ? '1' : '0')
            debugEl.style.display = debugEnabled ? 'block' : 'none'
        }
    })

    /* ================= DRAW ================= */

    let isDrawing = false
    let eraseMode = false
    let brushActions = []
    const painted = new Set()

    function paint(e) {
        if (!ready || getStatus() !== 'online') return

        const rect = canvas.getBoundingClientRect()
        const pos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)

        const x = Math.floor(pos.x / TILE_SIZE)
        const y = Math.floor(pos.y / TILE_SIZE)
        const key = `${x},${y}`

        if (painted.has(key)) return
        painted.add(key)

        const tile = eraseMode ? 0 : 1
        const action = createSetTileAction(x, y, tile)
        if (!action) return

        applyAction(action)
        brushActions.push(action)

        dirty = true
        updateStatus()
    }

    canvas.addEventListener('mousedown', e => {
        if (!(e.buttons & (1 | 2))) return

        isDrawing = true
        eraseMode = !!(e.buttons & 2)
        brushActions = []
        painted.clear()
        paint(e)
    })

    canvas.addEventListener('mousemove', e => {
        if (isDrawing && (e.buttons & (1 | 2))) paint(e)

        if (myId && getStatus() === 'online') {
            const r = canvas.getBoundingClientRect()
            send({
                type: 'cursor',
                x: e.clientX - r.left,
                y: e.clientY - r.top
            })
        }
    })

    window.addEventListener('mouseup', () => {
        if (!isDrawing || !brushActions.length) {
            isDrawing = false
            eraseMode = false
            return
        }

        isDrawing = false
        eraseMode = false

        const brush = { type: 'brush', actions: brushActions }
        push(brush)
        send({ type: 'action', action: brush })
    })

    /* ================= RENDER LOOP ================= */

    function loop() {
        frames++
        const now = performance.now()
        if (now - lastFpsTime >= 1000) {
            fps = frames
            frames = 0
            lastFpsTime = now
            updateDebugOverlay()
        }

        render(ctx, canvas)
        drawGrid(ctx, canvas)

        const t = Date.now()

        for (const [id, c] of cursors) {
            if (id === myId) continue
            if (users.get(id)?.timeout) continue

            const age = t - c.time
            if (age > 3000) continue

            ctx.globalAlpha = users.get(id)?.afk ? 0.4 : 1
            ctx.fillStyle = c.color
            ctx.beginPath()
            ctx.arc(c.x, c.y, 4, 0, Math.PI * 2)
            ctx.fill()

            ctx.font = '11px monospace'
            ctx.fillText(c.name, c.x + 6, c.y - 6)
            ctx.globalAlpha = 1
        }

        requestAnimationFrame(loop)
    }

    loop()
})

/* ================= USERS ================= */

function renderUsers() {
    usersEl.innerHTML = ''

    for (const u of users.values()) {

        let indicator = '●'
        let indicatorColor = '#4caf50'

        if (u.timeout) {
            indicator = '✕'
            indicatorColor = '#666'
        } else if (u.afk) {
            indicator = '○'
            indicatorColor = '#999'
        }

        const pingText = u.ping != null ? ` · ${u.ping}ms` : ''

        const div = document.createElement('div')
        div.style.color = u.timeout ? '#666' : u.color

        const ind = document.createElement('span')
        ind.textContent = indicator
        ind.style.color = indicatorColor
        ind.style.marginRight = '6px'

        const text = document.createElement('span')
        text.textContent = u.editing
            ? `${u.name}▌${pingText}`
            : `${u.name}${pingText}`

        div.appendChild(ind)
        div.appendChild(text)

        usersEl.appendChild(div)
    }
}
