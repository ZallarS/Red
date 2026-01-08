import { getStatus, getPing } from './ws.js'

export function createDebugOverlay(getData) {
    let enabled = localStorage.getItem('debug-overlay') === '1'
    let el = null

    let fps = 0
    let frames = 0
    let lastTime = performance.now()

    function formatTime(ms) {
        const s = Math.floor(ms / 1000)
        const m = Math.floor(s / 60)
        return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
    }

    function init() {
        el = document.createElement('div')
        Object.assign(el.style, {
            position: 'fixed',
            top: '8px',
            left: '8px',
            padding: '6px 8px',
            background: 'rgba(0,0,0,0.6)',
            color: '#0f0',
            font: '11px monospace',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'pre',
            display: enabled ? 'block' : 'none'
        })
        document.body.appendChild(el)
    }

    function update(serverStats, uiState, usersCount) {
        if (!enabled || !el) return

        frames++
        const now = performance.now()
        if (now - lastTime >= 1000) {
            fps = frames
            frames = 0
            lastTime = now
        }

        let text =
            `FPS: ${fps}
WS: ${getStatus()}
RTT: ${getPing() ?? '-'}ms
Tool: ${uiState.tool}
Users: ${usersCount}
Grid: ${uiState.grid}
Snap: ${uiState.snapping}`

        if (serverStats) {
            text += `
Server:
 Uptime: ${formatTime(serverStats.uptime)}
 Clients: ${serverStats.clients}
 AFK: ${serverStats.afk}
 Timeout: ${serverStats.timeout}
 Tiles: ${serverStats.tiles}
 Autosave: ${serverStats.autosave}`
        }

        el.textContent = text
    }

    return { init, update }
}
