// editor/render.js

import { camera } from './camera.js'
import {
    TILE_SIZE,
    CHUNK_SIZE,
    LOD_LEVELS,
    getVisibleChunks,
    redrawChunkLOD
} from './map.js'

// ===== LOD SELECTION =====
function getLOD(zoom) {
    if (zoom >= 1.0) return LOD_LEVELS.FULL
    if (zoom >= 0.6) return LOD_LEVELS.SIMPLE
    return LOD_LEVELS.DOT
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

    const chunks = getVisibleChunks(camera, canvas)
    for (const chunk of chunks) {
        redrawChunkLOD(chunk, lod)

        const entry = chunk.canvases.get(lod)
        if (!entry) continue

        ctx.drawImage(
            entry.canvas,
            chunk.cx * CHUNK_SIZE * TILE_SIZE,
            chunk.cy * CHUNK_SIZE * TILE_SIZE
        )
    }

    // ===== OVERLAY (SCREEN SPACE) =====
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // --- CURSORS ---
    for (const c of cursors.values()) {
        // ВАЖНО: Преобразуем мировые координаты курсора в экранные
        const screenX = (c.x - camera.x) * camera.zoom
        const screenY = (c.y - camera.y) * camera.zoom

        // Проверяем, находится ли курсор в пределах холста
        if (screenX >= -10 && screenX <= canvas.width + 10 &&
            screenY >= -10 && screenY <= canvas.height + 10) {

            ctx.fillStyle = c.color
            ctx.beginPath()
            ctx.arc(screenX, screenY, 6, 0, Math.PI * 2)
            ctx.fill()

            if (c.name) {
                ctx.font = '12px sans-serif'
                ctx.fillStyle = c.color
                ctx.fillText(c.name, screenX + 8, screenY - 8)
            }
        }
    }

    // --- SOFT-LOCK ZONES ---
    for (const lock of softLocks.values()) {
        // Преобразуем мировые координаты в экранные
        const screenX = (lock.x - camera.x) * camera.zoom
        const screenY = (lock.y - camera.y) * camera.zoom

        if (screenX >= -100 && screenX <= canvas.width + 100 &&
            screenY >= -100 && screenY <= canvas.height + 100) {

            ctx.globalAlpha = 0.15
            ctx.fillStyle = lock.color
            ctx.beginPath()
            ctx.arc(screenX, screenY, lock.radius, 0, Math.PI * 2)
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
                ctx.fillText(lock.name, screenX + lock.radius + 6, screenY)
            }
        }
    }
}