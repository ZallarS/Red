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
const userStatuses = new Map() // userId -> { lastActivity, isOnline }

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
        users: new Map(), // WebSocket -> userId
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

// ===================== USER STATUS HELPERS =====================
function updateUserOnlineStatus(userId, isOnline) {
    if (!userStatuses.has(userId)) {
        userStatuses.set(userId, {
            lastActivity: Date.now(),
            isOnline: false
        })
    }

    const status = userStatuses.get(userId)
    status.isOnline = isOnline
    if (isOnline) {
        status.lastActivity = Date.now()
    }
}

function getUserStatus(userId) {
    if (!userStatuses.has(userId)) {
        return {
            status: 'offline',
            lastActivity: null
        }
    }

    const userStatus = userStatuses.get(userId)
    const now = Date.now()

    if (!userStatus.isOnline) {
        return {
            status: 'offline',
            lastActivity: userStatus.lastActivity
        }
    }

    // Если онлайн, проверяем активность
    const timeSinceActivity = now - userStatus.lastActivity

    if (timeSinceActivity < 30000) { // 30 секунд
        return {
            status: 'online',
            lastActivity: userStatus.lastActivity
        }
    } else if (timeSinceActivity < 300000) { // 5 минут
        return {
            status: 'idle',
            lastActivity: userStatus.lastActivity
        }
    } else {
        return {
            status: 'away',
            lastActivity: userStatus.lastActivity
        }
    }
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

    // Получаем ВСЕХ пользователей комнаты (из roles), включая офлайн
    const allUserIds = Array.from(room.roles.keys())
    const userList = allUserIds.map(userId => {
        const u = users.get(userId)
        const role = room.roles.get(userId)
        const status = getUserStatus(userId)

        // Проверяем, есть ли активное соединение
        const isCurrentlyInRoom = Array.from(room.users.values()).includes(userId)

        return {
            id: userId,
            name: u?.name || 'Unknown',
            color: u?.color || '#888',
            role,
            status: status.status,
            lastActivity: status.lastActivity,
            isOnline: status.status !== 'offline',
            isCurrentlyConnected: isCurrentlyInRoom
        }
    })

    console.log('📤 Broadcasting room-users:', userList.map(u => ({
        id: u.id,
        role: u.role,
        status: u.status
    })))

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

    console.log('🛠️ Применяем действие к комнате:', action.type,
        action.actions?.map(a => `(${a.x}, ${a.y})`) || `(${action.x}, ${action.y})`)

    if (action.type === 'brush') {
        action.actions.forEach(a => applyRoomAction(room, a))
        return
    }

    if (action.type === 'setTile') {
        const key = `${action.x},${action.y}`
        console.log(`   Устанавливаем тайл в (${action.x}, ${action.y}) -> ${action.after ? '1' : '0'}`)
        if (action.after === 0) {
            room.map.delete(key)
        } else {
            room.map.set(key, action.after)
        }
    }
}

// ===================== ROLES =====================
const VALID_ROLES = new Set(['owner', 'admin', 'editor', 'viewer'])

function isAdmin(room, userId) {
    const role = room.roles.get(userId)
    return role === 'admin' || role === 'owner'
}

