// editor/ui/panelBase.js
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
        // Проверяем, не добавлены ли уже стили
        if (document.getElementById('panel-base-styles')) return

        const styleEl = document.createElement('style')
        styleEl.id = 'panel-base-styles'
        styleEl.textContent = this.getBaseStyles()
        document.head.appendChild(styleEl)
    }

    /**
     * Возвращает базовые стили для всех панелей
     */
    getBaseStyles() {
        return `
            /* Базовые стили панелей */
            .panel {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #0f0f0f;
                border-left: 1px solid #222;
                font-family: 'Inter', sans-serif;
                overflow: hidden;
            }
            
            .panel-header {
                padding: 16px 20px;
                background: #1a1a1a;
                border-bottom: 1px solid #222;
                flex-shrink: 0;
            }
            
            .panel-header-content {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
            
            .panel-icon {
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: rgba(74, 158, 255, 0.1);
                border-radius: 8px;
                color: #4a9eff;
            }
            
            .panel-title {
                font-size: 18px;
                font-weight: 600;
                color: #fff;
                margin: 0;
                flex: 1;
            }
            
            .panel-description {
                font-size: 13px;
                color: #888;
                margin-left: 44px;
                line-height: 1.4;
            }
            
            .panel-header-meta {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: #666;
            }
            
            .panel-version {
                font-family: 'JetBrains Mono', monospace;
            }
            
            .panel-category {
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                position: relative;
            }
            
            .panel-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: #666;
                text-align: center;
            }
            
            .panel-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            
            .panel-empty-text {
                font-size: 14px;
            }
            
            /* Стили для полей ввода */
            .panel-field {
                margin-bottom: 16px;
            }
            
            .panel-field-label {
                display: block;
                font-size: 14px;
                font-weight: 500;
                color: #ddd;
                margin-bottom: 8px;
            }
            
            .panel-field-input {
                width: 100%;
                padding: 10px 12px;
                background: #2a2a2a;
                border: 1px solid #333;
                border-radius: 6px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            
            .panel-field-input:focus {
                border-color: #4a9eff;
                outline: none;
                background: #2c2c2c;
            }
            
            .panel-field-hint {
                font-size: 12px;
                color: #888;
                margin-top: 4px;
            }
            
            /* Стили для кнопок */
            .panel-btn {
                padding: 10px 16px;
                border-radius: 6px;
                border: 1px solid #333;
                background: #2a2a2a;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .panel-btn:hover {
                background: #333;
                border-color: #444;
            }
            
            .panel-btn-primary {
                background: #4a9eff;
                border-color: #4a9eff;
            }
            
            .panel-btn-primary:hover {
                background: #3a8aef;
                border-color: #3a8aef;
            }
            
            .panel-btn-icon {
                font-size: 16px;
            }
            
            /* Стили для групп кнопок */
            .panel-btn-group {
                display: flex;
                gap: 8px;
                margin: 16px 0;
            }
            
            .panel-btn-group .panel-btn {
                flex: 1;
            }
            
            /* Стили для секций */
            .panel-section {
                margin-bottom: 24px;
                padding: 16px;
                background: #1a1a1a;
                border: 1px solid #222;
                border-radius: 8px;
            }
            
            .panel-section-title {
                font-size: 16px;
                font-weight: 600;
                color: #fff;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .panel-section-title-icon {
                font-size: 18px;
            }
            
            /* Стили для списков */
            .panel-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .panel-list-item {
                padding: 12px;
                background: #2a2a2a;
                border: 1px solid #333;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            
            .panel-list-item:hover {
                background: #333;
                border-color: #444;
            }
            
            /* Стили для переключателей */
            .panel-toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 0;
                cursor: pointer;
            }
            
            .panel-toggle-text {
                font-size: 14px;
                color: #ddd;
                flex: 1;
                padding-right: 16px;
            }
            
            .panel-toggle-slider {
                position: relative;
                width: 52px;
                height: 28px;
                background: #333;
                border-radius: 14px;
                transition: all 0.3s ease;
                flex-shrink: 0;
            }
            
            .panel-toggle-slider:before {
                content: '';
                position: absolute;
                width: 24px;
                height: 24px;
                background: #888;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: all 0.3s ease;
            }
            
            .panel-toggle input:checked + .panel-toggle-slider {
                background: #4a9eff;
            }
            
            .panel-toggle input:checked + .panel-toggle-slider:before {
                transform: translateX(24px);
                background: #fff;
            }
            
            /* Стили для таблиц */
            .panel-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .panel-table th {
                text-align: left;
                padding: 8px 12px;
                background: #2a2a2a;
                color: #ddd;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #333;
            }
            
            .panel-table td {
                padding: 8px 12px;
                border-bottom: 1px solid #222;
                font-size: 13px;
                color: #ccc;
            }
            
            .panel-table tr:hover td {
                background: rgba(255, 255, 255, 0.05);
            }
            
            /* Адаптивность */
            @media (max-width: 768px) {
                .panel-header {
                    padding: 12px 16px;
                }
                
                .panel-title {
                    font-size: 16px;
                }
                
                .panel-content {
                    padding: 12px;
                }
                
                .panel-btn {
                    padding: 8px 12px;
                    font-size: 13px;
                }
                
                .panel-section {
                    padding: 12px;
                }
            }
        `
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
        if (!this.isRendered) return
        console.log(`🔄 Обновление панели: ${this.title}`)
        this.renderContent()
    }

    /**
     * Показывает сообщение в панели
     */
    showMessage(type, text) {
        if (!this.content) return

        const message = document.createElement('div')
        message.className = `panel-message panel-message-${type}`
        message.textContent = text

        // Удаляем предыдущие сообщения
        const existingMessages = this.content.querySelectorAll('.panel-message')
        existingMessages.forEach(msg => msg.remove())

        this.content.insertBefore(message, this.content.firstChild)

        // Автоматически удаляем через 3 секунды
        setTimeout(() => {
            if (message.parentNode) {
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