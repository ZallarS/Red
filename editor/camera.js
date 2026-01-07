export const camera = { x: 0, y: 0 }

export function screenToWorld(x, y) {
    return { x: x + camera.x, y: y + camera.y }
}
