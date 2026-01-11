import { render } from './render.js'
import { drawGrid } from './grid.js'
import { camera } from './camera.js'
import { loadMap } from './map.js'

import { initUI } from './ui/ui.js'
import { subscribe, getState, setState } from './ui/store.js'

import { on } from './ws.js'
import { WS } from './protocol.js'

import { createDebugOverlay } from './debug.js'
import { initDrawing } from './drawing.js'
import { applyAction } from './actions.js'
import { initInput } from './input.js'

import { setUsers } from './ui/modules/usersPanel.js'

const CAMERA_KEY_PREFIX = 'editor-camera-room-'

export function initEditor(snapshot) {
    const { roomId, role, map, userId } = snapshot

    console.log('🎮 Initializing editor:', { roomId, role, userId })

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
        } catch {}
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

    restoreCamera()

    // ===== INPUT =====
    initInput(canvas)

    // ===== UI =====
    initUI()

    // 🔥 КРИТИЧНО: Устанавливаем начальные значения в правильном порядке
    setState({
        userId: userId,
        role: role,
        users: []
    })

    console.log('✅ Store initialized with:', {
        userId: getState().userId,
        role: getState().role
    })

    // ===== DEBUG =====
    const debug = createDebugOverlay()
    debug.init()

    // ===== DRAWING =====
    const drawing = initDrawing(canvas, () => uiState)
    drawing.setReady(true)
    drawing.setMyId(userId)

    // ===== MAP =====
    loadMap(map)

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
                }
                break

            /**
             * =====================================================
             * ROLE SET RESPONSE
             * =====================================================
             */
            case 'role-set-response':
                console.log('✅ Ответ на набор ролей:', msg)
                break
        }
    })

    // ===== CLEANUP SOFT LOCKS =====
    setInterval(() => {
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
        if (uiState.grid) drawGrid(ctx, canvas)

        debug.update(null, uiState, users.size)
        saveCamera()

        requestAnimationFrame(loop)
    }

    loop()
}