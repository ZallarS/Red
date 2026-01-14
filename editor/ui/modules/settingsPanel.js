
import { PanelBase } from '../panelBase.js'
import { subscribe, getState, setState } from '../store.js'
import { ROLE_META, ROLES } from '../../config.js'
import { saveRoomSettings, canEditSettings, formatSettingsForDisplay } from '../../roomSettings.js'

export class SettingsPanel extends PanelBase {
    constructor(config) {
        super({
            ...config,
            id: 'settings',
            title: 'Настройки комнаты',
            icon: '⚙️',
            description: 'Управление параметрами комнаты и правами доступа',
            category: 'system',
            version: '1.0.0',
            requiredRoles: ['admin', 'owner']
        })

        this.currentSettings = null
        this.unsubscribeRoomSettings = null
    }

    renderContent() {
        console.log('⚙️ Рендерим панель настроек')

        // Очищаем контент
        this.content.innerHTML = ''

        // Проверяем права доступа
        const state = getState()
        const canEdit = canEditSettings(state.role)

        if (!canEdit) {
            this.content.innerHTML = `
                <div class="panel-section">
                    <div class="panel-empty">
                        <div class="panel-empty-icon">🔒</div>
                        <div class="panel-empty-text">Недостаточно прав для изменения настроек</div>
                        <div class="panel-empty-subtext">Требуется роль администратора или владельца</div>
                    </div>
                </div>
            `
            return
        }

        // Секция основной информации
        const infoSection = this.createSection({
            title: '📋 Основная информация',
            icon: '📋'
        })

        const nameField = this.createInputField({
            id: 'room-name',
            label: 'Название комнаты',
            placeholder: 'Введите название комнаты',
            value: this.currentSettings?.name || 'Новая комната',
            hint: 'Отображается в списке комнат и в заголовке'
        })

        const descField = this.createInputField({
            id: 'room-description',
            label: 'Описание комнаты',
            type: 'textarea',
            placeholder: 'Опишите назначение комнаты...',
            value: this.currentSettings?.description || '',
            hint: 'Максимум 200 символов',
            rows: 3
        })

        infoSection.appendChild(nameField)
        infoSection.appendChild(descField)

        // Секция настроек редактора
        const editorSection = this.createSection({
            title: '🎨 Настройки редактора',
            icon: '🎨'
        })

        const gridToggle = this.createToggle({
            id: 'grid-enabled',
            label: 'Включить сетку',
            checked: this.currentSettings?.gridEnabled !== false,
            onChange: (checked) => {
                console.log('Сетка:', checked ? 'включена' : 'выключена')
                this.updateSettings({ gridEnabled: checked })
            }
        })

        const snapToggle = this.createToggle({
            id: 'snap-enabled',
            label: 'Включить привязку к сетке',
            checked: this.currentSettings?.snapEnabled !== false,
            onChange: (checked) => {
                console.log('Привязка:', checked ? 'включена' : 'выключена')
                this.updateSettings({ snapEnabled: checked })
            }
        })

        editorSection.appendChild(gridToggle)
        editorSection.appendChild(snapToggle)

        // Секция мета-информации (только для чтения)
        const metaSection = document.createElement('div')
        metaSection.className = 'panel-section panel-section-meta'
        metaSection.innerHTML = `
            <div class="panel-section-title">
                <span class="panel-section-title-icon">📊</span>
                <span>Информация о комнате</span>
            </div>
            <div class="panel-meta-grid" id="meta-info-grid">
                <!-- Динамически заполняется -->
            </div>
        `

        // Секция управления
        const controlSection = this.createSection({
            title: '⚡ Быстрые действия',
            icon: '⚡'
        })

        const saveButton = this.createButton({
            text: 'Сохранить все настройки',
            icon: '💾',
            primary: true,
            onClick: () => {
                this.saveAllSettings()
            }
        })

        const resetButton = this.createButton({
            text: 'Сбросить к значениям по умолчанию',
            icon: '🔄',
            onClick: () => {
                if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
                    this.resetToDefaults()
                }
            }
        })

        controlSection.appendChild(saveButton)
        controlSection.appendChild(resetButton)

