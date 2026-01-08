// editor/grid.js

import { TILE_SIZE } from './map.js'
import { camera } from './camera.js'

// ===== GRID CACHE =====
let gridCanvas = null
let gridCtx = null
let lastZoom = null

// ===== FADE CONFIG =====
const FADE_START = 1.0   // zoom, где grid полностью видим
const FADE_END = 0.5     // zoom, где grid полностью исчезает

function smoothstep(t) {
    return t * t * (3 - 2 * t)
}

function getGridAlpha(zoom) {
    if (zoom >= FADE_START) return 1
    if (zoom <= FADE_END) return 0

    const t = (zoom - FADE_END) / (FADE_START - FADE_END)
    return smoothstep(t)
}

function rebuildGrid(canvas) {
    const zoom = camera.zoom

    gridCanvas = document.createElement('canvas')
    gridCanvas.width = canvas.width
    gridCanvas.height = canvas.height
    gridCtx = gridCanvas.getContext('2d')

    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height)

    gridCtx.strokeStyle = '#222'
    gridCtx.lineWidth = 1

    const step = TILE_SIZE * zoom
    if (step < 4) return

    const offsetX = (-camera.x * zoom) % step
    const offsetY = (-camera.y * zoom) % step

    gridCtx.beginPath()

    // vertical lines
    for (let x = offsetX; x < gridCanvas.width; x += step) {
        gridCtx.moveTo(x, 0)
        gridCtx.lineTo(x, gridCanvas.height)
    }

    // horizontal lines
    for (let y = offsetY; y < gridCanvas.height; y += step) {
        gridCtx.moveTo(0, y)
        gridCtx.lineTo(gridCanvas.width, y)
    }

    gridCtx.stroke()
}

export function drawGrid(ctx, canvas) {
    const zoom = camera.zoom
    const alpha = getGridAlpha(zoom)

    // grid полностью скрыт
    if (alpha <= 0) return

    // пересобираем ТОЛЬКО при изменении zoom
    if (!gridCanvas || lastZoom !== zoom) {
        lastZoom = zoom
        rebuildGrid(canvas)
    }

    if (!gridCanvas) return

    // overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = alpha
    ctx.drawImage(gridCanvas, 0, 0)
    ctx.globalAlpha = 1
}
