// editor/ui/modules/settingsPanel.js
import { PanelBase, PanelFactory } from '../panelBase.js'
import { getState, setState, subscribe } from '../store.js'
import { saveRoomSettings, validateSettings, ROOM_SETTINGS, ROOM_SETTINGS_META } from '../../roomSettings.js'

/**
 * Панель настроек комнаты (переработана на основе PanelBase)
 */
class SettingsPanel extends PanelBase {
    constructor() {
        super({
            id: 'settings',
            title: 'Настройки комнаты',
            icon: '⚙️',
            requiredRoles: ['owner'],
            description: 'Управление настройками комнаты',
            category: 'settings',
            version: '2.0.0'
        })

        this.currentSettings = null
        this.formElements = new Map()
        this.isSaving = false
    }

    /**
     * Рендерит контент панели
     */
    renderContent() {
        // Очищаем контент
        this.content.innerHTML = ''

        // Загружаем текущие настройки
        const state = getState()
        this.currentSettings = state.roomSettings || {}

        // Создаем форму настроек
        const form = document.createElement('form')
        form.className = 'settings-form'
        form.id = 'room-settings-form'

        // Секция основных настроек
        const basicSection = this.createSection({
            title: 'Основные настройки',
            icon: '📝'
        })

        const nameField = this.createInputField({
            id: 'room-name',
            label: 'Название комнаты',
            type: 'text',
            value: this.currentSettings.name || '',
            placeholder: 'Введите название комнаты',
            hint: 'Отображается в списке комнат'
        })

        const descField = this.createInputField({
            id: 'room-description',
            label: 'Описание',
            type: 'textarea',
            value: this.currentSettings.description || '',
            placeholder: 'Опишите назначение комнаты',
            rows: 3
        })

        basicSection.appendChild(nameField)
        basicSection.appendChild(descField)
        form.appendChild(basicSection)

        // Секция доступа
        const accessSection = this.createSection({
            title: 'Доступ и пользователи',
            icon: '👥'
        })

        // Видимость комнаты
        const visibilityField = this.createVisibilityField()
        accessSection.appendChild(visibilityField)

        // Пароль (показывается только при выборе "С паролем")
        const passwordField = this.createInputField({
            id: 'room-password',
            label: 'Пароль',
            type: 'password',
            value: this.currentSettings.password || '',
            placeholder: 'Введите пароль',
            hint: 'Требуется для входа в комнату'
        })

        passwordField.style.display = this.currentSettings.visibility === ROOM_SETTINGS.PASSWORD ? 'block' : 'none'
        accessSection.appendChild(passwordField)

        // Максимальное количество пользователей
        const maxUsersField = this.createRangeField({
            id: 'max-users',
            label: 'Максимальное количество пользователей',
            min: 1,
            max: 100,
            value: this.currentSettings.maxUsers || 20,
            hint: 'Лимит пользователей в комнате'
        })

        accessSection.appendChild(maxUsersField)

        // Роль по умолчанию
        const roleField = this.createSelectField({
            id: 'default-role',
            label: 'Роль по умолчанию',
            options: [
                { value: 'viewer', label: 'Наблюдатель' },
                { value: 'editor', label: 'Редактор' },
                { value: 'admin', label: 'Администратор' }
            ],
            value: this.currentSettings.defaultRole || 'viewer',
            hint: 'Роль для новых пользователей'
        })

        accessSection.appendChild(roleField)
        form.appendChild(accessSection)

        // Секция редактора
        const editorSection = this.createSection({
            title: 'Настройки редактора',
            icon: '🎨'
        })

        const gridToggle = this.createToggle({
            id: 'grid-enabled',
            label: 'Включить сетку',
            checked: this.currentSettings.gridEnabled !== false
        })

        const snapToggle = this.createToggle({
            id: 'snap-enabled',
            label: 'Включить привязку',
            checked: this.currentSettings.snapEnabled !== false
        })

        editorSection.appendChild(gridToggle)
        editorSection.appendChild(snapToggle)
        form.appendChild(editorSection)

        // Кнопки действий
        const actionsSection = document.createElement('div')
        actionsSection.className = 'settings-actions'

        const saveButton = this.createButton({
            id: 'save-settings',
            text: 'Сохранить настройки',
            icon: '💾',
            primary: true,
            onClick: (e) => {
                e.preventDefault()
                this.saveSettings()
            }
        })

        const resetButton = this.createButton({
            id: 'reset-settings',
            text: 'Сбросить изменения',
            icon: '↺',
            onClick: (e) => {
                e.preventDefault()
                this.resetForm()
            }
        })

        actionsSection.appendChild(saveButton)
        actionsSection.appendChild(resetButton)
        form.appendChild(actionsSection)

        // Мета-информация
        const metaSection = this.createMetaSection()
        form.appendChild(metaSection)

        this.content.appendChild(form)

        // Сохраняем ссылки на элементы формы
        this.collectFormElements(form)

        // Настраиваем обработчики
        this.setupFormHandlers(form)

        // Применяем стили
        this.applySettingsStyles()

        // Подписываемся на изменения
        this.setupSubscriptions()
    }

