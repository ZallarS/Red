// editor/camera.js

export const camera = {
    x: 0,
    y: 0,
    zoom: 1
}

// ===== ZOOM LIMITS =====
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4

export function setZoom(value, centerX = null, centerY = null) {
    const prevZoom = camera.zoom
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

    if (nextZoom === prevZoom) return

    // zoom относительно точки (если задана)
    if (centerX !== null && centerY !== null) {
        const worldX = camera.x + centerX / prevZoom
        const worldY = camera.y + centerY / prevZoom

        camera.x = worldX - centerX / nextZoom
        camera.y = worldY - centerY / nextZoom
    }

    camera.zoom = nextZoom
}

export function moveCamera(dx, dy) {
    camera.x += dx / camera.zoom
    camera.y += dy / camera.zoom
}

export function screenToWorld(x, y) {
    return {
        x: camera.x + x / camera.zoom,
        y: camera.y + y / camera.zoom
    }
}
