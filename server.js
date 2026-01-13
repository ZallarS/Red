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

// ===================== USERS (GLOBAL, PERSISTENT) =====================
const users = new Map()

function colorFromId(id) {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    return `hsl(${Math.abs(hash) % 360}, 80%, 60%)`
}

// ===================== ROOM SETTINGS DEFAULTS =====================
const DEFAULT_ROOM_SETTINGS = {
    name: 'Новая комната',
    description: '',
    visibility: 'public', // public, private, password-protected
    password: '',
    maxUsers: 20,
    allowGuests: true,
    gridEnabled: true,
    snapEnabled: true,
    defaultRole: 'viewer',
    createdAt: Date.now(),
    owner: null,
    currentUsers: 0
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
    if (rooms.has(roomId)) return rooms.get(roomId)
    if (!roomExists(roomId)) return null

    const raw = JSON.parse(fs.readFileSync(roomFile(roomId), 'utf8'))

    const room = {
        id: roomId,
        map: new Map(Object.entries(raw.map || {})),
        roles: new Map(Object.entries(raw.roles || {})),
        users: new Map(),
        autosaveTimer: null,
        settings: {
            ...DEFAULT_ROOM_SETTINGS,
            ...raw.settings,
            currentUsers: 0
        }
    }

    rooms.set(roomId, room)
    return room
}

