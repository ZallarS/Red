import { camera } from './camera.js'

let dragging = false
let lastX = 0
let lastY = 0

let spacePressed = false
let ctrlPressed = false

export function initInput(canvas) {

    // ===== KEYS =====
    window.addEventListener('keydown', e => {
        if (e.code === 'Space') spacePressed = true
        if (e.key === 'Control') ctrlPressed = true
    })

    window.addEventListener('keyup', e => {
        if (e.code === 'Space') spacePressed = false
        if (e.key === 'Control') ctrlPressed = false
    })

    // ===== MOUSE DOWN =====
    canvas.addEventListener('mousedown', e => {
        // ТОЛЬКО:
        // Space + LMB
        // Ctrl + LMB
        if (
            e.button === 0 &&
            (spacePressed || ctrlPressed)
        ) {
            dragging = true
            lastX = e.clientX
            lastY = e.clientY

            canvas.style.cursor = 'grabbing'
            e.preventDefault()
        }
    })

    // ===== MOUSE UP =====
    window.addEventListener('mouseup', () => {
        if (!dragging) return
        dragging = false
        canvas.style.cursor = ''
    })

    // ===== MOUSE MOVE =====
    canvas.addEventListener('mousemove', e => {
        // hover cursor
        if (!dragging) {
            if (spacePressed || ctrlPressed) {
                canvas.style.cursor = 'grab'
            } else {
                canvas.style.cursor = ''
            }
            return
        }

        camera.x -= (e.clientX - lastX) / camera.zoom
        camera.y -= (e.clientY - lastY) / camera.zoom

        lastX = e.clientX
        lastY = e.clientY
    })

    // ===== ZOOM =====
    canvas.addEventListener('wheel', e => {
        camera.zoom *= e.deltaY > 0 ? 0.9 : 1.1
        camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4)
    })
}
