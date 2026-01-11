// Константы проекта CanvasVerse

// Размеры и масштабирование
export const TILE_SIZE = 32
export const CHUNK_SIZE = 16
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4

// Цвета интерфейса
export const COLORS = {
    primary: '#4a9eff',
    primaryDark: '#3a8aef',
    background: '#0f0f0f',
    panelBackground: '#1a1a1a',
    border: '#222',
    text: '#fff',
    textSecondary: '#888',
    success: '#20c997',
    warning: '#ffc107',
    error: '#ff4757',
    admin: '#e0b400',
    editor: '#4a9eff',
    viewer: '#888'
}

// Роли пользователей
export const ROLES = {
    ADMIN: 'admin',
    EDITOR: 'editor',
    VIEWER: 'viewer'
}

// Метаданные ролей
export const ROLE_META = {
    admin: {
        label: 'Админ',
        icon: '👑',
        color: COLORS.admin,
        canEdit: true,
        canManageUsers: true,
        canSave: true
    },
    editor: {
        label: 'Редактор',
        icon: '✏️',
        color: COLORS.editor,
        canEdit: true,
        canManageUsers: false,
        canSave: false
    },
    viewer: {
        label: 'Наблюдатель',
        icon: '👁',
        color: COLORS.viewer,
        canEdit: false,
        canManageUsers: false,
        canSave: false
    }
}

// Инструменты
export const TOOLS = {
    DRAW: 'draw',
    ERASE: 'erase',
    SELECT: 'select',
    PAN: 'pan'
}

// Категории событий для лога
export const EVENT_CATEGORIES = {
    ACTION: 'action',
    USER: 'user',
    NETWORK: 'network',
    SYSTEM: 'system',
    ERROR: 'error'
}

// WebSocket статусы
export const WS_STATUS = {
    CONNECTING: 'connecting',
    ONLINE: 'online',
    OFFLINE: 'offline',
    RECONNECTING: 'Переподключение...'
}

// Лимиты
export const LIMITS = {
    MAX_EVENTS: 50,
    MAX_USERS_PER_ROOM: 50,
    MAX_TILES: 10000,
    AUTO_SAVE_DELAY: 3000 // 3 секунды
}

// Клавиши горячих клавиш
export const HOTKEYS = {
    TOGGLE_DEBUG: { key: 'D', shift: true },
    RESET_DEBUG_POSITION: { key: 'Escape' },
    UNDO: { key: 'Z', ctrl: true },
    REDO: { key: 'Y', ctrl: true },
    SAVE: { key: 'S', ctrl: true },
    TOGGLE_GRID: { key: 'G' },
    TOGGLE_SNAPPING: { key: 'S', shift: true }
}

// Сообщения для UI
export const MESSAGES = {
    ROOM_NOT_FOUND: 'Комната не найдена',
    CONNECTION_LOST: 'Соединение потеряно. Переподключение...',
    RECONNECTED: 'Соединение восстановлено',
    USER_KICKED: 'Вас исключили из комнаты',
    PERMISSION_DENIED: 'Недостаточно прав для выполнения действия',
    SAVING: 'Сохранение...',
    SAVED: 'Сохранено',
    ERROR_SAVING: 'Ошибка при сохранении'
}