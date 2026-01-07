import fs from 'fs'
import path from 'path'
import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'

const __dirname = new URL('.', import.meta.url).pathname

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const PORT = 3000
const MAP_PATH = path.join(__dirname, 'assets/maps/level1.json')

// ================= MAP STATE =================
const map = new Map()
let autosaveTimer = null

// ================= LOAD MAP =================
if (fs.existsSync(MAP_PATH)) {
    const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
    for (const [k, v] of Object.entries(data)) {
        map.set(k, v)
    }
    console.log(`[LOAD] map loaded (${map.size} tiles)`)
} else {
    console.log('[LOAD] no saved map')
}

// ================= SAVE =================
function saveMap(reason = 'manual') {
    fs.writeFileSync(
        MAP_PATH,
        JSON.stringify(Object.fromEntries(map), null, 2)
    )
    console.log(`[SAVE] map saved (${reason})`)
}

// ================= AUTOSAVE (DEBOUNCE) =================
function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)

    autosaveTimer = setTimeout(() => {
        saveMap('autosave')
        autosaveTimer = null
    }, 3000) // 3 секунды после последнего изменения
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
    console.log('[WS] client connected')

    // notify others
    broadcast({
        type: 'user',
        event: 'join'
    })

    // snapshot
    ws.send(JSON.stringify({
        type: 'snapshot',
        map: Object.fromEntries(map)
    }))

    ws.on('message', data => {
        const msg = JSON.parse(data)

        if (msg.type === 'action') {
            applyServerAction(msg.action)
            scheduleAutosave()

            broadcast({
                type: 'action',
                action: msg.action
            })
        }

        if (msg.type === 'save') {
            saveMap('manual')
        }
    })

    ws.on('close', () => {
        console.log('[WS] client disconnected')
        broadcast({
            type: 'user',
            event: 'leave'
        })
    })
})

function broadcast(msg) {
    const data = JSON.stringify(msg)
    for (const client of wss.clients) {
        if (client.readyState === 1) {
            client.send(data)
        }
    }
}

// ================= API (OPTIONAL) =================
app.post('/api/save-map', (req, res) => {
    saveMap('manual')
    res.json({ ok: true })
})

// ================= START =================
server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Node engine on http://127.0.0.1:${PORT}`)
})
