import { map, TILE_SIZE } from './map.js'
import { camera } from './camera.js'

export function render(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const [key] of map.tiles) {
        const [x, y] = key.split(',').map(Number)
        const sx = x * TILE_SIZE - camera.x
        const sy = y * TILE_SIZE - camera.y

        ctx.fillStyle = '#4caf50'
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE)
    }
}
