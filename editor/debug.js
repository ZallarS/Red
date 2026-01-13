import { getNetworkManager } from './network.js'

export function createDebugOverlay(getData) {
    let enabled = localStorage.getItem('debug-overlay') === '1'
    let el = null
    let statsEl = null

    let fps = 0
    let frames = 0
    let lastTime = performance.now()
    let performanceStats = {
        minFPS: 60,
        maxFPS: 0,
        avgFPS: 0,
        frameCount: 0,
        totalFPS: 0
    }

    const networkManager = getNetworkManager()

    function formatTime(ms) {
        const s = Math.floor(ms / 1000)
        const m = Math.floor(s / 60)
        const h = Math.floor(m / 60)
        if (h > 0) return `${h}h ${m % 60}m`
        if (m > 0) return `${m}m ${s % 60}s`
        return `${s}s`
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    function init() {
        el = document.createElement('div')
        Object.assign(el.style, {
            position: 'fixed',
            top: '8px',
            left: '8px',
            padding: '10px',
            background: 'rgba(0,0,0,0.9)',
            color: '#0f0',
            font: '11px "JetBrains Mono", "Cascadia Code", monospace',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'pre',
            display: enabled ? 'block' : 'none',
            border: '1px solid #0f0',
            borderRadius: '6px',
            maxWidth: '350px',
            maxHeight: '400px',
            overflow: 'hidden',
            backdropFilter: 'blur(2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        })

        // Статистика производительности
        statsEl = document.createElement('div')
        statsEl.style.marginTop = '10px'
        statsEl.style.paddingTop = '10px'
        statsEl.style.borderTop = '1px solid #333'
        statsEl.style.color = '#0af'
        statsEl.style.fontSize = '10px'

        document.body.appendChild(el)
        el.appendChild(statsEl)

        if (enabled) {
            console.log('🔧 Дебаг-режим включен')
        }

        // Слушаем изменение размера левой панели для корректировки позиции
        window.addEventListener('resize', updateDebugPosition)
        updateDebugPosition()
    }

    function updateDebugPosition() {
        if (!el || !enabled) return

        // Получаем состояние левой панели
        const leftPanel = document.querySelector('[style*="left: 0"]')
        const leftPanelOpen = leftPanel && getComputedStyle(leftPanel).display !== 'none'

        // Если левая панель открыта (280px), сдвигаем дебаг-панель
        if (leftPanelOpen) {
            el.style.left = '300px'
        } else {
            el.style.left = '8px'
        }

        // Также проверяем ширину экрана
        const screenWidth = window.innerWidth
        if (screenWidth < 768) {
            el.style.maxWidth = 'calc(100vw - 20px)'
            el.style.fontSize = '9px'
        } else {
            el.style.maxWidth = '350px'
            el.style.fontSize = '11px'
        }
    }

    function updatePerformanceStats() {
        performanceStats.frameCount++
        performanceStats.totalFPS += fps
        performanceStats.avgFPS = performanceStats.totalFPS / performanceStats.frameCount

        if (fps < performanceStats.minFPS) performanceStats.minFPS = fps
        if (fps > performanceStats.maxFPS) performanceStats.maxFPS = fps
    }

    function update(serverStats, uiState, usersCount) {
        if (!enabled || !el) return

        frames++
        const currentTime = performance.now()
        if (currentTime - lastTime >= 1000) {
            fps = frames
            frames = 0
            lastTime = currentTime
            updatePerformanceStats()
        }

        // Основная информация
        let text =
            `╔════════════════════════════════╗
║        CANVASVERSE DEBUG       ║
╠════════════════════════════════╣
║ FPS:    ${fps.toString().padStart(3)} (${performanceStats.minFPS}-${performanceStats.maxFPS})
║ Avg:    ${Math.round(performanceStats.avgFPS).toString().padStart(3)}
╠════════════════════════════════╣
║ WS:     ${networkManager.getStatus().padEnd(15)} 
║ RTT:    ${(networkManager.getPing() ?? '-').toString().padStart(4)}ms
╠════════════════════════════════╣
║ Инструмент: ${(uiState?.tool || 'N/A').padEnd(8)}
║ Пользоват.: ${(usersCount || 0).toString().padStart(3)}
║ Сетка:     ${uiState?.grid ? 'ВКЛ' : 'ВЫКЛ'}
║ Привязка:  ${uiState?.snapping ? 'ВКЛ' : 'ВЫКЛ'}
╠════════════════════════════════╣`

        // Информация о роли и панелях
        if (uiState?.debug?.showSystem) {
            const activePanel = uiState?.panels?.right?.active || 'users'

            text += `
║ Роль:      ${uiState?.role?.padEnd(8)}
║ ID:        ${uiState?.userId ? uiState.userId.substring(0, 8) + '...' : 'N/A'.padEnd(11)}
║ Панель:    Пользователи`

            // Состояние панелей
            const leftPanel = uiState?.panels?.left
            const rightPanel = uiState?.panels?.right
            if (leftPanel || rightPanel) {
                text += `
║ Панели:    ${leftPanel?.open ? '◀' : ' '} ${rightPanel?.open ? '▶' : ' '}`
            }
        }

        // Память
        if (uiState?.debug?.showPerformance && performance.memory) {
            const memory = performance.memory
            text += `
╠════════════════════════════════╣
║ Память:    ${formatBytes(memory.usedJSHeapSize).padEnd(10)}`
        }

        // Серверная статистика
        if (uiState?.debug?.showNetwork && serverStats) {
            text += `
╠════════════════════════════════╣
║ Сервер:
║  Uptime:   ${formatTime(serverStats.uptime)}
║  Клиентов: ${serverStats.clients.toString().padStart(3)}
║  АФК:      ${serverStats.afk.toString().padStart(3)}
║  Тайлов:   ${serverStats.tiles.toString().padStart(3)}`
        }

        text += '\n╚════════════════════════════════╝'

        el.textContent = text

        // Обновляем статистику
        const updateTime = new Date()
        statsEl.textContent = `Обновлено: ${updateTime.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })}`

        // Обновляем позицию при каждом кадре (на случай, если панели меняются)
        updateDebugPosition()
    }

    // Публичные методы для управления
    return {
        init,
        update,
        toggle: function() {
            enabled = !enabled
            localStorage.setItem('debug-overlay', enabled ? '1' : '0')
            if (el) {
                el.style.display = enabled ? 'block' : 'none'
                if (enabled) {
                    updateDebugPosition()
                    console.log('🔧 Дебаг-режим включен')
                } else {
                    console.log('🔧 Дебаг-режим выключен')
                }
            }
        },
        isEnabled: () => enabled,
        setPosition: function(left, top) {
            if (el) {
                el.style.left = left + 'px'
                el.style.top = top + 'px'
            }
        }
    }
}