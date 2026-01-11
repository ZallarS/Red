// editor/input.js

import { camera, setZoom } from './camera.js'

let isPanning = false
let lastX = 0
let lastY = 0

export function initInput(canvas) {
    // ===== MOUSE DOWN =====
    const mouseDownHandler = (e) => {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            isPanning = true
            lastX = e.clientX
            lastY = e.clientY
            canvas.style.cursor = 'grabbing'
        }
    }

    // ===== MOUSE MOVE =====
    const mouseMoveHandler = (e) => {
        if (!isPanning) return

        const dx = e.clientX - lastX
        const dy = e.clientY - lastY

        lastX = e.clientX
        lastY = e.clientY

        camera.x -= dx / camera.zoom
        camera.y -= dy / camera.zoom
    }

    // ===== MOUSE UP =====
    const mouseUpHandler = () => {
        if (!isPanning) return
        isPanning = false
        canvas.style.cursor = 'default'
    }

    // ===== WHEEL ZOOM =====
    const wheelHandler = (e) => {
        e.preventDefault()

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9

        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // ✅ ВАЖНО:
        // зум меняется ТОЛЬКО через setZoom()
        setZoom(camera.zoom * zoomFactor, mouseX, mouseY)
    }

    // Добавляем обработчики
    canvas.addEventListener('mousedown', mouseDownHandler)
    window.addEventListener('mousemove', mouseMoveHandler)
    window.addEventListener('mouseup', mouseUpHandler)
    canvas.addEventListener('wheel', wheelHandler, { passive: false })

    // 🔥 Возвращаем функцию очистки
    return () => {
        console.log('🧹 Очистка обработчиков ввода')
        canvas.removeEventListener('mousedown', mouseDownHandler)
        window.removeEventListener('mousemove', mouseMoveHandler)
        window.removeEventListener('mouseup', mouseUpHandler)
        canvas.removeEventListener('wheel', wheelHandler)
        canvas.style.cursor = 'default'
        isPanning = false
    }
}