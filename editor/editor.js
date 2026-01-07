import { render } from './render.js'
import { drawGrid } from './grid.js'
import { screenToWorld } from './camera.js'
import { TILE_SIZE, loadMap } from './map.js'
import { push } from './history.js'
import { createSetTileAction, applyAction } from './actions.js'

const ws = new WebSocket('wss://lib31.ru/ws')

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

// 🔴 ВАЖНО: локальный флаг rename
let isRenaming = false

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
        statusEl.textContent =
            `✓ Saved ${new Date(lastSaved).toLocaleTimeString()}`
        statusEl.style.color = '#4caf50'
    }
}

// ================= WS =================
ws.onmessage = e => {
    const msg = JSON.parse(e.data)

    if (msg.type === 'hello') {
        myId = msg.id
        myName = msg.name
        myColor = msg.color
    }

    if (msg.type === 'snapshot') {
        loadMap(msg.map)
        ready = true
        dirty = false
        updateStatus()
    }

    if (msg.type === 'users') {
        users.clear()
        msg.users.forEach(u => users.set(u.id, u))

        // ❗ не перерисовываем список, если редактируем имя
        if (!isRenaming) {
            renderUsers()
        }
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
}

// ================= INIT =================
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    statusEl = document.getElementById('status')
    barEl = document.getElementById('autosave-bar')
    usersEl = document.getElementById('users')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let isDrawing = false
    let brushActions = []
    const painted = new Set()

    function paint(e) {
        if (!ready) return

        const rect = canvas.getBoundingClientRect()
        const pos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)

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
        // 🔒 защита: рисуем ТОЛЬКО если ЛКМ реально зажата
        if (isDrawing && (e.buttons & 1)) {
            paint(e)
        }

        if (myId) {
            const r = canvas.getBoundingClientRect()
            ws.send(JSON.stringify({
                type: 'cursor',
                x: e.clientX - r.left,
                y: e.clientY - r.top
            }))
        }
    })

    window.addEventListener('mouseup', () => {
        if (!isDrawing || !brushActions.length) return
        isDrawing = false

        const brush = { type: 'brush', actions: brushActions }
        push(brush)
        ws.send(JSON.stringify({ type: 'action', action: brush }))
    })

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

// ================= USERS UI =================
function renderUsers() {
    usersEl.innerHTML = ''

    for (const u of users.values()) {
        const div = document.createElement('div')
        div.style.color = u.color

        div.textContent = u.editing
            ? `${u.name}▌`
            : u.name

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
                input.style.padding = '2px 4px'
                input.style.caretColor = u.color

                ws.send(JSON.stringify({ type: 'rename-start' }))

                input.oninput = () => {
                    ws.send(JSON.stringify({
                        type: 'rename-preview',
                        name: input.value
                    }))
                }

                function finish(name) {
                    ws.send(JSON.stringify({ type: 'rename', name }))
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