    /**
     * Создает поле выбора видимости
     */
    createVisibilityField() {
        const field = document.createElement('div')
        field.className = 'panel-field'

        const label = document.createElement('label')
        label.className = 'panel-field-label'
        label.textContent = 'Видимость комнаты'

        const group = document.createElement('div')
        group.className = 'visibility-group'
        group.id = 'visibility-group'

        Object.entries(ROOM_SETTINGS_META).forEach(([key, meta]) => {
            const radio = document.createElement('label')
            radio.className = 'visibility-radio'

            const input = document.createElement('input')
            input.type = 'radio'
            input.name = 'visibility'
            input.value = key
            input.checked = this.currentSettings.visibility === key

            const icon = document.createElement('span')
            icon.className = 'visibility-icon'
            icon.textContent = meta.icon

            const text = document.createElement('div')
            text.className = 'visibility-text'
            text.innerHTML = `
                <strong>${meta.label}</strong>
                <small>${meta.description}</small>
            `

            radio.appendChild(input)
            radio.appendChild(icon)
            radio.appendChild(text)
            group.appendChild(radio)
        })

        field.appendChild(label)
        field.appendChild(group)

        return field
    }

    /**
     * Создает поле с ползунком
     */
    createRangeField(config) {
        const field = document.createElement('div')
        field.className = 'panel-field'

        const label = document.createElement('label')
        label.className = 'panel-field-label'
        label.textContent = config.label
        label.htmlFor = config.id

        const rangeContainer = document.createElement('div')
        rangeContainer.className = 'range-container'

        const range = document.createElement('input')
        range.type = 'range'
        range.id = config.id
        range.min = config.min
        range.max = config.max
        range.value = config.value

        const value = document.createElement('span')
        value.className = 'range-value'
        value.textContent = config.value

        range.addEventListener('input', (e) => {
            value.textContent = e.target.value
        })

        rangeContainer.appendChild(range)
        rangeContainer.appendChild(value)

        field.appendChild(label)
        field.appendChild(rangeContainer)

        if (config.hint) {
            const hint = document.createElement('div')
            hint.className = 'panel-field-hint'
            hint.textContent = config.hint
            field.appendChild(hint)
        }

        return field
    }

    /**
     * Создает поле выбора
     */
    createSelectField(config) {
        const field = document.createElement('div')
        field.className = 'panel-field'

        const label = document.createElement('label')
        label.className = 'panel-field-label'
        label.textContent = config.label
        label.htmlFor = config.id

        const select = document.createElement('select')
        select.id = config.id
        select.className = 'panel-field-input'

        config.options.forEach(option => {
            const optionElement = document.createElement('option')
            optionElement.value = option.value
            optionElement.textContent = option.label
            if (option.value === config.value) {
                optionElement.selected = true
            }
            select.appendChild(optionElement)
        })

        field.appendChild(label)
        field.appendChild(select)

        if (config.hint) {
            const hint = document.createElement('div')
            hint.className = 'panel-field-hint'
            hint.textContent = config.hint
            field.appendChild(hint)
        }

        return field
    }

    /**
     * Создает секцию с мета-информацией
     */
    createMetaSection() {
        const section = document.createElement('div')
        section.className = 'settings-meta'

        const metaGrid = document.createElement('div')
        metaGrid.className = 'settings-meta-grid'

        const metaItems = [
            {
                label: 'Создана',
                value: new Date(this.currentSettings.createdAt || Date.now()).toLocaleDateString('ru-RU')
            },
            {
                label: 'Пользователей',
                value: `${this.currentSettings.currentUsers || 0}/${this.currentSettings.maxUsers || 20}`
            }
        ]

        if (this.currentSettings.owner) {
            metaItems.push({
                label: 'Владелец',
                value: this.currentSettings.owner.substring(0, 8) + '...'
            })
        }

        metaItems.forEach(item => {
            const metaItem = document.createElement('div')
            metaItem.className = 'settings-meta-item'

            const label = document.createElement('div')
            label.className = 'settings-meta-label'
            label.textContent = item.label

            const value = document.createElement('div')
            value.className = 'settings-meta-value'
            value.textContent = item.value

            metaItem.appendChild(label)
            metaItem.appendChild(value)
            metaGrid.appendChild(metaItem)
        })

        section.appendChild(metaGrid)
        return section
    }

    /**
     * Собирает ссылки на элементы формы
     */
    collectFormElements(form) {
        this.formElements.clear()

        // Собираем все поля ввода
        const inputs = form.querySelectorAll('input, select, textarea')
        inputs.forEach(input => {
            this.formElements.set(input.id, input)
        })
    }

