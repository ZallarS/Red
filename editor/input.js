import { camera } from './camera.js'

let dragging = false
let lastX = 0
let lastY = 0
let spacePressed = false

export function initInput(canvas) {

    window.addEventListener('keydown', e => {
        if (e.code === 'Space') spacePressed = true
    })

    window.addEventListener('keyup', e => {
        if (e.code === 'Space') spacePressed = false
    })

    canvas.addEventListener('mousedown', e => {
        if (e.button === 1 || spacePressed) {
            dragging = true
            lastX = e.clientX
            lastY = e.clientY
        }
    })

    window.addEventListener('mouseup', () => dragging = false)

    canvas.addEventListener('mousemove', e => {
        if (!dragging) return

        camera.x -= (e.clientX - lastX) / camera.zoom
        camera.y -= (e.clientY - lastY) / camera.zoom

        lastX = e.clientX
        lastY = e.clientY
    })

    canvas.addEventListener('wheel', e => {
        camera.zoom *= e.deltaY > 0 ? 0.9 : 1.1
        camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4)
    })
}
