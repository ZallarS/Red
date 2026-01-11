import { WS } from './protocol.js'

/**
 * ===============================
 * EVENT BUS
 * ===============================
 */

const listeners = new Map()

export function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, [])
    listeners.get(type).push(fn)
}

function emit(type, payload) {
    const list = listeners.get(type)
    if (!list) return
    for (const fn of list) fn(payload)
}

/**
 * ===============================
 * USER ID (PERSISTENT)
 * ===============================
 */

const USER_ID_KEY = 'editor-user-id'

let userId = localStorage.getItem(USER_ID_KEY)

if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, userId)
}

// 🔥 Экспортируем userId для использования в других модулях
export function getUserId() {
    return userId
}

// 🔥 Функция для обновления userId (на случай, если нужно изменить)
export function setUserId(newUserId) {
    if (newUserId && newUserId !== userId) {
        userId = newUserId
        localStorage.setItem(USER_ID_KEY, userId)
        console.log('🆔 User ID updated to:', userId)
    }
}

/**
 * ===============================
 * CONNECTION STATE
 * ===============================
 */

let ws = null
let status = 'offline'
let retries = 0

export function getStatus() {
    return status
}

function setStatus(next) {
    status = next
    emit('status', status)
}

/**
 * ===============================
 * PING / LATENCY
 * ===============================
 */

let ping = null
let pingTimer = null

export function getPing() {
    return ping
}

function startPing() {
    stopPing()
    pingTimer = setInterval(() => {
        send({
            type: WS.PING,
            t: Date.now()
        })
    }, 2000)
}

function stopPing() {
    if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
    }
    ping = null
}

/**
 * ===============================
 * CONNECTION
 * ===============================
 */

export function connect() {
    setStatus('connecting')

    ws = new WebSocket('wss://lib31.ru/ws')

    ws.onopen = () => {
        retries = 0
        setStatus('online')

        // ✅ ОТПРАВЛЯЕМ userId, А НЕ sessionId
        console.log('📤 Sending auth with userId:', userId)
        send({
            type: WS.AUTH,
            userId
        })

        startPing()
    }

    ws.onmessage = e => {
        let msg
        try {
            msg = JSON.parse(e.data)
        } catch {
            return
        }

        // ===== PONG =====
        if (msg.type === WS.PONG) {
            ping = Date.now() - msg.t
            emit('ping', ping)

            send({
                type: WS.LATENCY,
                ping
            })
            return
        }

        // 🔥 Логируем входящие сообщения для отладки
        if (msg.type === 'room-users') {
            console.log('📥 Received room-users:', msg.users)
        }

        emit('message', msg)
    }

    ws.onclose = () => {
        stopPing()
        setStatus('reconnecting')

        const timeout = Math.min(3000 + retries * 2000, 15000)
        retries++
        setTimeout(connect, timeout)
    }

    ws.onerror = () => {
        ws.close()
    }
}

/**
 * ===============================
 * SEND
 * ===============================
 */

export function send(data) {
    if (!ws) return
    if (ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(data))
}