        // Добавляем все секции в контент
        this.content.appendChild(infoSection)
        this.content.appendChild(editorSection)
        this.content.appendChild(metaSection)
        this.content.appendChild(controlSection)

        // Обновляем мета-информацию
        this.updateMetaSection()

        // Устанавливаем подписки
        this.setupSubscriptions()

        return this.cleanup.bind(this)
    }

    updateMetaSection() {
        // ВАЖНО: Защита от null - проверяем существование content
        if (!this.content || !this.currentSettings) {
            console.warn('⚠️ Не удалось обновить мета-секцию: content или settings отсутствуют')
            return
        }

        const metaGrid = this.content.querySelector('#meta-info-grid')
        if (!metaGrid) {
            console.warn('⚠️ Элемент #meta-info-grid не найден')
            return
        }

        const formatted = formatSettingsForDisplay(this.currentSettings)
        const state = getState()

        metaGrid.innerHTML = `
            <div class="meta-grid-item">
                <div class="meta-grid-label">ID комнаты</div>
                <div class="meta-grid-value">${state.roomId || 'N/A'}</div>
            </div>
            <div class="meta-grid-item">
                <div class="meta-grid-label">Владелец</div>
                <div class="meta-grid-value">${this.currentSettings.ownerName || 'Неизвестно'}</div>
            </div>
            <div class="meta-grid-item">
                <div class="meta-grid-label">Создана</div>
                <div class="meta-grid-value">${formatted.createdAt}</div>
            </div>
            <div class="meta-grid-item">
                <div class="meta-grid-label">Статус</div>
                <div class="meta-grid-value ${formatted.isPasswordProtected ? 'status-protected' : 'status-open'}">
                    ${formatted.visibility}
                </div>
            </div>
            <div class="meta-grid-item">
                <div class="meta-grid-label">Пользователи</div>
                <div class="meta-grid-value">${formatted.users}</div>
            </div>
            <div class="meta-grid-item">
                <div class="meta-grid-label">Роль по умолчанию</div>
                <div class="meta-grid-value role-${this.currentSettings.defaultRole || 'viewer'}">
                    ${ROLE_META[this.currentSettings.defaultRole]?.label || 'Наблюдатель'}
                </div>
            </div>
        `
    }

    setupSubscriptions() {
        // Отписываемся от предыдущих подписок
        if (this.unsubscribeRoomSettings) {
            this.unsubscribeRoomSettings()
        }

        // Подписываемся на изменения настроек комнаты
        this.unsubscribeRoomSettings = subscribe((state) => {
            if (state.roomSettings) {
                console.log('📥 Получены новые настройки комнаты:', state.roomSettings)
                this.currentSettings = state.roomSettings

                // ВАЖНО: Защита - проверяем, что панель еще отрендерена
                if (this.isRendered) {
                    this.updateMetaSection()
                }
            }
        })

        // Добавляем в cleanupFunctions для автоматической отписки
        this.cleanupFunctions.push(() => {
            if (this.unsubscribeRoomSettings) {
                this.unsubscribeRoomSettings()
                this.unsubscribeRoomSettings = null
            }
        })

        console.log('✅ Подписки настроек установлены')
    }

    updateSettings(updates) {
        if (!this.currentSettings) {
            console.error('❌ Нет текущих настроек для обновления')
            return
        }

        const newSettings = {
            ...this.currentSettings,
            ...updates
        }

        this.currentSettings = newSettings

        // ВАЖНО: Защита - обновляем UI только если панель отрендерена
        if (this.isRendered) {
            this.updateMetaSection()
        }
    }

    saveAllSettings() {
        if (!this.currentSettings) {
            console.error('❌ Нет настроек для сохранения')
            this.showMessage('error', 'Нет настроек для сохранения')
            return
        }

        console.log('💾 Сохранение всех настроек:', this.currentSettings)

        // Получаем значения из полей ввода
        const nameInput = this.content.querySelector('#room-name')
        const descInput = this.content.querySelector('#room-description')

        if (nameInput && descInput) {
            this.currentSettings.name = nameInput.value.trim()
            this.currentSettings.description = descInput.value.trim()
        }

        // Валидация
        if (!this.currentSettings.name || this.currentSettings.name.length < 3) {
            this.showMessage('error', 'Название комнаты должно быть не менее 3 символов')
            return
        }

        if (this.currentSettings.description.length > 200) {
            this.showMessage('error', 'Описание не должно превышать 200 символов')
            return
        }

        // Сохраняем на сервер
        const success = saveRoomSettings(this.currentSettings)

        if (success) {
            this.showMessage('success', 'Настройки сохранены')

            // Обновляем состояние хранилища
            setState({ roomSettings: this.currentSettings })

            console.log('✅ Настройки успешно сохранены')
        } else {
            this.showMessage('error', 'Ошибка сохранения настроек')
        }
    }

    resetToDefaults() {
        const defaultSettings = {
            name: 'Новая комната',
            description: '',
            gridEnabled: true,
            snapEnabled: true,
            defaultRole: 'viewer'
        }

        // Сохраняем неизменяемые поля
        if (this.currentSettings) {
            defaultSettings.owner = this.currentSettings.owner
            defaultSettings.ownerName = this.currentSettings.ownerName
            defaultSettings.createdAt = this.currentSettings.createdAt
            defaultSettings.visibility = this.currentSettings.visibility
            defaultSettings.maxUsers = this.currentSettings.maxUsers
        }

        this.currentSettings = defaultSettings

        // ВАЖНО: Обновляем UI только если панель отрендерена
        if (this.isRendered) {
            // Обновляем поля ввода
            const nameInput = this.content.querySelector('#room-name')
            const descInput = this.content.querySelector('#room-description')
            const gridToggle = this.content.querySelector('#grid-enabled')
            const snapToggle = this.content.querySelector('#snap-enabled')

            if (nameInput) nameInput.value = defaultSettings.name
            if (descInput) descInput.value = defaultSettings.description
            if (gridToggle) gridToggle.checked = defaultSettings.gridEnabled
            if (snapToggle) snapToggle.checked = defaultSettings.snapEnabled

            this.updateMetaSection()
            this.showMessage('info', 'Настройки сброшены к значениям по умолчанию')
        }
    }

    cleanup() {
        console.log('🧹 Очистка панели настроек...')

        // Отписываемся от подписок
        if (this.unsubscribeRoomSettings) {
            this.unsubscribeRoomSettings()
            this.unsubscribeRoomSettings = null
        }

        // Вызываем родительскую очистку
        super.cleanup()
    }

    update() {
        // ВАЖНО: Защита - не обновляем если панель не отрендерена
        if (!this.isRendered) return

        console.log('🔄 Обновление панели настроек')
        const state = getState()
        this.currentSettings = state.roomSettings || this.currentSettings

        if (this.content && this.currentSettings) {
            this.updateMetaSection()
        }
    }
}