function saveRoom(room) {
    const settingsToSave = {
        ...room.settings,
        currentUsers: room.users.size // Сохраняем текущее количество пользователей
    }

    fs.writeFileSync(
        roomFile(room.id),
        JSON.stringify({
            map: Object.fromEntries(room.map),
            roles: Object.fromEntries(room.roles),
            settings: settingsToSave
        }, null, 2)
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
    // Обновляем количество пользователей в настройках
    room.settings.currentUsers = room.users.size

    const userList = [...room.roles.entries()].map(([userId, role]) => {
        const u = users.get(userId)
        return {
            id: userId,
            name: u?.name || 'Unknown',
            color: u?.color || '#888',
            role
        }
    })

    console.log('📤 Broadcasting room-users:', userList.map(u => ({ id: u.id, role: u.role })))

    broadcastRoom(room, {
        type: 'room-users',
        users: userList
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

// ===================== ROLES =====================
const VALID_ROLES = new Set(['admin', 'editor', 'viewer'])

function isAdmin(room, userId) {
    return room.roles.get(userId) === 'admin'
}

// ===================== WS =====================
wss.on('connection', ws => {

    let userId = null
    let room = null

    ws.on('message', raw => {
        let msg
        try { msg = JSON.parse(raw) } catch { return }

        // ===== AUTH =====
        if (msg.type === 'auth') {
            userId = String(msg.userId || '').trim()

            if (!userId) {
                userId = crypto.randomUUID()
            }

            if (!users.has(userId)) {
                users.set(userId, {
                    id: userId,
                    name: `User-${userId.slice(0, 4)}`,
                    color: colorFromId(userId)
                })
            }

            ws.send(JSON.stringify({
                type: 'auth-ok',
                userId
            }))
            return
        }

        if (!userId) return

        // ===== ROOM LIST =====
        if (msg.type === 'room-list') {
            const roomList = listRoomIds().map(id => {
                const roomData = loadRoom(id)
                if (!roomData) return null

                return {
                    id,
                    users: roomData.users.size,
                    settings: {
                        ...roomData.settings,
                        currentUsers: roomData.users.size
                    }
                }
            }).filter(Boolean)

            ws.send(JSON.stringify({
                type: 'room-list-response',
                rooms: roomList
            }))
            return
        }

        // ===== ROOM CREATE =====
        if (msg.type === 'room-create') {
            const roomId = crypto.randomUUID().slice(0, 6)
            const userSettings = msg.settings || {}

            const room = {
                id: roomId,
                map: new Map(),
                roles: new Map([[userId, 'admin']]),
                users: new Map(),
                autosaveTimer: null,
                settings: {
                    ...DEFAULT_ROOM_SETTINGS,
                    ...userSettings,
                    createdAt: Date.now(),
                    owner: userId,
                    currentUsers: 1
                }
            }

            // Если есть имя комнаты от пользователя
            if (userSettings.name) {
                room.settings.name = userSettings.name
            }

            rooms.set(roomId, room)
            saveRoom(room)

            ws.send(JSON.stringify({
                type: 'room-created',
                roomId
            }))
            return
        }

        // ===== ROOM SETTINGS UPDATE =====
        if (msg.type === 'room-settings-update') {
            const { roomId, settings } = msg

            if (!roomId || !settings) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid settings update request'
                }))
                return
            }

            const targetRoom = loadRoom(roomId)
            if (!targetRoom) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Room not found'
                }))
                return
            }

            // Проверяем права (только админ или владелец)
            if (!isAdmin(targetRoom, userId) && targetRoom.settings.owner !== userId) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Permission denied'
                }))
                return
            }

            // Обновляем настройки
            targetRoom.settings = {
                ...targetRoom.settings,
                ...settings
            }

            saveRoom(targetRoom)

            // Отправляем подтверждение
            ws.send(JSON.stringify({
                type: 'room-settings-updated',
                roomId,
                settings: targetRoom.settings
            }))

            // Уведомляем всех в комнате
            broadcastRoom(targetRoom, {
                type: 'room-settings-changed',
                settings: targetRoom.settings
            })

            return
        }

        // ===== ROOM JOIN =====
        if (msg.type === 'room-join') {
            const roomId = String(msg.roomId || '')
            const password = msg.password || ''
            room = loadRoom(roomId)

            if (!room) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Room not found'
                }))
                return
            }

            // Проверка пароля если требуется
            if (room.settings.visibility === 'password-protected') {
                if (room.settings.password && room.settings.password !== password) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Incorrect password'
                    }))
                    return
                }
            }

            // Проверка приватности
            if (room.settings.visibility === 'private') {
                // В приватных комнатах можно присоединиться только по приглашению
                // (здесь можно добавить логику приглашений)
                if (!room.roles.has(userId)) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'This room is private'
                    }))
                    return
                }
            }

            // Проверка максимального количества пользователей
            if (room.users.size >= room.settings.maxUsers) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Room is full'
                }))
                return
            }

            if (!room.roles.has(userId)) {
                room.roles.set(userId, room.settings.defaultRole || 'viewer')
                saveRoom(room)
            }

            room.users.set(ws, userId)
            room.settings.currentUsers = room.users.size

            // 🔥 Отправляем snapshot с userId и настройками
            ws.send(JSON.stringify({
                type: 'room-snapshot',
                roomId,
                userId: userId,
                role: room.roles.get(userId),
                map: Object.fromEntries(room.map),
                settings: room.settings
            }))

            // 🔥 Отправляем обновленный список пользователей ВСЕМ
            broadcastRoomUsers(room)
            return
        }

        // 🔥 ===== ROOM LEAVE =====
        if (msg.type === 'room-leave') {
            if (room && userId) {
                console.log(`🚪 Пользователь ${userId} покидает комнату ${room.id}`)

                // Удаляем пользователя из комнаты
                room.users.delete(ws)
                room.settings.currentUsers = room.users.size

                // Если пользователей не осталось, можно очистить комнату из памяти
                if (room.users.size === 0) {
                    console.log(`🏁 Комната ${room.id} пуста, очищаем из памяти`)
                    // Сохраняем перед удалением
                    saveRoom(room)
                    rooms.delete(room.id)
                } else {
                    // Обновляем список пользователей для оставшихся
                    broadcastRoomUsers(room)
                }

                // Отправляем подтверждение клиенту
                ws.send(JSON.stringify({
                    type: 'room-left',
                    roomId: room.id,
                    success: true
                }))

                room = null
            }
            return
        }

        if (!room) return

        // ===== ROLE SET =====
        if (msg.type === 'role-set') {
            const { targetUserId, role } = msg

            if (!isAdmin(room, userId)) {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Not authorized'
                }))
                return
            }

            if (!VALID_ROLES.has(role)) {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Invalid role'
                }))
                return
            }

            if (!room.roles.has(targetUserId)) {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'User not found'
                }))
                return
            }

            // 🛡️ ЗАПРЕТ САМОПОНИЖЕНИЯ АДМИНА
            if (targetUserId === userId && role !== 'admin') {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Cannot demote yourself from admin'
                }))
                return
            }

            // 🛡️ защита от снятия последнего админа
            if (role !== 'admin' && room.roles.get(targetUserId) === 'admin') {
                const admins = [...room.roles.values()].filter(r => r === 'admin')
                if (admins.length <= 1) {
                    ws.send(JSON.stringify({
                        type: 'role-set-response',
                        success: false,
                        error: 'Cannot remove last admin'
                    }))
                    return
                }
            }

            room.roles.set(targetUserId, role)
            saveRoom(room)

            // 🔥 Отправляем успешный ответ
            ws.send(JSON.stringify({
                type: 'role-set-response',
                success: true,
                targetUserId,
                role
            }))

            // 🔥 ОТПРАВЛЯЕМ ОБНОВЛЁННЫЙ СПИСОК ВСЕМ ПОЛЬЗОВАТЕЛЯМ
            broadcastRoomUsers(room)
            return
        }

        // ===== CURSOR =====
        if (msg.type === 'cursor') {
            const u = users.get(userId)
            broadcastRoom(room, {
                type: 'cursor',
                id: userId,
                name: u.name,
                color: u.color,
                x: msg.x,
                y: msg.y,
                painting: !!msg.painting,
                t: Date.now()
            }, ws)
            return
        }

        // ===== ACTION =====
        if (msg.type === 'action') {
            const role = room.roles.get(userId)
            if (role !== 'admin' && role !== 'editor') return

            applyRoomAction(room, msg.action)
            scheduleAutosave(room)
            broadcastRoom(room, { type: 'action', action: msg.action }, ws)
            return
        }

        // ===== SAVE =====
        if (msg.type === 'save') {
            if (!isAdmin(room, userId)) return
            saveRoom(room)
            broadcastRoom(room, { type: 'saved', mode: 'manual' })
            return
        }
    })

    ws.on('close', () => {
        if (room && userId) {
            console.log(`🔌 WebSocket закрыт, удаляем пользователя ${userId} из комнаты ${room.id}`)
            room.users.delete(ws)
            room.settings.currentUsers = room.users.size

            // Если пользователей не осталось, очищаем комнату из памяти
            if (room.users.size === 0) {
                console.log(`🏁 Комната ${room.id} пуста, очищаем из памяти`)
                saveRoom(room)
                rooms.delete(room.id)
            } else {
                broadcastRoomUsers(room)
            }
        }

        // Удаляем пользователя из глобального списка при полном отключении
        users.delete(userId)
    })
})

// ===================== STATIC + SPA =====================
app.use(express.static(__dirname))

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

// ===================== START =====================
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`)
})