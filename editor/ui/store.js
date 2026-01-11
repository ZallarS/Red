const listeners = new Set()

const state = {
    tool: 'draw',
    grid: true,
    snapping: true,

    users: [],        // ✅ ДОБАВЛЕНО
    userId: null,     // ✅ ДОБАВЛЕНО
    role: 'viewer',   // ✅ ДОБАВЛЕНО

    panels: {
        left: {
            open: true,
            active: 'tools'
        },
        right: {
            open: true,
            active: 'users'
        }
    }
}

export function getState() {
    return state
}

export function setState(patch) {
    // 🔥 Логируем ВСЕ изменения состояния, особенно роль
    const oldRole = state.role
    const oldUserId = state.userId

    if (patch.panels) {
        state.panels = {
            ...state.panels,
            ...patch.panels
        }
        delete patch.panels
    }

    Object.assign(state, patch)

    // 🔥 Логируем изменение роли
    if (patch.role !== undefined && patch.role !== oldRole) {
        console.log('🎭 ROLE CHANGED:', {
            from: oldRole,
            to: patch.role,
            userId: state.userId
        })
    }

    // 🔥 Логируем изменение userId
    if (patch.userId !== undefined && patch.userId !== oldUserId) {
        console.log('🆔 USER ID CHANGED:', {
            from: oldUserId,
            to: patch.userId
        })
    }

    // 🔥 Уведомляем всех слушателей
    listeners.forEach(fn => {
        try {
            fn(state)
        } catch (e) {
            console.error('❌ Store listener error:', e)
        }
    })
}

export function subscribe(fn) {
    listeners.add(fn)
    // 🔥 Немедленно вызываем с текущим состоянием
    fn(state)
    return () => listeners.delete(fn)
}