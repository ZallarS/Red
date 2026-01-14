import { getState, setState } from './ui/store.js'
import { getNetworkManager } from './network.js' // Изменён импорт

// Константы настроек комнаты
export const ROOM_SETTINGS = {
    PUBLIC: 'public',
    PRIVATE: 'private',
    PASSWORD: 'password-protected'
}

export const ROOM_SETTINGS_META = {
    [ROOM_SETTINGS.PUBLIC]: {
        label: 'Публичная',
        icon: '🌐',
        description: 'Любой может присоединиться'
    },
    [ROOM_SETTINGS.PRIVATE]: {
        label: 'Приватная',
        icon: '🔒',
        description: 'Только по приглашению'
    },
    [ROOM_SETTINGS.PASSWORD]: {
        label: 'С паролем',
        icon: '🔑',
        description: 'Требуется пароль'
    }
}

// Инициализация настроек комнаты
export function initRoomSettings() {
    return {
        name: 'Новая комната',
        description: '',
        visibility: ROOM_SETTINGS.PUBLIC,
        password: '',
        maxUsers: 20,
        allowGuests: true,
        gridEnabled: true,
        snapEnabled: true,
        defaultRole: 'viewer',
        createdAt: Date.now(),
        owner: null,
        ownerName: null
    }
}

// Сохранение настроек на сервер
export function saveRoomSettings(settings) {
    const networkManager = getNetworkManager() // Используем сетевой менеджер
    if (networkManager.getStatus() !== 'online') {
        console.error('❌ Нет соединения для сохранения настроек')
        return false
    }

    const currentRoomId = window.CanvasVerse?.getCurrentRoom?.()
    if (!currentRoomId) {
        console.error('❌ Неизвестная комната для сохранения настроек')
        return false
    }

    console.log('💾 Сохранение настроек комнаты:', settings)

    networkManager.send({
        type: 'room-settings-update',
        roomId: currentRoomId,
        settings: settings
    })

    return true
}

// Загрузка настроек в UI
export function loadSettingsToUI(settings) {
    if (!settings) return

    console.log('📥 Загрузка настроек в UI:', settings)

    // Обновляем состояние хранилища
    setState({
        roomSettings: settings,
        grid: settings.gridEnabled !== false,
        snapping: settings.snapEnabled !== false
    })

    // Применяем настройки к интерфейсу
    updateUIFromSettings(settings)
}

// Обновление UI на основе настроек
function updateUIFromSettings(settings) {
    // Обновляем заголовок страницы
    document.title = `${settings.name} - CanvasVerse`

    // Применяем сетку если нужно
    const gridBtn = document.querySelector('[data-tool="grid"]')
    if (gridBtn) {
        gridBtn.classList.toggle('active', settings.gridEnabled)
    }

    // Применяем привязку если нужно
    const snapBtn = document.querySelector('[data-tool="snapping"]')
    if (snapBtn) {
        snapBtn.classList.toggle('active', settings.snapEnabled)
    }
}

// Проверка прав на изменение настроек
export function canEditSettings(userRole) {
    return userRole === 'owner' || userRole === 'admin'
}

// Форматирование настроек для отображения
export function formatSettingsForDisplay(settings) {
    if (!settings) return {}

    return {
        name: settings.name || 'Без названия',
        description: settings.description || 'Без описания',
        visibility: ROOM_SETTINGS_META[settings.visibility]?.label || 'Неизвестно',
        users: `${settings.currentUsers || 0}/${settings.maxUsers || 20}`,
        createdAt: new Date(settings.createdAt).toLocaleDateString('ru-RU'),
        isPasswordProtected: settings.visibility === ROOM_SETTINGS.PASSWORD,
        gridEnabled: settings.gridEnabled,
        snapEnabled: settings.snapEnabled
    }
}

// Валидация настроек
export function validateSettings(settings) {
    const errors = []

    if (!settings.name || settings.name.trim().length < 2) {
        errors.push('Название комнаты должно быть не менее 2 символов')
    }

    if (settings.name && settings.name.trim().length > 50) {
        errors.push('Название комнаты не должно превышать 50 символов')
    }

    if (settings.description && settings.description.length > 200) {
        errors.push('Описание не должно превышать 200 символов')
    }

    if (settings.maxUsers < 1 || settings.maxUsers > 100) {
        errors.push('Количество пользователей должно быть от 1 до 100')
    }

    if (settings.visibility === ROOM_SETTINGS.PASSWORD && !settings.password) {
        errors.push('Для комнаты с паролем требуется установить пароль')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}