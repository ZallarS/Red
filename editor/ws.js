let ws = null
let status = 'offline'
let retries = 0

const listeners = new Map()

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

export function connect() {
    status = 'connecting'
    emit('status', status)

    ws = new WebSocket('wss://lib31.ru/ws')

    ws.onopen = () => {
        retries = 0
        status = 'online'
        emit('status', status)
    }

    ws.onmessage = e => {
        const msg = JSON.parse(e.data)
        emit('message', msg)
    }

    ws.onerror = () => {
        ws.close()
    }

    ws.onclose = () => {
        status = 'offline'
        emit('status', status)

        const timeout = Math.min(3000 + retries * 2000, 15000)
        retries++

        status = 'reconnecting'
        emit('status', status)

        setTimeout(connect, timeout)
    }
}

export function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
    }
}
