import { render } from './render.js'
import { drawGrid } from './grid.js'
import { camera } from './camera.js'
import { loadMap } from './map.js'

import { initUI, cleanupUI } from './ui/ui.js'
import { subscribe, getState, setState } from './ui/store.js'

import { getNetworkManager, WS_PROTOCOL } from './network.js'

import { createDebugOverlay } from './debug.js'
import { initDrawing } from './drawing.js'
import { applyAction } from './actions.js'
import { initInput } from './input.js'
import { loadSettingsToUI } from './roomSettings.js'

const CAMERA_KEY_PREFIX = 'editor-camera-room-'

export function initEditor(snapshot) {
    const { roomId, role, map, userId, settings } = snapshot

    console.log('🎮 Initializing editor:', { roomId, role, userId, settings })

    const users = new Map()
    const cursors = new Map()
    const softLocks = new Map()

    const SOFT_LOCK_RADIUS = 48
    const SOFT_LOCK_TTL = 500

    let uiState = getState()
    let animationFrameId = null
    let softLockInterval = null
    let uiCleanupFunction = null

    const CAMERA_KEY = CAMERA_KEY_PREFIX + roomId

    // Получаем сетевой менеджер
    const networkManager = getNetworkManager()

    function restoreCamera() {
        try {
            const c = JSON.parse(localStorage.getItem(CAMERA_KEY))
            if (c) Object.assign(camera, c)
            console.log('📷 Камера восстановлена')
        } catch (e) {
            console.warn('⚠️ Не удалось восстановить камеру:', e.message)
        }
    }

    function saveCamera() {
        localStorage.setItem(CAMERA_KEY, JSON.stringify(camera))
    }

    // ===== CANVAS =====
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.tabIndex = 0
    canvas.focus()

    console.log('🎨 Canvas инициализирован')

    restoreCamera()

    // ===== INPUT =====
    const inputCleanup = initInput(canvas)
    console.log('🖱️ Система ввода инициализирована')

    if (window.__canvasverse_uiInitialized) {
        console.log('⚠️ UI уже инициализирован, очищаем перед повторной инициализацией')
        cleanupUI()
    }

    // ===== UI =====
    uiCleanupFunction = initUI()
    window.__canvasverse_uiInitialized = true
    console.log('🎨 Пользовательский интерфейс инициализирован')

    // ===== НАСТРОЙКИ КОМНАТЫ =====
    if (settings) {
        loadSettingsToUI(settings)
    }

    // Устанавливаем начальные значения
    setState({
        userId: userId,
        role: role,
        users: [],
        roomSettings: settings || null,
        roomId: roomId // ВАЖНО: Добавляем roomId в состояние
    })

    console.log(`👤 Пользователь ${userId?.substring(0, 8)} вошёл с ролью ${role}`)

    // ===== DEBUG =====
    const debug = createDebugOverlay()
    debug.init()

    // Горячая клавиша для дебага (Shift+D)
    const debugKeyHandler = (e) => {
        if (e.shiftKey && e.key === 'D') debug.toggle()
    }
    window.addEventListener('keydown', debugKeyHandler)

    // ===== DRAWING =====
    const drawing = initDrawing(canvas, () => uiState)
    drawing.setReady(true)
    drawing.setMyId(userId)
    console.log('✏️ Система рисования инициализирована')

    // ===== MAP =====
    loadMap(map)
    const tileCount = Object.keys(map || {}).length
    console.log('🗺️ Карта загружена:', { tiles: tileCount, roomId })

    // ===== WS EVENTS =====
    const messageHandler = msg => {
        switch (msg.type) {
            case 'room-users': {
                console.log('👥 Received room-users:', msg.users.length)

                // Обновляем глобальный список пользователей
                const newUsers = new Map()
                msg.users.forEach(u => newUsers.set(u.id, u))
                users.clear()
                newUsers.forEach((v, k) => users.set(k, v))

                // Находим себя в списке и обновляем роль
                const currentUserId = getState().userId
                const meInList = msg.users.find(u => u.id === currentUserId)
                if (meInList && meInList.role !== getState().role) {
                    console.log(`🔄 Моя роль изменилась на "${meInList.role}"`)
                    setState({ role: meInList.role })
                }

                // Обновляем список пользователей в UI
                setState({ users: [...newUsers.values()] })
                break
            }

            case 'role-set-response':
                console.log(`📥 Ответ на смену роли:`, msg)
                if (!msg.success) {
                    alert(msg.error || 'Ошибка смены роли')
                }
                break;

            case WS_PROTOCOL.ACTION:
                console.log('🎯 Получено действие от', msg.senderId || 'unknown', ':',
                    msg.action.actions?.map(a => `(${a.x}, ${a.y})`) || `(${msg.action.x}, ${msg.action.y})`)
                applyAction(msg.action)
                break

            case WS_PROTOCOL.CURSOR:
                // ВАЖНО: Нормализуем координаты курсора для правильного отображения
                const normalizedX = msg.x || 0
                const normalizedY = msg.y || 0

                cursors.set(msg.id, {
                    x: normalizedX,
                    y: normalizedY,
                    color: msg.color,
                    name: msg.name,
                    t: msg.t || Date.now()
                })
                break

            case 'room-settings-changed':
                console.log('⚙️ Настройки комнаты обновлены:', msg.settings)
                loadSettingsToUI(msg.settings)
                setState({ roomSettings: msg.settings })
                break

            case WS_PROTOCOL.ERROR:
                console.error(`❌ Ошибка сервера: ${msg.message}`)
                break
        }
    }

    networkManager.on('message', messageHandler)

    // ===== CLEANUP SOFT LOCKS =====
    softLockInterval = setInterval(() => {
        const now = performance.now()
        for (const [id, lock] of softLocks) {
            if (now - lock.t > SOFT_LOCK_TTL) {
                softLocks.delete(id)
            }
        }
    }, 250)

    // ===== RENDER LOOP =====
    function loop() {
        render(ctx, canvas, cursors, softLocks)

        // Проверяем настройки комнаты для включения сетки
        const currentSettings = getState().roomSettings
        if (currentSettings?.gridEnabled !== false) {
            drawGrid(ctx, canvas)
        }

        // Обновляем состояние из store
        uiState = getState()

        debug.update(null, uiState, users.size)
        saveCamera()
        animationFrameId = requestAnimationFrame(loop)
    }

    console.log('🔄 Запущен цикл рендеринга')
    loop()

    // ===== CLEANUP FUNCTION =====
    function cleanup() {
        console.log('🧹 Очистка редактора...')

        if (uiCleanupFunction) {
            uiCleanupFunction()
            uiCleanupFunction = null
        }

        window.__canvasverse_uiInitialized = false

        if (messageHandler) networkManager.off('message', messageHandler)
        if (animationFrameId) cancelAnimationFrame(animationFrameId)
        if (softLockInterval) clearInterval(softLockInterval)

        window.removeEventListener('keydown', debugKeyHandler)

        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        if (inputCleanup && typeof inputCleanup === 'function') {
            inputCleanup()
        }

        // Сбрасываем состояние store
        try {
            setState({
                tool: 'draw',
                grid: true,
                snapping: true,
                users: [],
                userId: null,
                role: 'viewer',
                roomSettings: null,
                roomId: null, // ВАЖНО: Сбрасываем roomId
                panels: {
                    left: { open: true, active: 'tools' },
                    right: { open: true, active: 'users' }
                },
                debug: getState().debug
            })
            console.log('🔄 Состояние store сброшено')
        } catch (e) {
            console.error('❌ Ошибка при сбросе store:', e)
        }

        // Скрываем дебаг панель
        const debugPanel = document.getElementById('debug-overlay')
        if (debugPanel) debugPanel.style.display = 'none'

        console.log('✅ Очистка редактора завершена')
    }

    // Возвращаем объект для управления
    return {
        toggleDebug: () => debug.toggle(),
        getDebugStats: () => ({
            users: users.size,
            roomId
        }),
        cleanup
    }
}