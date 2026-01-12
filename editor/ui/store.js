const listeners = new Set()

const state = {
    tool: 'draw',
    grid: true,
    snapping: true,

    users: [],
    userId: null,
    role: 'viewer',

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

    Object.assign(state, patch)

    // Логируем важные изменения
    if (patch.role !== undefined && patch.role !== oldRole) {
        console.log('🎭 Роль изменена:', { from: oldRole, to: patch.role })
    }

    if (patch.userId !== undefined && patch.userId !== oldUserId) {
        console.log('🆔 ID пользователя изменено:', { from: oldUserId, to: patch.userId })
    }

    // Уведомляем слушателей
    listeners.forEach(fn => {
        try {
            fn(state)
        } catch (e) {
            console.error('❌ Ошибка прослушивания хранилища:', e)
        }
    })
}

export function subscribe(fn) {
    listeners.add(fn)
    fn(state) // Немедленно вызываем с текущим состоянием
    return () => listeners.delete(fn)
}