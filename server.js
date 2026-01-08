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
const MAPS_DIR = path.join(__dirname, 'assets/maps')

if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true })
}

// ===================== ROOMS =====================
const rooms = new Map()
// roomId -> room (only active rooms in RAM)

// ===================== SESSIONS =====================
const sessions = new Map()
// sessionId -> { name, color }

function colorFromId(id) {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    return `hsl(${Math.abs(hash) % 360}, 80%, 60%)`
}

// ===================== ROOM FILES =====================
function roomFile(roomId) {
    return path.join(MAPS_DIR, `room_${roomId}.json`)
}

function roomExists(roomId) {
    return fs.existsSync(roomFile(roomId))
}

function listRoomIds() {
    return fs.readdirSync(MAPS_DIR)
        .filter(f => f.startsWith('room_') && f.endsWith('.json'))
        .map(f => f.slice(5, -5))
}

function loadRoom(roomId) {
    if (rooms.has(roomId)) {
        return rooms.get(roomId)
    }

    if (!roomExists(roomId)) {
        return null
    }

    const map = new Map()
    const data = JSON.parse(fs.readFileSync(roomFile(roomId), 'utf8'))
    for (const [k, v] of Object.entries(data)) {
        map.set(k, v)
    }

    const room = {
        id: roomId,
        ownerId: null,
        users: new Map(),
        map,
        autosaveTimer: null
    }

    rooms.set(roomId, room)
    return room
}

function saveRoom(room) {
    fs.writeFileSync(
        roomFile(room.id),
        JSON.stringify(Object.fromEntries(room.map), null, 2)
    )
}

// ===================== ROOM UTILS =====================
function broadcastRoom(room, msg, except = null) {
    const data = JSON.stringify(msg)
    for (const ws of room.users.keys()) {
        if (ws !== except && ws.readyState === 1) {
            ws.send(data)
        }
    }
}

function broadcastRoomUsers(room) {
    broadcastRoom(room, {
        type: 'room-users',
        users: [...room.users.values()].map(u => ({
            id: u.id,
            name: u.name,
            color: u.color,
            role: room.ownerId === u.id ? 'admin' : 'viewer'
        }))
    })
}

function scheduleAutosave(room) {
    clearTimeout(room.autosaveTimer)
    broadcastRoom(room, { type: 'saving', mode: 'autosave' })

    room.autosaveTimer = setTimeout(() => {
        saveRoom(room)
        room.autosaveTimer = null
        broadcastRoom(room, { type: 'saved', mode: 'autosave' })
    }, 3000)
}

function applyRoomAction(room, action) {
    if (!action) return
    if (action.type === 'brush') {
        action.actions.forEach(a => applyRoomAction(room, a))
        return
    }
    if (action.type === 'setTile') {
        const key = `${action.x},${action.y}`
        if (action.after === 0) room.map.delete(key)
        else room.map.set(key, action.after)
    }
}

// ===================== WS =====================
wss.on('connection', ws => {

    let sessionId = null
    let user = null
    let room = null

    ws.on('message', raw => {
        let msg
        try { msg = JSON.parse(raw) } catch { return }

        // ===== AUTH =====
        if (msg.type === 'auth') {
            sessionId = String(msg.sessionId || '')
            if (!sessions.has(sessionId)) {
                sessionId = crypto.randomUUID()
                sessions.set(sessionId, {
                    name: `User-${sessionId.slice(0, 4)}`,
                    color: colorFromId(sessionId)
                })
            }

            ws.send(JSON.stringify({
                type: 'auth-ok',
                sessionId
            }))
            return
        }

        if (!sessionId) return

        // ===== ROOM LIST =====
        if (msg.type === 'room-list') {
            const ids = listRoomIds()

            ws.send(JSON.stringify({
                type: 'room-list-response',
                rooms: ids.map(id => ({
                    id,
                    users: rooms.get(id)?.users.size || 0
                }))
            }))
            return
        }

        // ===== ROOM CREATE =====
        if (msg.type === 'room-create') {
            const roomId = crypto.randomUUID().slice(0, 6)

            const room = {
                id: roomId,
                ownerId: null,
                users: new Map(),
                map: new Map(),
                autosaveTimer: null
            }

            rooms.set(roomId, room)
            saveRoom(room)

            ws.send(JSON.stringify({
                type: 'room-created',
                roomId
            }))
            return
        }

        // ===== ROOM JOIN =====
        if (msg.type === 'room-join') {
            const roomId = String(msg.roomId || '')
            room = loadRoom(roomId)

            if (!room) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Room not found'
                }))
                return
            }

            const s = sessions.get(sessionId)
            const id = sessionId.slice(0, 6)

            user = {
                id,
                name: s.name,
                color: s.color
            }

            room.users.set(ws, user)

            if (!room.ownerId) {
                room.ownerId = user.id
            }

            ws.send(JSON.stringify({
                type: 'room-snapshot',
                roomId,
                role: room.ownerId === user.id ? 'admin' : 'viewer',
                map: Object.fromEntries(room.map)
            }))

            broadcastRoomUsers(room)
            return
        }

        if (!room || !user) return

        // ===== CURSOR =====
        if (msg.type === 'cursor') {
            broadcastRoom(room, {
                type: 'cursor',
                id: user.id,
                name: user.name,
                color: user.color,
                x: msg.x,
                y: msg.y,
                painting: !!msg.painting,
                t: Date.now()
            }, ws)
            return
        }

        // ===== ACTION =====
        if (msg.type === 'action') {
            if (room.ownerId !== user.id) return
            applyRoomAction(room, msg.action)
            scheduleAutosave(room)
            broadcastRoom(room, { type: 'action', action: msg.action }, ws)
            return
        }

        // ===== SAVE =====
        if (msg.type === 'save') {
            if (room.ownerId !== user.id) return
            saveRoom(room)
            broadcastRoom(room, { type: 'saved', mode: 'manual' })
            return
        }
    })

    ws.on('close', () => {
        if (!room || !user) return

        room.users.delete(ws)

        if (room.ownerId === user.id) {
            const next = room.users.values().next().value
            room.ownerId = next ? next.id : null
        }

        if (room.users.size === 0) {
            rooms.delete(room.id)
        } else {
            broadcastRoomUsers(room)
        }
    })
})

// ===================== STATIC + SPA =====================

// раздаём ВСЮ директорию проекта
app.use(express.static(__dirname))

// SPA fallback (Express 5 compatible)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

// ===================== START =====================
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`)
})
