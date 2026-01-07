import { applyAction } from './actions.js'

export const ws = new WebSocket('wss://lib31.ru/ws/')

ws.onmessage = e => {
    const msg = JSON.parse(e.data)

    if (msg.type === 'action') {
        applyAction(msg.action)
    }
}
