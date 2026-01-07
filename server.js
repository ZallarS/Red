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

// ================= MAP =================
const map = new Map()
let autosaveTimer = null

// ================= USERS =================
const clients = new Map()
const sessions = new Map()

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
    for (const [k, v] of Object.entries(data)) {
        map.set(k, v)
    }
}

// ================= BROADCAST =================
function broadcast(msg, except = null) {
    const data = JSON.stringify(msg)
    for (const c of wss.clients) {
        if (c !== except && c.readyState === 1) {
            c.send(data)
        }
    }
}

function broadcastUsers() {
    broadcast({
        type: 'users',
        users: [...clients.values()].map(u => ({
            id: u.id,
            name: u.name,
            color: u.color,
            editing: u.editing === true,
            ping: u.ping ?? null
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
        if (action.after === 0) map.delete(key)
        else map.set(key, action.after)
    }
}

// ================= WEBSOCKET =================
wss.on('connection', ws => {

    let sessionId = null
    let user = null

    ws.on('message', raw => {
        let msg
        try { msg = JSON.parse(raw) } catch { return }

        // ===== AUTH =====
        if (msg.type === 'auth') {
            sessionId = String(msg.sessionId || '')

            if (sessions.has(sessionId)) {
                const s = sessions.get(sessionId)
                user = {
                    id: sessionId.slice(0, 6),
                    name: s.name,
                    color: s.color,
                    editing: false,
                    ping: null
                }
            } else {
                sessionId = crypto.randomUUID()
                user = {
                    id: sessionId.slice(0, 6),
                    name: `User-${sessionId.slice(0, 4)}`,
                    color: colorFromId(sessionId),
                    editing: false,
                    ping: null
                }
                sessions.set(sessionId, {
                    name: user.name,
                    color: user.color
                })
            }

            clients.set(ws, user)

            ws.send(JSON.stringify({
                type: 'hello',
                id: user.id,
                name: user.name,
                color: user.color,
                sessionId
            }))

            ws.send(JSON.stringify({
                type: 'snapshot',
                map: Object.fromEntries(map)
            }))

            broadcastUsers()
            return
        }

        if (!user) return

        // ===== PING =====
        if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', t: msg.t }))
            return
        }

        // ===== LATENCY =====
        if (msg.type === 'latency') {
            user.ping = Math.max(0, Math.min(999, msg.ping | 0))
            broadcastUsers()
            return
        }

        // ===== RENAME =====
        if (msg.type === 'rename-start') {
            user.editing = true
            broadcastUsers()
            return
        }

        if (msg.type === 'rename-preview') {
            user.name = String(msg.name || '').slice(0, 24)
            user.editing = true
            sessions.set(sessionId, { name: user.name, color: user.color })
            broadcastUsers()
            return
        }

        if (msg.type === 'rename') {
            user.name = String(msg.name || '').slice(0, 24)
            user.editing = false
            sessions.set(sessionId, { name: user.name, color: user.color })
            broadcastUsers()
            return
        }

        // ===== CURSOR =====
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
            return
        }

        // ===== ACTION =====
        if (msg.type === 'action') {
            applyServerAction(msg.action)
            scheduleAutosave()
            broadcast({ type: 'action', action: msg.action }, ws)
            return
        }

        // ===== SAVE =====
        if (msg.type === 'save') {
            broadcast({ type: 'saving', mode: 'manual' })
            saveMap('manual')
        }
    })

    ws.on('close', () => {
        clients.delete(ws)
        broadcastUsers()
    })
})

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`)
})
