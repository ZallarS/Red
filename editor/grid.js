// editor/grid.js

import { TILE_SIZE } from './map.js'
import { camera } from './camera.js'

// ===== GRID CACHE =====
let gridCanvas = null
let gridCtx = null
let lastZoom = null

function rebuildGrid(canvas) {
    const zoom = camera.zoom

    // создаём canvas под экран
    gridCanvas = document.createElement('canvas')
    gridCanvas.width = canvas.width
    gridCanvas.height = canvas.height
    gridCtx = gridCanvas.getContext('2d')

    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height)

    gridCtx.strokeStyle = '#222'
    gridCtx.lineWidth = 1

    const step = TILE_SIZE * zoom
    if (step < 4) return // слишком мелко — не рисуем

    const offsetX = (-camera.x * zoom) % step
    const offsetY = (-camera.y * zoom) % step

    gridCtx.beginPath()

    // vertical
    for (let x = offsetX; x < gridCanvas.width; x += step) {
        gridCtx.moveTo(x, 0)
        gridCtx.lineTo(x, gridCanvas.height)
    }

    // horizontal
    for (let y = offsetY; y < gridCanvas.height; y += step) {
        gridCtx.moveTo(0, y)
        gridCtx.lineTo(gridCanvas.width, y)
    }

    gridCtx.stroke()
}

export function drawGrid(ctx, canvas) {
    // перестраиваем ТОЛЬКО если zoom изменился
    if (!gridCanvas || lastZoom !== camera.zoom) {
        lastZoom = camera.zoom
        rebuildGrid(canvas)
    }

    if (!gridCanvas) return

    // рисуем как overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(gridCanvas, 0, 0)
}
