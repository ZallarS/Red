// network.js
// ================================
// СЕТЕВЫЕ ПРОТОКОЛЫ И МЕТОДЫ CANVASVERSE
// ================================

import { WS_CONFIG } from './config.js'

// ================================
// ПРОТОКОЛ WEBSOCKET СООБЩЕНИЙ
// ================================

export const WS_PROTOCOL = {
    // ===== АВТОРИЗАЦИЯ И СЕССИЯ =====
    AUTH: 'auth',
    AUTH_OK: 'auth-ok',
    HELLO: 'hello',

    // ===== КОМНАТЫ =====
    ROOM_LIST: 'room-list',
    ROOM_LIST_RESPONSE: 'room-list-response',
    ROOM_CREATE: 'room-create',
    ROOM_CREATED: 'room-created',
    ROOM_JOIN: 'room-join',
    ROOM_LEAVE: 'room-leave',
    ROOM_LEFT: 'room-left',
    ROOM_SNAPSHOT: 'room-snapshot',
    ROOM_USERS: 'room-users',

    // ===== НАСТРОЙКИ КОМНАТЫ =====
    ROOM_SETTINGS_UPDATE: 'room-settings-update',
    ROOM_SETTINGS_UPDATED: 'room-settings-updated',
    ROOM_SETTINGS_CHANGED: 'room-settings-changed',

    // ===== ПОЛЬЗОВАТЕЛИ И КУРСОРЫ =====
    CURSOR: 'cursor',
    CURSOR_LEAVE: 'cursor-leave',

    // ===== ДЕЙСТВИЯ РЕДАКТОРА =====
    ACTION: 'action',
    BRUSH: 'brush',
    SET_TILE: 'setTile',

    // ===== СИСТЕМА РОЛЕЙ =====
    ROLE_SET: 'role-set',
    ROLE_SET_RESPONSE: 'role-set-response',

    // ===== СОХРАНЕНИЕ =====
    SAVING: 'saving',
    SAVED: 'saved',
    SAVE: 'save',

    // ===== СТАТИСТИКА И ПИНГ =====
    SERVER_STATS: 'server-stats',
    PING: 'ping',
    PONG: 'pong',
    LATENCY: 'latency',

    // ===== ОШИБКИ =====
    ERROR: 'error'
}

// ================================
// КЛАСС ДЛЯ РАБОТЫ С СЕТЕВЫМИ ЗАПРОСАМИ
// ================================

export class NetworkManager {
    constructor() {
        this.ws = null
        this.status = 'offline'
        this.listeners = new Map()
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = WS_CONFIG.MAX_RECONNECT_ATTEMPTS
        this.userId = this.getUserId()
        this.pingInterval = null
        this.lastPing = null
    }

