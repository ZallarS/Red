import fs from 'fs'
import path from 'path'
import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'
import crypto from 'crypto'

const __dirname = new URL('.', import.meta.url).pathname

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const PORT = 3000
const MAP_PATH = path.join(__dirname, 'assets/maps/level1.json')

// ================= MAP STATE =================
const map = new Map()
let autosaveTimer = null

// ================= USERS =================
const clients = new Map() // ws -> user

function colorFromId(id) {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    return `hsl(${Math.abs(hash) % 360}, 80%, 60%)`
}

// ================= LOAD MAP =================
if (fs.existsSync(MAP_PATH)) {
    const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
    for (const [k, v] of Object.entries(data)) map.set(k, v)
}

// ================= BROADCAST =================
function broadcast(msg, except = null) {
    const data = JSON.stringify(msg)
    for (const c of wss.clients) {
        if (c !== except && c.readyState === 1) c.send(data)
    }
}

function broadcastUsers() {
    broadcast({
        type: 'users',
        users: [...clients.values()].map(u => ({
            id: u.id,
            name: u.name,
            color: u.color
        }))
    })
}

// ================= SAVE =================
function saveMap(reason = 'manual') {
    fs.writeFileSync(
        MAP_PATH,
        JSON.stringify(Object.fromEntries(map), null, 2)
    )
    broadcast({ type: 'saved', reason, time: Date.now() })
}

// ================= AUTOSAVE =================
function scheduleAutosave() {
    clearTimeout(autosaveTimer)
    broadcast({ type: 'saving', mode: 'autosave' })

    autosaveTimer = setTimeout(() => {
        saveMap('autosave')
        autosaveTimer = null
    }, 3000)
}

// ================= APPLY ACTION =================
function applyServerAction(action) {
    if (!action) return

    if (action.type === 'brush') {
        action.actions.forEach(applyServerAction)
        return
    }

    if (action.type === 'setTile') {
        const key = `${action.x},${action.y}`
        action.after === 0 ? map.delete(key) : map.set(key, action.after)
    }
}

// ================= WEBSOCKET =================
wss.on('connection', ws => {
    const id = crypto.randomUUID().slice(0, 6)
    const user = {
        id,
        name: `User-${id}`,
        color: colorFromId(id)
    }

    clients.set(ws, user)

    ws.send(JSON.stringify({ type: 'hello', ...user }))
    ws.send(JSON.stringify({ type: 'snapshot', map: Object.fromEntries(map) }))

    broadcastUsers()

    ws.on('message', data => {
        const msg = JSON.parse(data)

        // ===== RENAME =====
        if (msg.type === 'rename') {
            user.name = String(msg.name || '').slice(0, 24)
            broadcastUsers()
            return
        }

        if (msg.type === 'cursor') {
            broadcast({
                type: 'cursor',
                id: user.id,
                name: user.name,
                color: user.color,
                x: msg.x,
                y: msg.y,
                t: Date.now()
            }, ws)
        }

        if (msg.type === 'action') {
            applyServerAction(msg.action)
            scheduleAutosave()
            broadcast({ type: 'action', action: msg.action }, ws)
        }

        if (msg.type === 'save') {
            broadcast({ type: 'saving', mode: 'manual' })
            saveMap('manual')
        }
    })

    ws.on('close', () => {
        clients.delete(ws)
        broadcast({ type: 'cursor-leave', id: user.id })
        broadcastUsers()
    })
})

server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Node engine on http://127.0.0.1:${PORT}`)
})
