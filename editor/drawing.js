import { screenToWorld } from './camera.js'
import { TILE_SIZE } from './map.js'
import { createSetTileAction, applyAction } from './actions.js'
import { push } from './history.js'
import { send, getStatus } from './ws.js'
import { WS, ACTION } from './protocol.js'

export function initDrawing(canvas, getState) {
    console.log('[DRAWING] initDrawing called', canvas)
    let ready = false
    let myId = null

    let isDrawing = false
    let brushActions = []
    const painted = new Set()

    function setReady(v) { ready = v }
    function setMyId(id) { myId = id }

    function paint(e) {
        const rect = canvas.getBoundingClientRect()
        const pos = screenToWorld(
            e.clientX - rect.left,
            e.clientY - rect.top
        )

        const { tool, snapping } = getState()

        const x = snapping
            ? Math.floor(pos.x / TILE_SIZE)
            : Math.round(pos.x / TILE_SIZE)

        const y = snapping
            ? Math.floor(pos.y / TILE_SIZE)
            : Math.round(pos.y / TILE_SIZE)

        const key = `${x},${y}`
        if (painted.has(key)) return
        painted.add(key)

        const tile = tool === 'erase' ? 0 : 1
        const action = createSetTileAction(x, y, tile)
        if (!action) return

        applyAction(action)
        brushActions.push(action)
    }

    // ✅ ТОЛЬКО button === 0
    canvas.addEventListener('mousedown', e => {
        console.log('[DRAWING] mousedown', e.button)
        if (e.button !== 0) return

        isDrawing = true
        brushActions = []
        painted.clear()
        paint(e)
    })

    canvas.addEventListener('mousemove', e => {
        if (isDrawing) paint(e)

        if (myId && getStatus() === 'online') {
            const r = canvas.getBoundingClientRect()
            send({
                type: WS.CURSOR,
                x: e.clientX - r.left,
                y: e.clientY - r.top
            })
        }
    })

    window.addEventListener('mouseup', () => {
        if (!isDrawing) return
        isDrawing = false

        if (!brushActions.length) return

        if (ready && getStatus() === 'online') {
            const brush = {
                type: ACTION.BRUSH,
                actions: brushActions
            }
            push(brush)
            send({
                type: WS.ACTION,
                action: brush
            })
        }
    })

    return { setReady, setMyId }
}