    /**
     * Настраивает обработчики формы
     */
    setupFormHandlers(form) {
        // Обработчик изменения видимости
        const visibilityGroup = form.querySelector('#visibility-group')
        if (visibilityGroup) {
            visibilityGroup.addEventListener('change', (e) => {
                if (e.target.name === 'visibility') {
                    const passwordField = form.querySelector('#room-password').closest('.panel-field')
                    if (e.target.value === ROOM_SETTINGS.PASSWORD) {
                        passwordField.style.display = 'block'
                    } else {
                        passwordField.style.display = 'none'
                    }
                }
            })

            this.cleanupFunctions.push(() => {
                visibilityGroup.removeEventListener('change', this.handleVisibilityChange)
            })
        }

        // Обработчик сохранения формы
        form.addEventListener('submit', (e) => {
            e.preventDefault()
            this.saveSettings()
        })
    }

    /**
     * Сохраняет настройки
     */
    saveSettings() {
        if (this.isSaving) return

        const form = document.getElementById('room-settings-form')
        if (!form) return

        // Собираем данные формы
        const newSettings = {
            name: this.formElements.get('room-name')?.value.trim() || '',
            description: this.formElements.get('room-description')?.value.trim() || '',
            visibility: form.querySelector('input[name="visibility"]:checked')?.value || ROOM_SETTINGS.PUBLIC,
            password: this.formElements.get('room-password')?.value || '',
            maxUsers: parseInt(this.formElements.get('max-users')?.value) || 20,
            defaultRole: this.formElements.get('default-role')?.value || 'viewer',
            gridEnabled: this.formElements.get('grid-enabled')?.checked !== false,
            snapEnabled: this.formElements.get('snap-enabled')?.checked !== false
        }

        // Валидация
        const validation = validateSettings(newSettings)
        if (!validation.valid) {
            this.showMessage('error', validation.errors.join(', '))
            return
        }

        // Если пароль не требуется, очищаем его
        if (newSettings.visibility !== ROOM_SETTINGS.PASSWORD) {
            newSettings.password = ''
        }

        this.isSaving = true
        this.showMessage('info', 'Сохранение настроек...')

        // Обновляем состояние
        setState({
            roomSettings: {
                ...this.currentSettings,
                ...newSettings
            }
        })

        // Сохраняем на сервер
        const success = saveRoomSettings(newSettings)
        if (success) {
            this.showMessage('success', 'Настройки сохранены')
            this.currentSettings = newSettings

            // Обновляем мета-информацию
            this.updateMetaSection()
        } else {
            this.showMessage('error', 'Ошибка сохранения')
        }

        this.isSaving = false
    }

    /**
     * Сбрасывает форму
     */
    resetForm() {
        this.renderContent()
        this.showMessage('info', 'Изменения сброшены')
    }

    /**
     * Обновляет секцию с мета-информацией
     */
    updateMetaSection() {
        const state = getState()
        this.currentSettings = state.roomSettings || {}

        const metaSection = this.content.querySelector('.settings-meta')
        if (metaSection) {
            const newMetaSection = this.createMetaSection()
            metaSection.parentNode.replaceChild(newMetaSection, metaSection)
        }
    }

    /**
     * Настраивает подписки
     */
    setupSubscriptions() {
        // Подписываемся на изменения настроек
        this.unsubscribeSettings = subscribe((state) => {
            if (state.roomSettings !== this.currentSettings) {
                this.currentSettings = state.roomSettings || {}
                this.updateMetaSection()
            }
        })

        this.cleanupFunctions.push(() => {
            if (this.unsubscribeSettings) {
                this.unsubscribeSettings()
            }
        })
    }

    /**
     * Применяет стили для панели настроек
     */
    applySettingsStyles() {
        if (document.getElementById('settings-panel-styles')) return

        const styleEl = document.createElement('style')
        styleEl.id = 'settings-panel-styles'
        styleEl.textContent = `
            .settings-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .visibility-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .visibility-radio {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: #2a2a2a;
                border: 1px solid #333;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .visibility-radio:hover {
                background: #333;
                border-color: #444;
            }
            
            .visibility-icon {
                font-size: 18px;
                width: 24px;
                text-align: center;
            }
            
            .visibility-text {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .visibility-text strong {
                font-size: 14px;
                color: #fff;
            }
            
            .visibility-text small {
                font-size: 12px;
                color: #888;
            }
            
            .range-container {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .range-container input[type="range"] {
                flex: 1;
                height: 4px;
                background: #333;
                border-radius: 2px;
                outline: none;
            }
            
            .range-value {
                min-width: 40px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                color: #4a9eff;
            }
            
            .settings-actions {
                display: flex;
                gap: 12px;
                margin: 8px 0;
            }
            
            .settings-meta {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid #222;
            }
            
            .settings-meta-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
            }
            
            .settings-meta-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .settings-meta-label {
                font-size: 12px;
                color: #888;
            }
            
            .settings-meta-value {
                font-size: 14px;
                font-weight: 500;
                color: #fff;
                font-family: 'JetBrains Mono', monospace;
            }
            
            @media (max-width: 768px) {
                .settings-actions {
                    flex-direction: column;
                }
                
                .settings-meta-grid {
                    grid-template-columns: 1fr;
                }
            }
        `
        document.head.appendChild(styleEl)
    }
}

// Создаем и регистрируем панель
const settingsPanel = new SettingsPanel()
PanelFactory.register(settingsPanel)

// Экспортируем для использования в других модулях
export { settingsPanel }