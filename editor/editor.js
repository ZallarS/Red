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
    getPing          // ★
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

/* ================= STATUS ================= */

function updateStatus() {
    if (!statusEl) return

    const wsStatus = getStatus()
    const ping = getPing() // ★
    const pingText = ping != null ? ` · ${ping}ms` : '' // ★

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

    statusEl.textContent = `✓ Online${pingText}` // ★
    statusEl.style.color = '#4caf50'
}

/* ================= WS ================= */

on('status', updateStatus)
on('ping', updateStatus) // ★

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

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.tabIndex = 0
    canvas.focus()

    canvas.addEventListener('contextmenu', e => e.preventDefault())

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

    /* ================= CTRL + S ================= */

    window.addEventListener('keydown', e => {
        if (!(e.ctrlKey || e.metaKey)) return
        if (e.key.toLowerCase() !== 's') return

        e.preventDefault()
        if (!ready || saving || getStatus() !== 'online') return

        saving = true
        updateStatus()
        send({ type: 'save' })
    })

    /* ================= RENDER LOOP ================= */

    function loop() {
        render(ctx, canvas)
        drawGrid(ctx, canvas)

        const now = Date.now()

        for (const [id, c] of cursors) {
            if (id === myId) continue

            const age = now - c.time
            if (age > 3000) continue

            ctx.globalAlpha = 1 - age / 3000
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
        const div = document.createElement('div')
        div.style.color = u.color
        div.textContent = u.editing ? `${u.name}▌` : u.name

        if (u.id === myId) {
            div.ondblclick = () => {
                isRenaming = true
                const original = u.name

                const input = document.createElement('input')
                input.value = u.name

                input.style.width = '100%'
                input.style.background = '#000'
                input.style.color = u.color
                input.style.border = `1px solid ${u.color}`
                input.style.outline = 'none'
                input.style.font = '13px monospace'
                input.style.caretColor = u.color

                send({ type: 'rename-start' })

                input.oninput = () => {
                    send({ type: 'rename-preview', name: input.value })
                }

                function finish(name) {
                    send({ type: 'rename', name })
                    isRenaming = false
                    renderUsers()
                }

                input.onkeydown = e => {
                    if (e.key === 'Enter') finish(input.value)
                    if (e.key === 'Escape') finish(original)
                }

                input.onblur = () => finish(input.value)

                div.replaceWith(input)
                input.focus()
                input.select()
            }
        }

        usersEl.appendChild(div)
    }
}
