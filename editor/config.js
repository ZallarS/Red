// config.js
// ================================
// КОНФИГУРАЦИЯ ПРОЕКТА CANVASVERSE
// ================================

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
    owner: '#ff6b35',
    admin: '#e0b400',
    editor: '#4a9eff',
    viewer: '#888',
    // Новые цвета для статусов
    online: '#20c997',
    offline: '#888',
    away: '#ffc107',
    idle: '#ffc107'
}

// Статусы пользователей
export const USER_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    AWAY: 'away',
    IDLE: 'idle'
}

// Метаданные статусов
export const STATUS_META = {
    online: {
        label: 'В сети',
        icon: '🟢',
        color: COLORS.online,
        description: 'Пользователь активен'
    },
    offline: {
        label: 'Не в сети',
        icon: '⚫',
        color: COLORS.offline,
        description: 'Пользователь вышел'
    },
    away: {
        label: 'Отошёл',
        icon: '🟡',
        color: COLORS.away,
        description: 'Пользователь неактивен'
    },
    idle: {
        label: 'Неактивен',
        icon: '🟠',
        color: COLORS.idle,
        description: 'Бездействует'
    }
}

// Роли пользователей
export const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    EDITOR: 'editor',
    VIEWER: 'viewer'
}

// Метаданные ролей
export const ROLE_META = {
    owner: {
        label: 'Владелец',
        icon: '👑',
        color: COLORS.owner,
        canEdit: true,
        canManageUsers: true,
        canSave: true,
        canChangeSettings: true,
        isImmune: true,
        canChangeOwnerRole: false
    },
    admin: {
        label: 'Админ',
        icon: '⭐',
        color: COLORS.admin,
        canEdit: true,
        canManageUsers: true,
        canSave: true,
        canChangeSettings: true,
        isImmune: false,
        canChangeOwnerRole: false
    },
    editor: {
        label: 'Редактор',
        icon: '✏️',
        color: COLORS.editor,
        canEdit: true,
        canManageUsers: false,
        canSave: false,
        canChangeSettings: false,
        isImmune: false,
        canChangeOwnerRole: false
    },
    viewer: {
        label: 'Наблюдатель',
        icon: '👁',
        color: COLORS.viewer,
        canEdit: false,
        canManageUsers: false,
        canSave: false,
        canChangeSettings: false,
        isImmune: false,
        canChangeOwnerRole: false
    }
}

// Инструменты редактора
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
    RECONNECTING: 'reconnecting'
}

// Лимиты системы
export const LIMITS = {
    MAX_EVENTS: 50,
    MAX_USERS_PER_ROOM: 50,
    MAX_TILES: 10000,
    AUTO_SAVE_DELAY: 3000,
    MAX_ROOM_NAME_LENGTH: 50,
    MAX_ROOM_DESCRIPTION_LENGTH: 200,
    MIN_PASSWORD_LENGTH: 4,
    USER_IDLE_TIMEOUT: 30000, // 30 секунд неактивности
    USER_AWAY_TIMEOUT: 300000 // 5 минут неактивности
}

// Горячие клавиши
export const HOTKEYS = {
    TOGGLE_DEBUG: { key: 'D', shift: true },
    RESET_DEBUG_POSITION: { key: 'Escape' },
    UNDO: { key: 'Z', ctrl: true },
    REDO: { key: 'Y', ctrl: true },
    SAVE: { key: 'S', ctrl: true },
    TOGGLE_GRID: { key: 'G' },
    TOGGLE_SNAPPING: { key: 'S', shift: true },
    EXIT_LOBBY: { key: 'Escape' }
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
    ERROR_SAVING: 'Ошибка при сохранении',
    OWNER_IMMUNE: 'Нельзя изменить роль владельца',
    ROOM_FULL: 'Комната заполнена',
    INCORRECT_PASSWORD: 'Неверный пароль',
    ROOM_PRIVATE: 'Эта комната приватная',
    USER_WENT_OFFLINE: ' вышел из комнаты',
    USER_CAME_ONLINE: ' вернулся в комнату',
    USER_IS_AWAY: ' отошёл',
    USER_IS_IDLE: ' неактивен'
}

// Конфигурация WebSocket
export const WS_CONFIG = {
    URL: 'wss://lib31.ru/ws',
    RECONNECT_INTERVAL: 3000,
    MAX_RECONNECT_ATTEMPTS: 5,
    PING_INTERVAL: 2000,
    CONNECTION_TIMEOUT: 15000,
    USER_ACTIVITY_CHECK_INTERVAL: 5000 // Проверка активности каждые 5 секунд
}

// Конфигурация панелей
export const PANEL_CONFIG = {
    WIDTH: 320,
    MIN_WIDTH: 280,
    MAX_WIDTH: 400,
    TOGGLE_WIDTH: 20,
    ANIMATION_DURATION: 200
}

// Конфигурация камеры
export const CAMERA_CONFIG = {
    SMOOTHNESS: 0.1,
    MAX_SPEED: 10,
    ZOOM_SENSITIVITY: 0.001
}

// Конфигурация сетки
export const GRID_CONFIG = {
    FADE_START: 1.0,
    FADE_END: 0.5,
    COLOR: '#222',
    LINE_WIDTH: 1
}

// Конфигурация рисования
export const DRAWING_CONFIG = {
    SOFT_LOCK_RADIUS: 48,
    SOFT_LOCK_TTL: 500,
    CURSOR_SIZE: 4,
    LINE_SMOOTHING: true
}

// Конфигурация комнат
export const ROOM_CONFIG = {
    DEFAULT_SETTINGS: {
        name: 'Новая комната',
        description: '',
        visibility: 'public',
        password: '',
        maxUsers: 20,
        allowGuests: true,
        gridEnabled: true,
        snapEnabled: true,
        defaultRole: 'viewer',
        showUserStatus: true,
        showLastSeen: true
    },
    VISIBILITY_OPTIONS: {
        public: { label: 'Публичная', icon: '🌐', description: 'Любой может присоединиться' },
        private: { label: 'Приватная', icon: '🔒', description: 'Только по приглашению' },
        'password-protected': { label: 'С паролем', icon: '🔑', description: 'Требуется пароль' }
    }
}

// Конфигурация отладки
export const DEBUG_CONFIG = {
    ENABLED_BY_DEFAULT: false,
    UPDATE_INTERVAL: 1000,
    SHOW_PERFORMANCE: true,
    SHOW_NETWORK: true,
    SHOW_SYSTEM: true,
    SHOW_USER_STATUS: true
}