    // ===== УПРАВЛЕНИЕ СОЕДИНЕНИЕМ =====

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('🔄 WebSocket уже подключен')
            return
        }

        this.setStatus('connecting')

        try {
            this.ws = new WebSocket(WS_CONFIG.URL)

            this.ws.onopen = () => this.handleOpen()
            this.ws.onmessage = (event) => this.handleMessage(event)
            this.ws.onclose = () => this.handleClose()
            this.ws.onerror = (error) => this.handleError(error)

        } catch (error) {
            console.error('❌ Ошибка создания WebSocket:', error)
            this.scheduleReconnect()
        }
    }

    disconnect() {
        if (this.ws) {
            this.stopPing()
            this.ws.close()
            this.ws = null
        }
        this.setStatus('offline')
        this.reconnectAttempts = 0
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Превышено количество попыток переподключения')
            return
        }

        console.log(`🔄 Попытка переподключения ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`)
        this.disconnect()
        setTimeout(() => this.connect(), WS_CONFIG.RECONNECT_INTERVAL)
        this.reconnectAttempts++
    }

    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

    handleOpen() {
        console.log('✅ WebSocket подключен')
        this.setStatus('online')
        this.reconnectAttempts = 0
        this.startPing()
        this.authenticate()
    }

    handleMessage(event) {
        try {
            const message = JSON.parse(event.data)
            this.emit('message', message)

            // Автоматическая обработка некоторых типов сообщений
            switch (message.type) {
                case WS_PROTOCOL.PONG:
                    this.handlePong(message)
                    break
                case WS_PROTOCOL.AUTH_OK:
                    this.handleAuthOk(message)
                    break
                case WS_PROTOCOL.ERROR:
                    this.handleError(message)
                    break
            }

        } catch (error) {
            console.error('❌ Ошибка парсинга сообщения:', error)
        }
    }

    handleClose() {
        console.log('🔌 WebSocket отключен')
        this.setStatus('reconnecting')
        this.stopPing()
        this.scheduleReconnect()
    }

    handleError(error) {
        console.error('❌ WebSocket ошибка:', error)
        this.emit('error', error)
    }

    // ===== АВТОРИЗАЦИЯ =====

    authenticate() {
        this.send({
            type: WS_PROTOCOL.AUTH,
            userId: this.userId
        })
    }

    handleAuthOk(message) {
        console.log('✅ Авторизация успешна:', message.userId)
        this.userId = message.userId
        localStorage.setItem('editor-user-id', this.userId)
        this.emit('auth', message)
    }

    // ===== ПИНГ-ПОНГ =====

    startPing() {
        this.stopPing()
        this.pingInterval = setInterval(() => {
            this.send({
                type: WS_PROTOCOL.PING,
                timestamp: Date.now()
            })
        }, WS_CONFIG.PING_INTERVAL)
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
        }
    }

    handlePong(message) {
        this.lastPing = Date.now() - message.timestamp
        this.emit('ping', this.lastPing)
    }

    // ===== ОТПРАВКА И ПРИЕМ СООБЩЕНИЙ =====

    send(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket не готов к отправке:', data)
            return false
        }

        try {
            this.ws.send(JSON.stringify(data))
            return true
        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error)
            return false
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, [])
        }
        this.listeners.get(event).push(callback)
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return

        const listeners = this.listeners.get(event)
        const index = listeners.indexOf(callback)
        if (index > -1) {
            listeners.splice(index, 1)
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return

        this.listeners.get(event).forEach(callback => {
            try {
                callback(data)
            } catch (error) {
                console.error(`❌ Ошибка в обработчике события ${event}:`, error)
            }
        })
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

    getUserId() {
        let userId = localStorage.getItem('editor-user-id')
        if (!userId) {
            userId = crypto.randomUUID()
            localStorage.setItem('editor-user-id', userId)
        }
        return userId
    }

    setStatus(status) {
        this.status = status
        this.emit('status', status)
    }

    getStatus() {
        return this.status
    }

    getPing() {
        return this.lastPing
    }

    scheduleReconnect() {
        setTimeout(() => this.reconnect(), WS_CONFIG.RECONNECT_INTERVAL)
    }

    // ===== ВЫСОКОУРОВНЕВЫЕ МЕТОДЫ API =====

    // Работа с комнатами
    getRoomList() {
        return this.send({ type: WS_PROTOCOL.ROOM_LIST })
    }

    createRoom(settings) {
        return this.send({
            type: WS_PROTOCOL.ROOM_CREATE,
            settings: {
                ...settings,
                createdAt: Date.now()
            }
        })
    }

    joinRoom(roomId, password = '') {
        return this.send({
            type: WS_PROTOCOL.ROOM_JOIN,
            roomId,
            password
        })
    }

    leaveRoom(roomId) {
        return this.send({
            type: WS_PROTOCOL.ROOM_LEAVE,
            roomId
        })
    }

    // Работа с пользователями
    sendCursor(x, y, painting = false) {
        return this.send({
            type: WS_PROTOCOL.CURSOR,
            x, y, painting,
            userId: this.userId
        })
    }

    setUserRole(targetUserId, role) {
        return this.send({
            type: WS_PROTOCOL.ROLE_SET,
            targetUserId,
            role
        })
    }

    // Работа с редактором
    sendAction(action) {
        return this.send({
            type: WS_PROTOCOL.ACTION,
            action
        })
    }

    saveMap() {
        return this.send({ type: WS_PROTOCOL.SAVE })
    }

    // Работа с настройками
    updateRoomSettings(roomId, settings) {
        return this.send({
            type: WS_PROTOCOL.ROOM_SETTINGS_UPDATE,
            roomId,
            settings
        })
    }
}

// ================================
// ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР СЕТЕВОГО МЕНЕДЖЕРА
// ================================

let networkInstance = null

