// editor/input.js

import { camera, setZoom } from './camera.js'

let isPanning = false
let lastX = 0
let lastY = 0

export function initInput(canvas) {
    // ===== MOUSE DOWN =====
    canvas.addEventListener('mousedown', e => {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            isPanning = true
            lastX = e.clientX
            lastY = e.clientY
            canvas.style.cursor = 'grabbing'
        }
    })

    // ===== MOUSE MOVE =====
    window.addEventListener('mousemove', e => {
        if (!isPanning) return

        const dx = e.clientX - lastX
        const dy = e.clientY - lastY

        lastX = e.clientX
        lastY = e.clientY

        camera.x -= dx / camera.zoom
        camera.y -= dy / camera.zoom
    })

    // ===== MOUSE UP =====
    window.addEventListener('mouseup', () => {
        if (!isPanning) return
        isPanning = false
        canvas.style.cursor = 'default'
    })

    // ===== WHEEL ZOOM =====
    canvas.addEventListener(
        'wheel',
        e => {
            e.preventDefault()

            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9

            const rect = canvas.getBoundingClientRect()
            const mouseX = e.clientX - rect.left
            const mouseY = e.clientY - rect.top

            // ✅ ВАЖНО:
            // зум меняется ТОЛЬКО через setZoom()
            setZoom(camera.zoom * zoomFactor, mouseX, mouseY)
        },
        { passive: false }
    )
}
