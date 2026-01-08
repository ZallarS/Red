// editor/render.js

import { camera } from './camera.js'
import {
    TILE_SIZE,
    CHUNK_SIZE,
    getVisibleChunks,
    redrawChunk
} from './map.js'

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

    // ===== MAP =====
    const chunks = getVisibleChunks(camera, canvas)
    for (const chunk of chunks) {
        redrawChunk(chunk)
        ctx.drawImage(
            chunk.canvas,
            chunk.cx * CHUNK_SIZE * TILE_SIZE,
            chunk.cy * CHUNK_SIZE * TILE_SIZE
        )
    }

    // ===== CURSORS (SCREEN SPACE) =====
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
