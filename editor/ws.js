import { WS } from './protocol.js'

let ws = null
let status = 'offline'
let retries = 0

let ping = null
let pingTimer = null

const listeners = new Map()
const sessionKey = 'editor-session-id'
let sessionId = localStorage.getItem(sessionKey)

export function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, [])
    listeners.get(type).push(fn)
}

function emit(type, data) {
    if (!listeners.has(type)) return
    for (const fn of listeners.get(type)) fn(data)
}

export function getStatus() {
    return status
}

export function getPing() {
    return ping
}

export function connect() {
    status = 'connecting'
    emit('status', status)

    ws = new WebSocket('wss://lib31.ru/ws')

    ws.onopen = () => {
        status = 'online'
        retries = 0
        emit('status', status)

        ws.send(JSON.stringify({
            type: WS.AUTH,
            sessionId
        }))

        pingTimer = setInterval(() => {
            ws.send(JSON.stringify({
                type: WS.PING,
                t: Date.now()
            }))
        }, 2000)
    }

    ws.onmessage = e => {
        const msg = JSON.parse(e.data)

        if (msg.type === WS.PONG) {
            ping = Date.now() - msg.t
            emit('ping', ping)

            send({
                type: WS.LATENCY,
                ping
            })
            return
        }

        if (msg.type === WS.HELLO && msg.sessionId) {
            sessionId = msg.sessionId
            localStorage.setItem(sessionKey, sessionId)
        }

        emit('message', msg)
    }

    ws.onclose = () => {
        clearInterval(pingTimer)
        ping = null

        status = 'reconnecting'
        emit('status', status)

        const timeout = Math.min(3000 + retries * 2000, 15000)
        retries++
        setTimeout(connect, timeout)
    }

    ws.onerror = () => ws.close()
}

export function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
    }
}
