// Единый источник истины для WebSocket-протокола

export const WS = {
    // ===== AUTH / SESSION =====
    AUTH: 'auth',
    HELLO: 'hello',

    // ===== SNAPSHOT =====
    SNAPSHOT: 'snapshot',

    // ===== USERS =====
    USERS: 'users',
    CURSOR: 'cursor',
    CURSOR_LEAVE: 'cursor-leave',

    // ===== ACTIONS =====
    ACTION: 'action',

    // ===== SAVE =====
    SAVING: 'saving',
    SAVED: 'saved',

    // ===== STATS =====
    SERVER_STATS: 'server-stats',

    // ===== PING =====
    PING: 'ping',
    PONG: 'pong',
    LATENCY: 'latency',

    // ===== ROLES (NEW) =====
    ROLE_SET: 'role-set'
}

export const ACTION = {
    SET_TILE: 'setTile',
    BRUSH: 'brush'
}
