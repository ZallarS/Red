import { TILE_SIZE } from './map.js'
import { camera } from './camera.js'

export function drawGrid(ctx, canvas) {
    ctx.strokeStyle = '#222'

    const startX = -camera.x % TILE_SIZE
    const startY = -camera.y % TILE_SIZE

    for (let x = startX; x < canvas.width; x += TILE_SIZE) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
    }

    for (let y = startY; y < canvas.height; y += TILE_SIZE) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
    }
}
