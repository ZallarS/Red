import { screenToWorld } from './camera.js'
import { TILE_SIZE } from './map.js'
import { createSetTileAction, applyAction } from './actions.js'
import { push } from './history.js'
import { getNetworkManager, WS_PROTOCOL } from './network.js'
import { ACTION } from './config.js'

/**
 * ===== TOOL IMPLEMENTATIONS =====
 */

function createBrushTool(getState) {
    const painted = new Set()
    const actions = []
    let lastCell = null

    // Получаем сетевой менеджер
    const networkManager = getNetworkManager()

    // Функция для расчета расстояния между точками
    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    }

    function paintAt(pos, worldPos, useLine = false) {
        const { tool, snapping } = getState()

        // ВАЖНО: Используем Math.floor для абсолютных координат
        let x, y

        if (snapping) {
            // При привязке - округляем к центру ячейки
            x = Math.floor((worldPos.x + TILE_SIZE / 2) / TILE_SIZE)
            y = Math.floor((worldPos.y + TILE_SIZE / 2) / TILE_SIZE)
        } else {
            // Без привязки - используем точное положение курсора
            x = Math.floor(worldPos.x / TILE_SIZE)
            y = Math.floor(worldPos.y / TILE_SIZE)
        }

        const key = `${x},${y}`

        // Если уже рисовали в этой ячейке в текущем сеансе, пропускаем
        if (painted.has(key)) return

        painted.add(key)

        const tile = tool === 'erase' ? 0 : 1
        const action = createSetTileAction(x, y, tile)
        if (!action) return

        // ВАЖНО: Логируем координаты для отладки
        console.log(`🎨 Рисуем в ячейке: (${x}, ${y}), мировые координаты: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)})`)

        applyAction(action)
        actions.push(action)

        return { x, y }
    }

    // Функция для рисования линии между двумя ячейками (алгоритм Брезенхэма)
    function drawLine(x0, y0, x1, y1, paintFn) {
        const dx = Math.abs(x1 - x0)
        const dy = Math.abs(y1 - y0)
        const sx = (x0 < x1) ? 1 : -1
        const sy = (y0 < y1) ? 1 : -1
        let err = dx - dy

        // Рисуем первую точку
        paintFn(x0, y0)

        // Если начальная и конечная точки совпадают, выходим
        if (x0 === x1 && y0 === y1) return

        while (x0 !== x1 || y0 !== y1) {
            const e2 = 2 * err
            if (e2 > -dy) {
                err -= dy
                x0 += sx
            }
            if (e2 < dx) {
                err += dx
                y0 += sy
            }
            paintFn(x0, y0)
        }
    }

    return {
        begin(ctx) {
            painted.clear()
            actions.length = 0
            lastCell = null

            const cell = paintAt(ctx.event, ctx.world)
            if (cell) {
                lastCell = cell
            }
        },

        move(ctx) {
            if (!ctx.event) return

            const currentCell = paintAt(ctx.event, ctx.world, false)

            // Если есть предыдущая ячейка и мы переместились, рисуем линию между ними
            if (currentCell && lastCell &&
                (currentCell.x !== lastCell.x || currentCell.y !== lastCell.y)) {

                // Используем алгоритм Брезенхэма для плавного рисования линии
                const from = lastCell
                const to = currentCell

                const dx = Math.abs(to.x - from.x)
                const dy = Math.abs(to.y - from.y)
                const sx = from.x < to.x ? 1 : -1
                const sy = from.y < to.y ? 1 : -1
                let err = dx - dy

                let currentX = from.x
                let currentY = from.y

                // Уже закрасили начальную и конечную точки, поэтому пропускаем их
                while (!(currentX === to.x && currentY === to.y)) {
                    const e2 = 2 * err

                    if (e2 > -dy) {
                        err -= dy
                        currentX += sx
                    }

                    if (e2 < dx) {
                        err += dx
                        currentY += sy
                    }

                    // Закрашиваем промежуточную ячейку
                    if (!(currentX === from.x && currentY === from.y) &&
                        !(currentX === to.x && currentY === to.y)) {
                        const key = `${currentX},${currentY}`
                        if (!painted.has(key)) {
                            painted.add(key)
                            const tile = getState().tool === 'erase' ? 0 : 1
                            const action = createSetTileAction(currentX, currentY, tile)
                            if (action) {
                                applyAction(action)
                                actions.push(action)
                            }
                        }
                    }
                }

                lastCell = currentCell
            } else if (currentCell) {
                lastCell = currentCell
            }
        },

        end(ctx) {
            if (!actions.length) return

            const brush = {
                type: ACTION.BRUSH,
                actions: [...actions]
            }

            push(brush)

            if (ctx.ready && networkManager.getStatus() === 'online') {
                // ВАЖНО: Логируем отправляемые координаты
                console.log('📤 Отправляем действие:', brush.actions.map(a => `(${a.x}, ${a.y})`))

                networkManager.send({
                    type: WS_PROTOCOL.ACTION,
                    action: brush
                })
            }

            lastCell = null
        }
    }
}

