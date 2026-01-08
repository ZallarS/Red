import { TILE_SIZE, getTile } from './map.js'

export function render(ctx, canvas) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#444'

    const cols = Math.ceil(canvas.width / TILE_SIZE)
    const rows = Math.ceil(canvas.height / TILE_SIZE)

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const tile = getTile(x, y)
            if (!tile) continue

            ctx.fillRect(
                x * TILE_SIZE,
                y * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
            )
        }
    }
}
