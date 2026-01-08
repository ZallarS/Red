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

export function render(ctx, canvas, cursors = new Map(), softLocks = new Map()) {
    // ===== RESET =====
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ===== WORLD (MAP) =====
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

    // ===== OVERLAY (SCREEN SPACE) =====
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // --- SOFT-LOCK ZONES ---
    for (const lock of softLocks.values()) {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = lock.color
        ctx.beginPath()
        ctx.arc(lock.x, lock.y, lock.radius, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 0.6
        ctx.strokeStyle = lock.color
        ctx.setLineDash([6, 4])
        ctx.stroke()

        ctx.setLineDash([])
        ctx.globalAlpha = 1

        if (lock.name) {
            ctx.font = '11px sans-serif'
            ctx.fillStyle = lock.color
            ctx.fillText(lock.name, lock.x + lock.radius + 6, lock.y)
        }
    }

    // --- CURSORS ---
    for (const c of cursors.values()) {
        ctx.fillStyle = c.color
        ctx.beginPath()
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2)
        ctx.fill()

        if (c.name) {
            ctx.font = '11px sans-serif'
            ctx.fillText(c.name, c.x + 6, c.y - 6)
        }
    }
}
