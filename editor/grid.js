// editor/grid.js

import { TILE_SIZE } from './map.js'
import { camera } from './camera.js'

// ===== FADE CONFIG =====
const FADE_START = 1.0   // zoom, где grid полностью видим
const FADE_END = 0.5    // zoom, где grid полностью исчезает

function smoothstep(t) {
    return t * t * (3 - 2 * t)
}

function getGridAlpha(zoom) {
    if (zoom >= FADE_START) return 1
    if (zoom <= FADE_END) return 0

    const t = (zoom - FADE_END) / (FADE_START - FADE_END)
    return smoothstep(t)
}

export function drawGrid(ctx, canvas) {
    const zoom = camera.zoom
    const alpha = getGridAlpha(zoom)

    if (alpha <= 0) return

    // ===== WORLD SPACE =====
    ctx.setTransform(
        zoom,
        0,
        0,
        zoom,
        -camera.x * zoom,
        -camera.y * zoom
    )

    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1 / zoom   // ❗ чтобы толщина не менялась при zoom

    const startX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE
    const startY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE

    const endX = camera.x + canvas.width / zoom
    const endY = camera.y + canvas.height / zoom

    ctx.beginPath()

    // vertical lines
    for (let x = startX; x <= endX; x += TILE_SIZE) {
        ctx.moveTo(x, startY)
        ctx.lineTo(x, endY)
    }

    // horizontal lines
    for (let y = startY; y <= endY; y += TILE_SIZE) {
        ctx.moveTo(startX, y)
        ctx.lineTo(endX, y)
    }

    ctx.stroke()

    // ===== RESET =====
    ctx.globalAlpha = 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
}
