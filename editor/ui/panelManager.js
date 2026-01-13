// editor/ui/panelManager.js
import { getState, subscribe } from './store.js'

/**
 * Менеджер панелей - управляет всеми панелями в системе
 */
export class PanelManager {
    constructor() {
        this.panels = new Map()
        this.activePanels = new Map()
        this.unsubscribeFunctions = []
        this.initialized = false
    }

    /**
     * Инициализирует менеджер панелей
     */
    init() {
        if (this.initialized) return

        console.log('🚀 Инициализация менеджера панелей...')

        // Подписываемся на изменения состояния
        this.unsubscribeState = subscribe((state) => {
            this.onStateChange(state)
        })

        this.initialized = true
        console.log('✅ Менеджер панелей инициализирован')
    }

    /**
     * Регистрирует панель
     */
    register(panel) {
        if (!panel || !panel.id) {
            console.error('❌ Не удалось зарегистрировать панель: отсутствует ID')
            return false
        }

        this.panels.set(panel.id, panel)
        console.log(`📝 Зарегистрирована панель: ${panel.title} (${panel.id})`)

        return true
    }

    /**
     * Устанавливает активную панель для стороны
     */
    setActive(side, panelId) {
        const panel = this.panels.get(panelId)
        if (!panel) {
            console.error(`❌ Панель ${panelId} не найдена`)
            return false
        }

        this.activePanels.set(side, panel)
        console.log(`🎯 Установлена активная панель для ${side}: ${panel.title}`)

        return true
    }

    /**
     * Показывает панель
     */
    show(panelId, container) {
        const panel = this.panels.get(panelId)
        if (!panel) {
            console.error(`❌ Панель ${panelId} не найдена`)
            return null
        }

        console.log(`👁️ Показываем панель: ${panel.title}`)
        return panel.render(container)
    }

    /**
     * Скрывает панель
     */
    hide(panelId) {
        const panel = this.panels.get(panelId)
        if (!panel) {
            console.error(`❌ Панель ${panelId} не найдена`)
            return false
        }

        console.log(`👁️ Скрываем панель: ${panel.title}`)
        panel.cleanup()

        return true
    }

    /**
     * Обновляет все панели
     */
    updateAll() {
        console.log('🔄 Обновление всех панелей...')
        this.panels.forEach(panel => {
            if (panel.isRendered) {
                panel.update()
            }
        })
    }

    /**
     * Получает список доступных панелей для роли
     */
    getAvailablePanels(userRole) {
        const available = []

        this.panels.forEach(panel => {
            if (panel.checkRoleAccess(userRole)) {
                available.push({
                    id: panel.id,
                    title: panel.title,
                    icon: panel.icon,
                    description: panel.description,
                    category: panel.category
                })
            }
        })

        // Сортируем по категориям и названиям
        available.sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category)
            return a.title.localeCompare(b.title)
        })

        return available
    }

    /**
     * Обработчик изменения состояния
     */
    onStateChange(state) {
        // Проверяем изменения роли и обновляем доступность панелей
        const userRole = state.role || 'viewer'

        this.panels.forEach(panel => {
            if (panel.container) {
                const hasAccess = panel.checkRoleAccess(userRole)
                panel.container.style.display = hasAccess ? 'flex' : 'none'
            }
        })
    }

    /**
     * Получает информацию о панели
     */
    getPanelInfo(panelId) {
        const panel = this.panels.get(panelId)
        if (!panel) return null

        return {
            id: panel.id,
            title: panel.title,
            description: panel.description,
            version: panel.version,
            category: panel.category,
            requiredRoles: panel.requiredRoles,
            isRendered: panel.isRendered
        }
    }

    /**
     * Получает статистику по панелям
     */
    getStats() {
        let renderedCount = 0
        this.panels.forEach(panel => {
            if (panel.isRendered) renderedCount++
        })

        return {
            total: this.panels.size,
            rendered: renderedCount,
            categories: this.getCategories()
        }
    }

    /**
     * Получает список категорий панелей
     */
    getCategories() {
        const categories = new Set()
        this.panels.forEach(panel => {
            categories.add(panel.category)
        })
        return Array.from(categories)
    }

    /**
     * Очищает менеджер панелей
     */
    cleanup() {
        console.log('🧹 Очистка менеджера панелей...')

        // Очищаем все панели
        this.panels.forEach(panel => {
            if (panel.isRendered) {
                panel.cleanup()
            }
        })

        // Отписываемся от подписок
        if (this.unsubscribeState) {
            this.unsubscribeState()
            this.unsubscribeState = null
        }

        this.unsubscribeFunctions.forEach(fn => {
            if (typeof fn === 'function') fn()
        })

        this.panels.clear()
        this.activePanels.clear()
        this.unsubscribeFunctions = []
        this.initialized = false

        console.log('✅ Менеджер панелей очищен')
    }
}

// Создаем глобальный экземпляр менеджера панелей
export const panelManager = new PanelManager()

// Экспортируем глобальный менеджер для использования в других модулях
if (!window.__canvasverse_panelManager) {
    window.__canvasverse_panelManager = panelManager
}