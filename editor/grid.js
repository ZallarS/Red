import { TILE_SIZE } from './map.js'
import { camera } from './camera.js'

export function drawGrid(ctx, canvas) {
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1 / camera.zoom

    const startX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE
    const startY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE

    const endX = camera.x + canvas.width / camera.zoom
    const endY = camera.y + canvas.height / camera.zoom

    for (let x = startX; x <= endX; x += TILE_SIZE) {
        ctx.beginPath()
        ctx.moveTo(x, startY)
        ctx.lineTo(x, endY)
        ctx.stroke()
    }

    for (let y = startY; y <= endY; y += TILE_SIZE) {
        ctx.beginPath()
        ctx.moveTo(startX, y)
        ctx.lineTo(endX, y)
        ctx.stroke()
    }
}
