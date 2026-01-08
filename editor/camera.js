export const camera = {
    x: 0,
    y: 0,
    zoom: 1
}

export function screenToWorld(x, y) {
    return {
        x: x / camera.zoom + camera.x,
        y: y / camera.zoom + camera.y
    }
}
