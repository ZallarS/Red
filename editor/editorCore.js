import { render } from './render.js'
import { drawGrid } from './grid.js'
import { camera } from './camera.js'
import { loadMap } from './map.js'

import { initUI, cleanupUI } from './ui/ui.js'
import { subscribe, getState, setState } from './ui/store.js'
import { addEvent } from './ui/store.js'

import { on,off } from './ws.js'
import { WS } from './protocol.js'

import { createDebugOverlay } from './debug.js'
import { initDrawing } from './drawing.js'
import { applyAction } from './actions.js'
import { initInput } from './input.js'

import { setUsers } from './ui/modules/usersPanel.js'

const CAMERA_KEY_PREFIX = 'editor-camera-room-'

// 🔥 Экспортируем функцию как named export
export function initEditor(snapshot) {
    const { roomId, role, map, userId } = snapshot

    console.log('🎮 Initializing editor:', { roomId, role, userId })
    addEvent('system', `Редактор инициализирован`, { roomId, role, userId })

    const users = new Map()
    const cursors = new Map()
    const softLocks = new Map()

    const SOFT_LOCK_RADIUS = 48
    const SOFT_LOCK_TTL = 500

    let uiState = getState()
    let unsubscribeStore = null
    let animationFrameId = null
    let softLockInterval = null
    let uiCleanupFunction = null

    const CAMERA_KEY = CAMERA_KEY_PREFIX + roomId

    function restoreCamera() {
        try {
            const c = JSON.parse(localStorage.getItem(CAMERA_KEY))
            if (c) Object.assign(camera, c)
            addEvent('system', `Камера восстановлена`, camera)
        } catch (e) {
            addEvent('system', 'Не удалось восстановить камеру', { error: e.message })
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

    addEvent('system', 'Canvas инициализирован', { width: canvas.width, height: canvas.height })

    restoreCamera()

    // ===== INPUT =====
    const inputCleanup = initInput(canvas)
    addEvent('system', 'Система ввода инициализирована')

    if (window.__canvasverse_uiInitialized) {
        console.log('⚠️ UI уже инициализирован, очищаем перед повторной инициализацией')
        cleanupUI()
    }

    // ===== UI =====
    uiCleanupFunction = initUI()
    window.__canvasverse_uiInitialized = true
    addEvent('system', 'Пользовательский интерфейс инициализирован')

    // 🔥 КРИТИЧНО: Устанавливаем начальные значения в правильном порядке
    setState({
        userId: userId,
        role: role,
        users: []
    })

    addEvent('user', `Пользователь ${userId?.substring(0, 8)} вошёл с ролью ${role}`)

    console.log('✅ Store initialized with:', {
        userId: getState().userId,
        role: getState().role
    })

    // ===== DEBUG =====
    const debug = createDebugOverlay()
    debug.init()

    // Добавляем горячую клавишу для дебага (Shift+D)
    const debugKeyHandler = (e) => {
        if (e.shiftKey && e.key === 'D') {
            debug.toggle()
        }
    }
    window.addEventListener('keydown', debugKeyHandler)

    // Также добавляем клавишу ESC для сброса позиции дебаг-панели
    const escapeKeyHandler = (e) => {
        if (e.key === 'Escape' && debug.isEnabled()) {
            const debugPanel = document.querySelector('#debug-overlay')
            if (debugPanel) {
                debugPanel.style.left = '8px'
                debugPanel.style.top = '8px'
                debugPanel.style.position = 'fixed'
                localStorage.removeItem('debug-panel-position')
            }
        }
    }
    window.addEventListener('keydown', escapeKeyHandler)

    // ===== DRAWING =====
    const drawing = initDrawing(canvas, () => uiState)
    drawing.setReady(true)
    drawing.setMyId(userId)
    addEvent('system', 'Система рисования инициализирована')

    // ===== MAP =====
    loadMap(map)
    const tileCount = Object.keys(map || {}).length
    addEvent('system', `Карта загружена`, { tiles: tileCount, roomId })

    // ===== WS EVENTS =====
    const messageHandler = msg => {
        switch (msg.type) {

            /**
             * =====================================================
             * USERS / ROLES - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
             * =====================================================
             */
            case 'room-users': {
                console.log('👥 Received room-users:', msg.users.map(u => ({ id: u.id, role: u.role })))
                addEvent('users', `Обновлён список пользователей: ${msg.users.length} пользователей`, {
                    users: msg.users.map(u => ({ id: u.id.substring(0, 8), name: u.name, role: u.role }))
                })

                // 🔥 Получаем текущий userId из store
                const currentUserId = getState().userId
                console.log('👤 Текущий ID пользователя из хранилища:', currentUserId)
                console.log('🎭 Текущая роль в хранилище:', getState().role)

                // Обновляем глобальный список пользователей
                const newUsers = new Map()
                msg.users.forEach(u => newUsers.set(u.id, u))
                users.clear()
                newUsers.forEach((v, k) => users.set(k, v))

                // 🔥 Обновляем UI состояние (список пользователей)
                setUsers(newUsers)

                // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Находим СЕБЯ в списке и ОБНОВЛЯЕМ РОЛЬ
                const meInList = msg.users.find(u => u.id === currentUserId)
                if (meInList) {
                    console.log('✅ Нашел себя в списке пользователей:', {
                        myId: currentUserId,
                        myCurrentRole: getState().role,
                        myNewRole: meInList.role,
                        shouldUpdate: meInList.role !== getState().role
                    })

                    // 🔥 ВСЕГДА обновляем роль, даже если кажется, что она не изменилась
                    // Это нужно, потому что при входе в комнату мы можем получить устаревшую роль
                    if (meInList.role !== getState().role) {
                        console.log(`🔄 Моя роль изменилась с "${getState().role}" на "${meInList.role}"`)
                        setState({ role: meInList.role })
                        addEvent('user', `Моя роль изменена на "${meInList.role}"`)
                    } else {
                        console.log(`⚡ Моя роль уже определена как "${meInList.role}", принудительное обновление UI`)
                        // 🔥 Даже если роль не изменилась, заставляем UI обновиться
                        setState({ role: meInList.role })
                    }
                } else {
                    console.error('❌ КРИТИЧНО: не удалось найти себя в списке пользователей!', {
                        myId: currentUserId,
                        users: msg.users.map(u => ({ id: u.id, role: u.role }))
                    })
                    addEvent('error', 'Не удалось найти себя в списке пользователей', {
                        myId: currentUserId,
                        usersCount: msg.users.length
                    })
                }
                break
            }

            /**
             * =====================================================
             * ACTIONS
             * =====================================================
             */
            case WS.ACTION:
            case 'action':
                addEvent('action', `Получено действие: ${msg.action.type}`, {
                    actionType: msg.action.type,
                    actionsCount: msg.action.actions?.length || 1
                })
                applyAction(msg.action)
                break

            /**
             * =====================================================
             * CURSOR
             * =====================================================
             */
            case WS.CURSOR:
            case 'cursor':
                cursors.set(msg.id, {
                    x: msg.x,
                    y: msg.y,
                    color: msg.color,
                    name: msg.name,
                    t: msg.t || Date.now()
                })

                if (msg.painting) {
                    softLocks.set(msg.id, {
                        x: msg.x,
                        y: msg.y,
                        radius: SOFT_LOCK_RADIUS,
                        color: msg.color,
                        name: msg.name,
                        t: performance.now()
                    })
                    addEvent('action', `Пользователь ${msg.name} рисует`, {
                        userId: msg.id?.substring(0, 8),
                        position: { x: msg.x, y: msg.y }
                    })
                }
                break

            /**
             * =====================================================
             * ROLE SET RESPONSE
             * =====================================================
             */
            case 'role-set-response':
                console.log('✅ Ответ на набор ролей:', msg)
                if (msg.success) {
                    addEvent('user', `Роль пользователя ${msg.targetUserId?.substring(0, 8)} изменена на "${msg.role}"`)
                } else {
                    addEvent('error', `Ошибка изменения роли: ${msg.error}`, {
                        targetUserId: msg.targetUserId,
                        requestedRole: msg.role
                    })
                }
                break

            /**
             * =====================================================
             * ROOM LEFT (НОВОЕ)
             * =====================================================
             */
            case 'room-left':
                addEvent('system', `Вышел из комнаты ${msg.roomId}`)
                break

            /**
             * =====================================================
             * PING/PONG
             * =====================================================
             */
            case 'pong':
                addEvent('network', `Pong получен`, { latency: Date.now() - msg.t })
                break

            /**
             * =====================================================
             * ERROR
             * =====================================================
             */
            case 'error':
                addEvent('error', `Ошибка сервера: ${msg.message}`, msg)
                break

            /**
             * =====================================================
             * SAVE EVENTS
             * =====================================================
             */
            case 'saving':
                addEvent('system', `Сохранение карты: ${msg.mode}`)
                break

            case 'saved':
                addEvent('system', `Карта сохранена: ${msg.mode}`)
                break
        }
    }

    // Подписываемся на сообщения
    on('message', messageHandler)

    // ===== CLEANUP SOFT LOCKS =====
    softLockInterval = setInterval(() => {
        const now = performance.now()
        let removed = 0
        for (const [id, lock] of softLocks) {
            if (now - lock.t > SOFT_LOCK_TTL) {
                softLocks.delete(id)
                removed++
            }
        }
        if (removed > 0) {
            addEvent('action', `Удалено ${removed} мягких блокировок`)
        }
    }, 250)

    // ===== RENDER LOOP =====
    function loop() {
        render(ctx, canvas, cursors, softLocks)
        if (uiState.grid) drawGrid(ctx, canvas)

        debug.update(null, uiState, users.size)
        saveCamera()

        animationFrameId = requestAnimationFrame(loop)
    }

    // Запускаем цикл рендеринга
    addEvent('system', 'Запущен цикл рендеринга')
    loop()

    // 🔥 ФУНКЦИЯ ОЧИСТКИ
    function cleanup() {
        console.log('🧹 Очистка редактора...')

        if (uiCleanupFunction) {
            uiCleanupFunction()
            uiCleanupFunction = null
        }

        if (window.__canvasverse_uiInitialized) {
            window.__canvasverse_uiInitialized = false
        }

        if (messageHandler) {
            off('message', messageHandler)
            console.log('📡 Отписаны от WebSocket сообщений')
        }

        // Останавливаем рендер-луп
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            console.log('⏹️ Остановлен рендер-луп')
        }

        // Останавливаем интервал
        if (softLockInterval) {
            clearInterval(softLockInterval)
            console.log('⏹️ Остановлен интервал мягких блокировок')
        }

        // Отписываемся от store
        if (unsubscribeStore) {
            unsubscribeStore()
            console.log('🔇 Отписаны от store')
        }

        // Удаляем обработчики клавиш
        window.removeEventListener('keydown', debugKeyHandler)
        window.removeEventListener('keydown', escapeKeyHandler)
        console.log('⌨️ Удалены обработчики клавиш')

        // Очищаем canvas
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            console.log('🧽 Canvas очищен')
        }

        // Вызываем очистку input
        if (inputCleanup && typeof inputCleanup === 'function') {
            inputCleanup()
            console.log('🖱️ Очищена система ввода')
        }

        // Очищаем WebSocket обработчики (нужно добавить off в ws.js)
        // Пока что просто очищаем наш обработчик

        // Очищаем состояние store (только если мы владелец)
        try {
            setState({
                tool: 'draw',
                grid: true,
                snapping: true,
                users: [],
                userId: null,
                role: 'viewer',
                panels: {
                    left: { open: true, active: 'tools' },
                    right: { open: true, active: 'users' }
                },
                debug: {
                    ...getState().debug,
                    events: [] // 🔥 Очищаем события
                }
            })
            console.log('🔄 Состояние store сброшено')
        } catch (e) {
            console.error('❌ Ошибка при сбросе store:', e)
        }

        // Скрываем дебаг панель
        const debugPanel = document.getElementById('debug-overlay')
        if (debugPanel) {
            debugPanel.style.display = 'none'
        }

        addEvent('system', 'Редактор остановлен')
        console.log('✅ Очистка редактора завершена')
    }

    // Возвращаем объект для управления
    return {
        addEvent,
        toggleDebug: () => debug.toggle(),
        getDebugStats: () => ({
            users: users.size,
            cursors: cursors.size,
            softLocks: softLocks.size,
            roomId
        }),
        cleanup
    }

    // Возвращаем объект для управления
    return {
        addEvent,
        toggleDebug: () => debug.toggle(),
        getDebugStats: () => ({
            users: users.size,
            cursors: cursors.size,
            softLocks: softLocks.size,
            roomId
        }),
        cleanup // 🔥 Добавляем функцию очистки
    }
}

// Глобальный доступ к дебагу
window.editorDebug = {
    addEvent,
    log: (category, message, data) => addEvent(category, message, data),
    toggleOverlay: () => {
        const debug = createDebugOverlay()
        debug.toggle()
    }
}