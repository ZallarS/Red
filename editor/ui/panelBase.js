import { getState, subscribe } from './store.js'
import { ROLE_META } from '../config.js'

/**
 * Базовый класс для всех панелей редактора
 * Предоставляет общую структуру, стили и методы
 */
export class PanelBase {
    constructor(config) {
        this.id = config.id
        this.title = config.title
        this.icon = config.icon || '📄'
        this.requiredRoles = config.requiredRoles || ['viewer']
        this.description = config.description || ''
        this.category = config.category || 'general'
        this.version = config.version || '1.0.0'

        // Флаги состояния
        this.isRendered = false
        this.isSubscribed = false
        this.cleanupFunctions = []

        // Ссылки на DOM элементы
        this.container = null
        this.content = null

        console.log(`📦 Создана панель: ${this.title} (${this.id})`)
    }

    /**
     * Основной метод рендеринга панели
     */
    render(container) {
        if (this.isRendered) {
            console.warn(`⚠️ Панель ${this.id} уже отрендерена`)
            return this.cleanup.bind(this)
        }

        console.log(`🎨 Рендерим панель: ${this.title}`)
        this.container = container

        // Создаем общую структуру панели
        this.createPanelStructure()

        // Рендерим контент (должен быть реализован в дочернем классе)
        this.renderContent()

        // Применяем стили
        this.applyStyles()

        // Подписываемся на изменения состояния
        this.setupSubscriptions()

        this.isRendered = true
        return this.cleanup.bind(this)
    }

    /**
     * Создает общую структуру панели
     */
    createPanelStructure() {
        this.container.innerHTML = ''
        this.container.className = `panel panel-${this.id}`

        // Заголовок панели
        const header = document.createElement('div')
        header.className = 'panel-header'
        header.innerHTML = `
            <div class="panel-header-content">
                <span class="panel-icon">${this.icon}</span>
                <h3 class="panel-title">${this.title}</h3>
                ${this.description ? `<div class="panel-description">${this.description}</div>` : ''}
            </div>
            <div class="panel-header-meta">
                <span class="panel-version">v${this.version}</span>
                <span class="panel-category">${this.category}</span>
            </div>
        `
        this.container.appendChild(header)

        // Контейнер для контента
        this.content = document.createElement('div')
        this.content.className = 'panel-content'
        this.content.id = `panel-content-${this.id}`
        this.container.appendChild(this.content)
    }

    /**
     * Метод для рендеринга контента (переопределяется в дочерних классах)
     */
    renderContent() {
        // Базовый контент - должен быть переопределен
        this.content.innerHTML = `
            <div class="panel-empty">
                <div class="panel-empty-icon">📄</div>
                <div class="panel-empty-text">Контент панели не реализован</div>
            </div>
        `
    }

    /**
     * Применяет стили к панели
     */
    applyStyles() {
        // Проверяем, не добавлены ли уже стили панелей
        if (document.getElementById('panel-base-styles')) return

        const linkEl = document.createElement('link')
        linkEl.id = 'panel-base-styles'
        linkEl.rel = 'stylesheet'
        linkEl.href = '/editor/ui/styles/panels.css'
        document.head.appendChild(linkEl)
    }

    /**
     * Настраивает подписки на изменения состояния
     */
    setupSubscriptions() {
        if (this.isSubscribed) return

        // Подписываемся на изменения роли
        this.unsubscribeRole = subscribe((state) => {
            this.onRoleChange(state.role)
        })

        this.isSubscribed = true
    }

    /**
     * Обработчик изменения роли
     */
    onRoleChange(newRole) {
        const hasAccess = this.checkRoleAccess(newRole)
        if (this.container) {
            this.container.style.display = hasAccess ? 'flex' : 'none'
        }
    }

    /**
     * Проверяет доступность панели для роли
     */
    checkRoleAccess(userRole) {
        if (!this.requiredRoles || this.requiredRoles.length === 0) return true
        return this.requiredRoles.includes(userRole)
    }

