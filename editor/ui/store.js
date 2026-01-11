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
            active: 'users' // Начальная вкладка - пользователи
        }
    },

    // 🔥 НОВОЕ: Хранилище событий
    debug: {
        events: [],
        showEvents: false, // Теперь управляется через табы, а не отдельно
        eventsFilter: 'all',
        maxEvents: 50,
        showPerformance: true,
        showNetwork: true,
        showSystem: true
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
        // Глубокое обновление panels
        if (patch.panels.left) {
            state.panels.left = {
                ...state.panels.left,
                ...patch.panels.left
            }
        }
        if (patch.panels.right) {
            state.panels.right = {
                ...state.panels.right,
                ...patch.panels.right
            }
        }
        delete patch.panels
    }

    Object.assign(state, patch)

    // 🔥 Логируем изменение роли
    if (patch.role !== undefined && patch.role !== oldRole) {
        console.log('🎭 Роль изменена:', {
            from: oldRole,
            to: patch.role,
            userId: state.userId
        })
        // Добавляем событие в лог
        addEvent('system', `Роль пользователя ${state.userId?.substring(0, 8)} изменена с "${oldRole}" на "${patch.role}"`)
    }

    // 🔥 Логируем изменение userId
    if (patch.userId !== undefined && patch.userId !== oldUserId) {
        console.log('🆔 ID пользователя изменено:', {
            from: oldUserId,
            to: patch.userId
        })
        addEvent('system', `ID пользователя установлен: ${patch.userId?.substring(0, 8)}`)
    }

    // 🔥 Уведомляем всех слушателей
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
    // 🔥 Немедленно вызываем с текущим состоянием
    fn(state)
    return () => listeners.delete(fn)
}

// 🔥 НОВЫЕ ФУНКЦИИ ДЛЯ ЛОГИРОВАНИЯ СОБЫТИЙ
let eventIdCounter = 0

export function addEvent(category, message, data = null) {
    const event = {
        id: ++eventIdCounter,
        timestamp: Date.now(),
        category, // 'action', 'user', 'network', 'system', 'error'
        message,
        data
    }

    state.debug.events.unshift(event) // Добавляем в начало

    // Ограничиваем количество событий
    if (state.debug.events.length > state.debug.maxEvents) {
        state.debug.events.pop()
    }

    // Автоматически показываем важные события в консоли
    if (category === 'error') {
        console.error(`❌ ${message}`, data)
    } else if (category === 'system') {
        console.log(`🔧 ${message}`)
    }

    // Уведомляем слушателей о новом событии
    listeners.forEach(fn => {
        try {
            fn(state)
        } catch (e) {
            console.error('❌ Ошибка при уведомлении о событии:', e)
        }
    })
}

export function clearEvents() {
    state.debug.events = []
    listeners.forEach(fn => {
        try {
            fn(state)
        } catch (e) {
            console.error('❌ Ошибка при очистке событий:', e)
        }
    })
}

export function setEventsFilter(filter) {
    state.debug.eventsFilter = filter
    listeners.forEach(fn => {
        try {
            fn(state)
        } catch (e) {
            console.error('❌ Ошибка при смене фильтра:', e)
        }
    })
}
