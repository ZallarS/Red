const listeners = new Set()

const state = {
    tool: 'draw',
    // Убраны grid и snapping, так как они теперь управляются через настройки комнаты

    users: [],
    userId: null,
    role: 'viewer',

    // Новое поле для настроек комнаты
    roomSettings: null,

    panels: {
        left: {
            open: true,
            active: 'tools'
        },
        right: {
            open: true,
            active: 'users'
        }
    },

    debug: {
        showPerformance: true,
        showNetwork: true,
        showSystem: true
    }
}

export function getState() {
    return state
}

export function setState(patch) {
    const oldRole = state.role
    const oldUserId = state.userId
    const oldRoomSettings = state.roomSettings

    // Глубокое обновление panels если нужно
    if (patch.panels) {
        if (patch.panels.left) {
            state.panels.left = { ...state.panels.left, ...patch.panels.left }
        }
        if (patch.panels.right) {
            state.panels.right = { ...state.panels.right, ...patch.panels.right }
        }
        delete patch.panels
    }

    // Если в patch есть roomSettings, обновляем grid и snapping
    if (patch.roomSettings !== undefined) {
        // Применяем настройки сетки и привязки если они заданы в настройках комнаты
        if (patch.roomSettings?.gridEnabled !== undefined) {
            state.grid = patch.roomSettings.gridEnabled
        } else {
            // Если в настройках комнаты не указано, используем значение по умолчанию true
            state.grid = true
        }

        if (patch.roomSettings?.snapEnabled !== undefined) {
            state.snapping = patch.roomSettings.snapEnabled
        } else {
            // Если в настройках комнаты не указано, используем значение по умолчанию true
            state.snapping = true
        }
    }

    Object.assign(state, patch)

    // Логируем важные изменения
    if (patch.role !== undefined && patch.role !== oldRole) {
        console.log('🎭 Роль изменена:', { from: oldRole, to: patch.role })
    }

    if (patch.userId !== undefined && patch.userId !== oldUserId) {
        console.log('🆔 ID пользователя изменено:', { from: oldUserId, to: patch.userId })
    }

    if (patch.roomSettings !== undefined && patch.roomSettings !== oldRoomSettings) {
        console.log('⚙️ Настройки комнаты обновлены:', patch.roomSettings)

        // Применяем настройки сетки и привязки если они изменились
        if (patch.roomSettings?.gridEnabled !== undefined) {
            state.grid = patch.roomSettings.gridEnabled
        }

        if (patch.roomSettings?.snapEnabled !== undefined) {
            state.snapping = patch.roomSettings.snapEnabled
        }
    }

    // Уведомляем слушателей с защитой от ошибок
    listeners.forEach(fn => {
        try {
            // Проверяем, что функция все еще существует
            if (typeof fn === 'function') {
                fn(state)
            } else {
                // Удаляем недействительные слушатели
                listeners.delete(fn)
            }
        } catch (e) {
            console.error('❌ Ошибка прослушивания хранилища:', e)
            console.error('Стек ошибки:', e.stack)

            // Удаляем проблемного слушателя, чтобы не блокировать остальных
            try {
                listeners.delete(fn)
            } catch (deleteError) {
                console.error('❌ Не удалось удалить проблемного слушателя:', deleteError)
            }
        }
    })
}

export function subscribe(fn) {
    listeners.add(fn)
    fn(state) // Немедленно вызываем с текущим состоянием
    return () => listeners.delete(fn)
}