    /**
     * Создает стандартное поле ввода
     */
    createInputField(config) {
        const field = document.createElement('div')
        field.className = 'panel-field'

        const label = document.createElement('label')
        label.className = 'panel-field-label'
        label.textContent = config.label
        label.htmlFor = config.id

        const input = document.createElement(config.type === 'textarea' ? 'textarea' : 'input')
        input.className = 'panel-field-input'
        input.id = config.id
        input.name = config.name || config.id

        if (config.type !== 'textarea') {
            input.type = config.type || 'text'
        }

        if (config.placeholder) input.placeholder = config.placeholder
        if (config.value !== undefined) input.value = config.value
        if (config.disabled) input.disabled = true
        if (config.rows) input.rows = config.rows

        field.appendChild(label)
        field.appendChild(input)

        if (config.hint) {
            const hint = document.createElement('div')
            hint.className = 'panel-field-hint'
            hint.textContent = config.hint
            field.appendChild(hint)
        }

        // Добавляем обработчик изменений если есть
        if (config.onChange) {
            input.addEventListener('change', config.onChange)
            this.cleanupFunctions.push(() => {
                input.removeEventListener('change', config.onChange)
            })
        }

        if (config.onInput) {
            input.addEventListener('input', config.onInput)
            this.cleanupFunctions.push(() => {
                input.removeEventListener('input', config.onInput)
            })
        }

        return field
    }

    /**
     * Создает кнопку
     */
    createButton(config) {
        const button = document.createElement('button')
        button.className = `panel-btn ${config.primary ? 'panel-btn-primary' : ''}`
        button.type = config.type || 'button'

        if (config.icon) {
            const icon = document.createElement('span')
            icon.className = 'panel-btn-icon'
            icon.textContent = config.icon
            button.appendChild(icon)
        }

        const text = document.createElement('span')
        text.textContent = config.text
        button.appendChild(text)

        if (config.onClick) {
            button.addEventListener('click', config.onClick)
            this.cleanupFunctions.push(() => {
                button.removeEventListener('click', config.onClick)
            })
        }

        if (config.disabled) button.disabled = true
        if (config.title) button.title = config.title

        return button
    }

    /**
     * Создает переключатель
     */
    createToggle(config) {
        const toggle = document.createElement('label')
        toggle.className = 'panel-toggle'

        const text = document.createElement('span')
        text.className = 'panel-toggle-text'
        text.textContent = config.label

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.checked = config.checked || false
        checkbox.style.position = 'absolute'
        checkbox.style.opacity = '0'
        checkbox.style.width = '0'
        checkbox.style.height = '0'

        const slider = document.createElement('span')
        slider.className = 'panel-toggle-slider'

        toggle.appendChild(text)
        toggle.appendChild(checkbox)
        toggle.appendChild(slider)

        if (config.onChange) {
            checkbox.addEventListener('change', (e) => {
                config.onChange(e.target.checked)
            })
            this.cleanupFunctions.push(() => {
                checkbox.removeEventListener('change', config.onChange)
            })
        }

        return toggle
    }

    /**
     * Создает секцию
     */
    createSection(config) {
        const section = document.createElement('div')
        section.className = 'panel-section'

        if (config.title) {
            const title = document.createElement('div')
            title.className = 'panel-section-title'

            if (config.icon) {
                const icon = document.createElement('span')
                icon.className = 'panel-section-title-icon'
                icon.textContent = config.icon
                title.appendChild(icon)
            }

            const titleText = document.createElement('span')
            titleText.textContent = config.title
            title.appendChild(titleText)

            section.appendChild(title)
        }

        return section
    }

