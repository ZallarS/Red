// Утилиты для проекта CanvasVerse

import { COLORS, ROLE_META } from './constants.js'

/**
 * Генерация цвета на основе строки (для пользователей)
 */
export function generateColorFromString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`
}

/**
 * Форматирование времени
 */
export function formatTime(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

/**
 * Форматирование времени в читаемый вид
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
        return `${hours}ч ${minutes % 60}м`
    }
    if (minutes > 0) {
        return `${minutes}м ${seconds % 60}с`
    }
    return `${seconds}с`
}

/**
 * Форматирование размера в байтах
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Обрезка текста с добавлением многоточия
 */
export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

/**
 * Безопасный парсинг JSON
 */
export function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str)
    } catch (e) {
        return defaultValue
    }
}

/**
 * Генерация уникального ID
 */
export function generateId(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * Дебаунс функция
 */
export function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

/**
 * Троттлинг функция
 */
export function throttle(func, limit) {
    let inThrottle
    return function() {
        const args = arguments
        const context = this
        if (!inThrottle) {
            func.apply(context, args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

/**
 * Проверка прав пользователя
 */
export function checkPermission(userRole, permission) {
    const roleMeta = ROLE_META[userRole]
    if (!roleMeta) return false

    switch (permission) {
        case 'edit':
            return roleMeta.canEdit
        case 'manageUsers':
            return roleMeta.canManageUsers
        case 'save':
            return roleMeta.canSave
        case 'changeSettings':
            return roleMeta.canChangeSettings
        case 'isImmune':
            return roleMeta.isImmune
        case 'changeOwnerRole':
            return roleMeta.canChangeOwnerRole
        default:
            return false
    }
}

/**
 * Клонирование объекта с глубоким копированием
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj.getTime())
    if (obj instanceof Array) return obj.reduce((arr, item, i) => {
        arr[i] = deepClone(item)
        return arr
    }, [])
    if (typeof obj === 'object') return Object.keys(obj).reduce((newObj, key) => {
        newObj[key] = deepClone(obj[key])
        return newObj
    }, {})
    return obj
}

/**
 * Сравнение двух объектов
 */
export function objectsEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
}

/**
 * Обработка ошибок с логированием
 */
export function handleError(error, context = '') {
    console.error(`❌ Ошибка ${context}:`, error)
    return {
        success: false,
        error: error.message,
        context
    }
}