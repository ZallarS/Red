import { camera } from './camera.js'

let dragging = false
let last = { x: 0, y: 0 }

export function initInput(canvas) {
    canvas.addEventListener('mousedown', e => {
        if (e.button === 1 || e.spaceKey) {
            dragging = true
            last.x = e.clientX
            last.y = e.clientY
        }
    })

    canvas.addEventListener('mouseup', () => dragging = false)

    canvas.addEventListener('mousemove', e => {
        if (!dragging) return

        camera.x -= (e.clientX - last.x) / camera.zoom
        camera.y -= (e.clientY - last.y) / camera.zoom

        last.x = e.clientX
        last.y = e.clientY
    })

    canvas.addEventListener('wheel', e => {
        camera.zoom *= e.deltaY > 0 ? 0.9 : 1.1
        camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4)
    })
}
