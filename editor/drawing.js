import { screenToWorld } from './camera.js'
import { TILE_SIZE } from './map.js'
import { createSetTileAction, applyAction } from './actions.js'
import { push } from './history.js'
import { send, getStatus } from './ws.js'
import { WS, ACTION } from './protocol.js'

/**
 * ===== TOOL IMPLEMENTATIONS =====
 */

function createBrushTool(getState) {
    const painted = new Set()
    const actions = []

    function paintAt(pos) {
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
        actions.push(action)
    }

    return {
        begin(ctx) {
            painted.clear()
            actions.length = 0
            paintAt(ctx.world)
        },

        move(ctx) {
            paintAt(ctx.world)
        },

        end(ctx) {
            if (!actions.length) return

            const brush = {
                type: ACTION.BRUSH,
                actions: [...actions]
            }

            push(brush)

            if (ctx.ready && getStatus() === 'online') {
                send({
                    type: WS.ACTION,
                    action: brush
                })
            }
        }
    }
}

/**
 * ===== DRAWING CONTROLLER =====
 */

export function initDrawing(canvas, getState) {
    let ready = false
    let myId = null
    let activeTool = null
    let drawing = false

    const brushTool = createBrushTool(getState)

    function setReady(v) {
        ready = v
    }

    function setMyId(id) {
        myId = id
    }

    function getContext(e) {
        const rect = canvas.getBoundingClientRect()
        const world = screenToWorld(
            e.clientX - rect.left,
            e.clientY - rect.top
        )

        return {
            event: e,
            world,
            ready,
            myId
        }
    }

    // ===== INPUT =====

    canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return

        drawing = true
        activeTool = brushTool
        activeTool.begin(getContext(e))
    })

    canvas.addEventListener('mousemove', e => {
        if (drawing && activeTool) {
            activeTool.move(getContext(e))
        }

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
        if (!drawing || !activeTool) return

        drawing = false
        activeTool.end({ ready })
        activeTool = null
    })

    return { setReady, setMyId }
}