/**
 * ===== DRAWING CONTROLLER =====
 */

export function initDrawing(canvas, getState) {
    let ready = false
    let myId = null
    let activeTool = null
    let drawing = false
    let lastMousePos = null
    let mouseMoved = false

    const brushTool = createBrushTool(getState)
    const networkManager = getNetworkManager()

    function setReady(v) {
        ready = v
    }

    function setMyId(id) {
        myId = id
        console.log('Рисование: ID пользователя установлено:', id)
    }

    function sendCursor(e) {
        if (!myId || networkManager.getStatus() !== 'online') return

        const r = canvas.getBoundingClientRect()

        // ВАЖНО: Отправляем мировые координаты курсора
        const worldPos = screenToWorld(
            e.clientX - r.left,
            e.clientY - r.top
        )

        networkManager.send({
            type: WS_PROTOCOL.CURSOR,
            x: worldPos.x,
            y: worldPos.y,
            painting: drawing
        })
    }

    function getContext(e) {
        const rect = canvas.getBoundingClientRect()
        const world = screenToWorld(
            e.clientX - rect.left,
            e.clientY - rect.top
        )

        return {
            event: e,
            world,
            ready,
            myId
        }
    }

    // ===== INPUT HANDLERS =====

    function handleMouseDown(e) {
        if (e.button !== 0 || e.ctrlKey) return

        drawing = true
        activeTool = brushTool
        mouseMoved = false
        lastMousePos = { x: e.clientX, y: e.clientY }

        // Добавляем класс для изменения курсора
        canvas.classList.add('drawing-active')

        activeTool.begin(getContext(e))
        sendCursor(e)

        // Предотвращаем выделение текста
        e.preventDefault()
    }

    function handleMouseMove(e) {
        if (!drawing || !activeTool) {
            sendCursor(e)
            return
        }

        // Проверяем, действительно ли мышь переместилась
        if (lastMousePos) {
            const dx = e.clientX - lastMousePos.x
            const dy = e.clientY - lastMousePos.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            // Рисуем только если мышь переместилась достаточно
            if (distance > 2) {
                mouseMoved = true
                lastMousePos = { x: e.clientX, y: e.clientY }
                activeTool.move(getContext(e))
            }
        } else {
            mouseMoved = true
            lastMousePos = { x: e.clientX, y: e.clientY }
            activeTool.move(getContext(e))
        }

        sendCursor(e)

        // Предотвращаем выделение текста при рисовании
        if (drawing) {
            e.preventDefault()
        }
    }

    function handleMouseUp(e) {
        if (!drawing || !activeTool) return

        drawing = false
        activeTool.end({ ready })
        activeTool = null

        // Убираем класс для изменения курсора
        canvas.classList.remove('drawing-active')

        lastMousePos = null
        mouseMoved = false

        sendCursor(e)
    }

    // ===== EVENT LISTENERS =====

    canvas.addEventListener('mousedown', handleMouseDown)

    canvas.addEventListener('mousemove', handleMouseMove)

    window.addEventListener('mouseup', handleMouseUp)

    // Предотвращаем контекстное меню на холсте
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        return false
    })

    // Обработка выхода курсора за пределы холста
    canvas.addEventListener('mouseleave', () => {
        if (drawing && activeTool) {
            // Завершаем рисование при выходе курсора за пределы холста
            handleMouseUp(new MouseEvent('mouseup'))
        }
    })

    return {
        setReady,
        setMyId,

        // Добавляем функцию для очистки
        cleanup: () => {
            canvas.removeEventListener('mousedown', handleMouseDown)
            canvas.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            canvas.removeEventListener('contextmenu', () => {})
            canvas.removeEventListener('mouseleave', () => {})

            // Убираем классы
            canvas.classList.remove('drawing-active')

            drawing = false
            activeTool = null
            lastMousePos = null
            mouseMoved = false
        }
    }
}