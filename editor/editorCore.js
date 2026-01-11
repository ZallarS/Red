import { render } from './render.js'
import { drawGrid } from './grid.js'
import { camera } from './camera.js'
import { loadMap } from './map.js'

import { initUI } from './ui/ui.js'
import { subscribe, getState, setState } from './ui/store.js'
import { addEvent } from './ui/store.js'

import { on } from './ws.js'
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
    subscribe(s => (uiState = s))

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
    initInput(canvas)
    addEvent('system', 'Система ввода инициализирована')

    // ===== UI =====
    initUI()
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
    window.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key === 'D') {
            debug.toggle()
        }
    })

    // Также добавляем клавишу ESC для сброса позиции дебаг-панели
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && debug.isEnabled()) {
            const debugPanel = document.querySelector('#debug-overlay')
            if (debugPanel) {
                debugPanel.style.left = '8px'
                debugPanel.style.top = '8px'
                debugPanel.style.position = 'fixed'
                localStorage.removeItem('debug-panel-position')
            }
        }
    })

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
    on('message', msg => {
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

                    // 🔥 ОБНОВЛЯЕМ СПИСОК ПОЛЬЗОВАТЕЛЕЙ ПОСЛЕ ИЗМЕНЕНИЯ РОЛИ
                    // Запрашиваем актуальный список пользователей
                    setTimeout(() => {
                        console.log('🔄 Запрашиваем обновленный список пользователей после изменения роли')
                        // Здесь можно отправить запрос на сервер для получения обновленного списка
                        // или обновить локально, если сервер не отправил автоматически
                    }, 100)
                } else {
                    addEvent('error', `Ошибка изменения роли: ${msg.error}`, {
                        targetUserId: msg.targetUserId,
                        requestedRole: msg.role
                    })
                }
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

            /**
             * =====================================================
             * USER JOINED/LEFT EVENTS (ДОБАВЛЕНО)
             * =====================================================
             */
            case 'user-joined':
                addEvent('users', `Пользователь ${msg.userId?.substring(0, 8)} присоединился`, {
                    userId: msg.userId,
                    name: msg.name
                })
                break

            case 'user-left':
                addEvent('users', `Пользователь ${msg.userId?.substring(0, 8)} покинул комнату`, {
                    userId: msg.userId,
                    name: msg.name
                })
                break
        }
    })

    // ===== CLEANUP SOFT LOCKS =====
    const softLockInterval = setInterval(() => {
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
    let animationFrameId = null
    let lastRenderTime = 0
    const targetFPS = 60
    const frameInterval = 1000 / targetFPS

    function loop(currentTime) {
        animationFrameId = requestAnimationFrame(loop)

        // Ограничение FPS
        const delta = currentTime - lastRenderTime
        if (delta < frameInterval) return

        lastRenderTime = currentTime - (delta % frameInterval)

        render(ctx, canvas, cursors, softLocks)
        if (uiState.grid) drawGrid(ctx, canvas)

        debug.update(null, uiState, users.size)
        saveCamera()
    }

    // Запускаем цикл рендеринга
    addEvent('system', 'Запущен цикл рендеринга')
    loop()

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
        cleanup: () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
            }
            clearInterval(softLockInterval)
            addEvent('system', 'Редактор остановлен')
        }
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