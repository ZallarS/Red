import { TILE_SIZE, getTile } from './map.js'
import { camera } from './camera.js'

export function render(ctx, canvas) {
    // ===== RESET =====
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ===== CAMERA TRANSFORM =====
    ctx.setTransform(
        camera.zoom,
        0,
        0,
        camera.zoom,
        -camera.x * camera.zoom,
        -camera.y * camera.zoom
    )

    ctx.fillStyle = '#444'

    // ===== VISIBLE AREA (WORLD) =====
    const startX = Math.floor(camera.x / TILE_SIZE)
    const startY = Math.floor(camera.y / TILE_SIZE)

    const endX = Math.ceil((camera.x + canvas.width / camera.zoom) / TILE_SIZE)
    const endY = Math.ceil((camera.y + canvas.height / camera.zoom) / TILE_SIZE)

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
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