export function getNetworkManager() {
    if (!networkInstance) {
        networkInstance = new NetworkManager()
    }
    return networkInstance
}

// ================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С СЕТЬЮ
// ================================

export function formatMessage(type, data = {}) {
    return {
        type,
        timestamp: Date.now(),
        ...data
    }
}

export function validateMessage(message) {
    if (!message || typeof message !== 'object') {
        return { valid: false, error: 'Сообщение должно быть объектом' }
    }

    if (!message.type || typeof message.type !== 'string') {
        return { valid: false, error: 'Сообщение должно содержать тип' }
    }

    return { valid: true }
}

export function createResponse(request, success, data = {}) {
    return {
        type: `${request.type}-response`,
        requestId: request.requestId || Date.now(),
        timestamp: Date.now(),
        success,
        ...data
    }
}

export function createErrorResponse(request, error) {
    return createResponse(request, false, { error })
}

// ================================
// КОНСТАНТЫ ДЛЯ СЕТЕВЫХ МЕТОДОВ
// ================================

export const NETWORK_METHODS = {
    // Методы для комнат
    ROOMS: {
        LIST: 'room-list',
        CREATE: 'room-create',
        JOIN: 'room-join',
        LEAVE: 'room-leave',
        KICK: 'room-kick',
        INVITE: 'room-invite'
    },

    // Методы для пользователей
    USERS: {
        UPDATE: 'user-update',
        ROLE_SET: 'user-role-set',
        KICK: 'user-kick',
        BAN: 'user-ban'
    },

    // Методы для редактора
    EDITOR: {
        ACTION: 'editor-action',
        UNDO: 'editor-undo',
        REDO: 'editor-redo',
        CLEAR: 'editor-clear',
        IMPORT: 'editor-import',
        EXPORT: 'editor-export'
    },

    // Методы для настроек
    SETTINGS: {
        UPDATE: 'settings-update',
        RESET: 'settings-reset',
        EXPORT: 'settings-export',
        IMPORT: 'settings-import'
    },

    // Системные методы
    SYSTEM: {
        PING: 'system-ping',
        STATS: 'system-stats',
        LOG: 'system-log',
        BACKUP: 'system-backup'
    }
}

// ================================
// ДОКУМЕНТАЦИЯ ПРОТОКОЛА
// ================================

/**
 * ДОКУМЕНТАЦИЯ ПО ПРОТОКОЛУ WEBSOCKET
 *
 * Формат сообщений: JSON
 *
 * ОСНОВНЫЕ ТИПЫ СООБЩЕНИЙ:
 *
 * 1. АВТОРИЗАЦИЯ:
 *    - auth: { type: 'auth', userId: string }
 *    - auth-ok: { type: 'auth-ok', userId: string }
 *
 * 2. КОМНАТЫ:
 *    - room-list: { type: 'room-list' }
 *    - room-list-response: { type: 'room-list-response', rooms: Array }
 *    - room-create: { type: 'room-create', settings: Object }
 *    - room-created: { type: 'room-created', roomId: string }
 *    - room-join: { type: 'room-join', roomId: string, password?: string }
 *    - room-snapshot: { type: 'room-snapshot', ...roomData }
 *    - room-leave: { type: 'room-leave', roomId: string }
 *
 * 3. ПОЛЬЗОВАТЕЛИ:
 *    - room-users: { type: 'room-users', users: Array }
 *    - cursor: { type: 'cursor', x: number, y: number, painting: boolean }
 *    - role-set: { type: 'role-set', targetUserId: string, role: string }
 *    - role-set-response: { type: 'role-set-response', success: boolean, error?: string }
 *
 * 4. РЕДАКТОР:
 *    - action: { type: 'action', action: Object }
 *    - brush: { type: 'brush', actions: Array }
 *    - setTile: { type: 'setTile', x: number, y: number, before: number, after: number }
 *
 * 5. НАСТРОЙКИ:
 *    - room-settings-update: { type: 'room-settings-update', roomId: string, settings: Object }
 *    - room-settings-changed: { type: 'room-settings-changed', settings: Object }
 *
 * 6. СИСТЕМНЫЕ:
 *    - ping: { type: 'ping', timestamp: number }
 *    - pong: { type: 'pong', timestamp: number }
 *    - error: { type: 'error', message: string }
 */