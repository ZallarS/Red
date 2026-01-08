// editor/render.js

import { camera } from './camera.js'
import {
    TILE_SIZE,
    CHUNK_SIZE,
    LOD_LEVELS,
    getVisibleChunks,
    redrawChunkLOD
} from './map.js'

function getLOD(zoom) {
    if (zoom >= 1.0) return LOD_LEVELS.FULL
    if (zoom >= 0.6) return LOD_LEVELS.SIMPLE
    if (zoom >= 0.35) return LOD_LEVELS.DOT
    return null
}

export function render(ctx, canvas, cursors = new Map()) {
    // ===== RESET =====
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ===== CAMERA =====
    ctx.setTransform(
        camera.zoom,
        0,
        0,
        camera.zoom,
        -camera.x * camera.zoom,
        -camera.y * camera.zoom
    )

    const lod = getLOD(camera.zoom)
    if (lod !== null) {
        const chunks = getVisibleChunks(camera, canvas)
        for (const chunk of chunks) {
            redrawChunkLOD(chunk, lod)
            ctx.drawImage(
                chunk.canvases.get(lod).canvas,
                chunk.cx * CHUNK_SIZE * TILE_SIZE,
                chunk.cy * CHUNK_SIZE * TILE_SIZE
            )
        }
    }

    // ===== CURSORS =====
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (const c of cursors.values()) {
        const sx = (c.x - camera.x) * camera.zoom
        const sy = (c.y - camera.y) * camera.zoom

        ctx.fillStyle = c.color
        ctx.beginPath()
        ctx.arc(sx, sy, 4, 0, Math.PI * 2)
        ctx.fill()

        if (c.name) {
            ctx.font = '11px sans-serif'
            ctx.fillText(c.name, sx + 6, sy - 6)
        }
    }
}