    /**
     * Очищает панель
     */
    cleanup() {
        console.log(`🧹 Очистка панели: ${this.title}`)

        // Вызываем все функции очистки
        this.cleanupFunctions.forEach(fn => {
            try {
                if (typeof fn === 'function') fn()
            } catch (error) {
                console.error(`❌ Ошибка при очистке панели ${this.id}:`, error)
            }
        })

        // Отписываемся от подписок
        if (this.unsubscribeRole) {
            this.unsubscribeRole()
            this.unsubscribeRole = null
        }

        // Очищаем контейнер
        if (this.container) {
            this.container.innerHTML = ''
        }

        this.isRendered = false
        this.isSubscribed = false
        this.cleanupFunctions = []
        this.container = null
        this.content = null
    }

    /**
     * Обновляет панель
     */
    update() {
        if (!this.isRendered) {
            console.warn(`⚠️ Панель ${this.id} не отрендерена, пропускаем обновление`)
            return
        }

        console.log(`🔄 Обновление панели: ${this.title}`)

        // Защита от вызова после очистки
        if (!this.content) {
            console.warn(`⚠️ Контент панели ${this.id} не найден`)
            return
        }

        this.renderContent()
    }

    /**
     * Показывает сообщение в панели
     */
    showMessage(type, text) {
        if (!this.content || !this.isRendered) {
            console.warn(`⚠️ Панель ${this.id} не отрендерена, сообщение не показано:`, text)
            return
        }

        const message = document.createElement('div')
        message.className = `panel-message panel-message-${type}`
        message.textContent = text

        // Удаляем предыдущие сообщения
        const existingMessages = this.content.querySelectorAll('.panel-message')
        existingMessages.forEach(msg => {
            if (msg.parentNode === this.content) {
                msg.remove()
            }
        })

        this.content.insertBefore(message, this.content.firstChild)

        // Автоматически удаляем через 3 секунды
        setTimeout(() => {
            if (message.parentNode === this.content) {
                message.remove()
            }
        }, 3000)
    }

    /**
     * Создает стандартный интерфейс для управления настройками
     */
    createSettingsManager(settings, onSave) {
        const manager = {
            values: { ...settings },

            addInput: function(fieldConfig) {
                const field = this.createInputField(fieldConfig)
                this.content.appendChild(field)

                // Сохраняем ссылку на поле для обновления значений
                const input = field.querySelector('input, textarea, select')
                if (input) {
                    input.addEventListener('change', (e) => {
                        this.values[fieldConfig.id] = e.target.value
                    })
                }

                return field
            },

            addToggle: function(toggleConfig) {
                const toggle = this.createToggle(toggleConfig)
                this.content.appendChild(toggle)

                const checkbox = toggle.querySelector('input[type="checkbox"]')
                if (checkbox) {
                    checkbox.addEventListener('change', (e) => {
                        this.values[toggleConfig.id] = e.target.checked
                    })
                }

                return toggle
            },

            addSaveButton: function() {
                const button = this.createButton({
                    text: 'Сохранить',
                    icon: '💾',
                    primary: true,
                    onClick: () => {
                        if (onSave && typeof onSave === 'function') {
                            onSave(this.values)
                        }
                    }
                })

                this.content.appendChild(button)
                return button
            },

            getValues: function() {
                return { ...this.values }
            }
        }

        return manager
    }
}

/**
 * Фабрика для создания панелей
 */
export class PanelFactory {
    static create(config) {
        return new PanelBase(config)
    }

    /**
     * Регистрирует панель в глобальном реестре
     */
    static register(panelInstance) {
        if (!window.__canvasverse_panelModules) {
            window.__canvasverse_panelModules = new Map()
        }

        window.__canvasverse_panelModules.set(panelInstance.id, {
            title: panelInstance.title,
            requiredRoles: panelInstance.requiredRoles,
            icon: panelInstance.icon,
            render: (container) => {
                return panelInstance.render(container)
            }
        })

        console.log(`✅ Зарегистрирована панель: ${panelInstance.title}`)
    }
}