function canEdit(room, userId) {
    const role = room.roles.get(userId)
    return role === 'admin' || role === 'editor' || role === 'owner'
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

            // Инициализируем статус пользователя
            updateUserOnlineStatus(userId, true)

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
                roles: new Map([[userId, 'owner']]), // Создатель становится владельцем
                users: new Map(),
                autosaveTimer: null,
                settings: {
                    ...DEFAULT_ROOM_SETTINGS,
                    ...userSettings,
                    createdAt: Date.now(),
                    owner: userId, // Сохраняем ID владельца
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

            // Если пользователь еще не в списке ролей, добавляем с ролью по умолчанию
            if (!room.roles.has(userId)) {
                room.roles.set(userId, room.settings.defaultRole || 'viewer')
                saveRoom(room)
            }

            // Добавляем пользователя в активные соединения
            room.users.set(ws, userId)
            room.settings.currentUsers = room.users.size

            // Обновляем статус пользователя
            updateUserOnlineStatus(userId, true)

            // Отправляем snapshot
            ws.send(JSON.stringify({
                type: 'room-snapshot',
                roomId,
                userId: userId,
                role: room.roles.get(userId),
                map: Object.fromEntries(room.map),
                settings: room.settings
            }))

            // Отправляем обновленный список пользователей ВСЕМ
            broadcastRoomUsers(room)
            return
        }

        // ===== ROOM LEAVE =====
        if (msg.type === 'room-leave') {
            if (room && userId) {
                console.log(`🚪 Пользователь ${userId} покидает комнату ${room.id}`)

                // Удаляем пользователя из активных соединений
                room.users.delete(ws)
                room.settings.currentUsers = room.users.size

                // Обновляем статус пользователя
                updateUserOnlineStatus(userId, false)

                // Если пользователей не осталось, очищаем комнату из памяти
                if (room.users.size === 0) {
                    console.log(`🏁 Комната ${room.id} пуста, очищаем из памяти`)
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

        // ===== USER ACTIVITY =====
        if (msg.type === 'user-activity') {
            // Обновляем активность пользователя
            updateUserOnlineStatus(userId, true)
            return
        }

        // ===== ROLE SET =====
        if (msg.type === 'role-set') {
            const { targetUserId, role } = msg

            // Проверяем, является ли текущий пользователь владельцем или админом
            const currentUserRole = room.roles.get(userId)
            const isOwner = currentUserRole === 'owner'
            const isAdmin = currentUserRole === 'admin'

            // Проверяем, является ли целевой пользователь владельцем
            const targetUserRole = room.roles.get(targetUserId)
            const isTargetOwner = targetUserRole === 'owner'

            // Только владелец или админ может менять роли
            if (!isOwner && !isAdmin) {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Not authorized'
                }))
                return
            }

            // Никто не может изменить роль владельца
            if (isTargetOwner) {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Cannot change owner role'
                }))
                return
            }

            // Админ не может назначать роль "owner"
            if (isAdmin && role === 'owner') {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Only owner can assign owner role'
                }))
                return
            }

            // Админ не может понизить другого админа до не-админа
            if (isAdmin && targetUserRole === 'admin' && role !== 'admin') {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Admin cannot demote other admin'
                }))
                return
            }

            // Владелец не может понизить сам себя
            if (targetUserId === userId && role !== 'owner') {
                ws.send(JSON.stringify({
                    type: 'role-set-response',
                    success: false,
                    error: 'Owner cannot demote self'
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

            room.roles.set(targetUserId, role)
            saveRoom(room)

            // Отправляем успешный ответ
            ws.send(JSON.stringify({
                type: 'role-set-response',
                success: true,
                targetUserId,
                role
            }))

            // ОТПРАВЛЯЕМ ОБНОВЛЁННЫЙ СПИСОК ВСЕМ ПОЛЬЗОВАТЕЛЯМ
            broadcastRoomUsers(room)
            return
        }

        // ===== CURSOR =====
        if (msg.type === 'cursor') {
            const u = users.get(userId)

            // Обновляем активность пользователя
            updateUserOnlineStatus(userId, true)

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

            // ВАЖНОЕ ИСПРАВЛЕНИЕ: Разрешаем владельцу (owner) рисовать
            if (!canEdit(room, userId)) {
                console.log(`❌ Пользователь ${userId} с ролью ${role} не имеет прав на редактирование`)
                return
            }

            console.log('🎯 Получено действие от', userId, 'с ролью', role, ':',
                msg.action.actions?.map(a => `(${a.x}, ${a.y})`) || `(${msg.action.x}, ${msg.action.y})`)

            // Обновляем активность пользователя
            updateUserOnlineStatus(userId, true)

            applyRoomAction(room, msg.action)
            scheduleAutosave(room)

            // ВАЖНО: Рассылаем всем, кроме отправителя (отправитель уже применил действие локально)
            broadcastRoom(room, {
                type: 'action',
                action: msg.action,
                senderId: userId // Добавляем ID отправителя для отладки
            }, ws)
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

            // Удаляем пользователя из активных соединений
            room.users.delete(ws)
            room.settings.currentUsers = room.users.size

            // Обновляем статус пользователя на офлайн
            updateUserOnlineStatus(userId, false)

            // Если пользователей не осталось, очищаем комнату из памяти
            if (room.users.size === 0) {
                console.log(`🏁 Комната ${room.id} пуста, очищаем из памяти`)
                saveRoom(room)
                rooms.delete(room.id)
            } else {
                // Обновляем список пользователей для оставшихся
                broadcastRoomUsers(room)
            }
        }

        // Не удаляем пользователя из глобального списка, чтобы он оставался в истории
        // Удаляем только если пользователь больше нигде не используется
        // (это упрощенная логика, в реальности нужна более сложная)
    })

    ws.on('error', (error) => {
        console.error(`❌ WebSocket ошибка для пользователя ${userId}:`, error)
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
    console.log(`📊 Поддерживаются статусы пользователей: online, idle, away, offline`)
})