// Стили для панели настроек
if (!document.getElementById('settings-panel-styles')) {
    const styleEl = document.createElement('style')
    styleEl.id = 'settings-panel-styles'
    styleEl.textContent = `
        .panel-section-meta {
            background: #151515 !important;
            border: 1px solid #2a2a2a !important;
        }

        .panel-meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            margin-top: 8px;
        }

        .meta-grid-item {
            padding: 10px;
            background: #1a1a1a;
            border: 1px solid #222;
            border-radius: 6px;
        }

        .meta-grid-label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .meta-grid-value {
            font-size: 14px;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            word-break: break-all;
        }

        .status-protected {
            color: #ffc107;
            background: rgba(255, 193, 7, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }

        .status-open {
            color: #20c997;
            background: rgba(32, 201, 151, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }

        .role-owner { color: #ff6b35; }
        .role-admin { color: #e0b400; }
        .role-editor { color: #4a9eff; }
        .role-viewer { color: #888; }

        .panel-empty-subtext {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }

        @media (max-width: 768px) {
            .panel-meta-grid {
                grid-template-columns: 1fr;
            }
        }
    `
    document.head.appendChild(styleEl)
}

// Регистрация панели
export const settingsPanel = new SettingsPanel({})
window.__canvasverse_panelModules.set('settings', {
    title: 'Настройки комнаты',
    requiredRoles: ['admin', 'owner'],
    icon: '⚙️',
    render: (container) => {
        return settingsPanel.render(container)
    }
})