import { getState, setState, subscribe } from '../store.js'
import { saveRoomSettings, validateSettings, ROOM_SETTINGS, ROOM_SETTINGS_META, canEditSettings } from '../../roomSettings.js'
import { send } from '../../ws.js'

// Регистрируем модуль в глобальном реестре
if (!window.__canvasverse_panelModules) {
    window.__canvasverse_panelModules = new Map()
}

window.__canvasverse_panelModules.set('settings', {
    title: 'Настройки комнаты',

    render(container) {
        console.log('⚙️ Рендерим панель настроек комнаты')

        const panel = document.createElement('div')
        panel.className = 'settings-panel'
        panel.innerHTML = `
            <div class="settings-header">
                <div class="settings-title">Настройки комнаты</div>
                <div class="settings-status" id="settings-status"></div>
            </div>
            <div class="settings-form" id="settings-form"></div>
        `

        container.appendChild(panel)

        let currentSettings = null
        let unsubscribe = null

        function renderForm() {
            const state = getState()
            const settings = state.roomSettings || {}
            const userRole = state.role
            currentSettings = settings

            const form = document.getElementById('settings-form')
            if (!form) return

            const canEdit = canEditSettings(userRole)

            form.innerHTML = `
                <div class="settings-section">
                    <div class="settings-section-title">
                        <span class="settings-section-icon">📝</span>
                        Основные настройки
                    </div>
                    
                    <div class="settings-field">
                        <label for="room-name">Название комнаты</label>
                        <input 
                            type="text" 
                            id="room-name" 
                            value="${settings.name || ''}"
                            ${!canEdit ? 'disabled' : ''}
                            placeholder="Введите название комнаты"
                        />
                        <div class="settings-hint">Отображается в списке комнат</div>
                    </div>

                    <div class="settings-field">
                        <label for="room-description">Описание</label>
                        <textarea 
                            id="room-description" 
                            ${!canEdit ? 'disabled' : ''}
                            placeholder="Опишите назначение комнаты"
                            rows="3"
                        >${settings.description || ''}</textarea>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">
                        <span class="settings-section-icon">👥</span>
                        Доступ и пользователи
                    </div>
                    
                    <div class="settings-field">
                        <label>Видимость комнаты</label>
                        <div class="settings-radio-group" id="visibility-group">
                            ${Object.entries(ROOM_SETTINGS_META).map(([key, meta]) => `
                                <label class="settings-radio">
                                    <input 
                                        type="radio" 
                                        name="visibility" 
                                        value="${key}" 
                                        ${settings.visibility === key ? 'checked' : ''}
                                        ${!canEdit ? 'disabled' : ''}
                                    />
                                    <span class="settings-radio-icon">${meta.icon}</span>
                                    <span class="settings-radio-text">
                                        <strong>${meta.label}</strong>
                                        <small>${meta.description}</small>
                                    </span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="settings-field" id="password-field" style="display: ${settings.visibility === ROOM_SETTINGS.PASSWORD ? 'block' : 'none'}">
                        <label for="room-password">Пароль</label>
                        <input 
                            type="password" 
                            id="room-password" 
                            value="${settings.password || ''}"
                            ${!canEdit ? 'disabled' : ''}
                            placeholder="Введите пароль"
                        />
                        <div class="settings-hint">Требуется для входа в комнату</div>
                    </div>

                    <div class="settings-field">
                        <label for="max-users">Максимальное количество пользователей</label>
                        <div class="settings-range">
                            <input 
                                type="range" 
                                id="max-users" 
                                min="1" 
                                max="100" 
                                value="${settings.maxUsers || 20}"
                                ${!canEdit ? 'disabled' : ''}
                            />
                            <span class="settings-range-value">${settings.maxUsers || 20}</span>
                        </div>
                    </div>

                    <div class="settings-field">
                        <label for="default-role">Роль по умолчанию</label>
                        <select id="default-role" ${!canEdit ? 'disabled' : ''}>
                            <option value="viewer" ${settings.defaultRole === 'viewer' ? 'selected' : ''}>Наблюдатель</option>
                            <option value="editor" ${settings.defaultRole === 'editor' ? 'selected' : ''}>Редактор</option>
                            <option value="admin" ${settings.defaultRole === 'admin' ? 'selected' : ''}>Администратор</option>
                        </select>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">
                        <span class="settings-section-icon">🎨</span>
                        Настройки редактора
                    </div>
                    
                    <!-- ИСПРАВЛЕНА СТРУКТУРА: Текст идет ПЕРЕД ползунком -->
                    <div class="settings-field">
                        <label class="settings-toggle" for="grid-enabled">
                            <span class="settings-toggle-text">Включить сетку</span>
                            <input 
                                type="checkbox" 
                                id="grid-enabled" 
                                ${settings.gridEnabled !== false ? 'checked' : ''}
                                ${!canEdit ? 'disabled' : ''}
                            />
                            <span class="settings-toggle-slider"></span>
                        </label>
                    </div>

                    <!-- ИСПРАВЛЕНА СТРУКТУРА: Текст идет ПЕРЕД ползунком -->
                    <div class="settings-field">
                        <label class="settings-toggle" for="snap-enabled">
                            <span class="settings-toggle-text">Включить привязку</span>
                            <input 
                                type="checkbox" 
                                id="snap-enabled" 
                                ${settings.snapEnabled !== false ? 'checked' : ''}
                                ${!canEdit ? 'disabled' : ''}
                            />
                            <span class="settings-toggle-slider"></span>
                        </label>
                    </div>
                </div>

                ${canEdit ? `
                    <div class="settings-actions">
                        <button type="button" class="settings-btn settings-btn-primary" id="save-settings">
                            <span class="settings-btn-icon">💾</span>
                            Сохранить настройки
                        </button>
                        <button type="button" class="settings-btn" id="reset-settings">
                            <span class="settings-btn-icon">↺</span>
                            Сбросить изменения
                        </button>
                    </div>
                ` : `
                    <div class="settings-info">
                        <div class="settings-info-icon">👑</div>
                        <div class="settings-info-text">
                            <strong>Только администратор</strong>
                            <small>может изменять настройки комнаты</small>
                        </div>
                    </div>
                `}

                <div class="settings-meta">
                    <div class="settings-meta-item">
                        <span class="settings-meta-label">Создана:</span>
                        <span class="settings-meta-value">${new Date(settings.createdAt || Date.now()).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div class="settings-meta-item">
                        <span class="settings-meta-label">Пользователей:</span>
                        <span class="settings-meta-value">${settings.currentUsers || 0}/${settings.maxUsers || 20}</span>
                    </div>
                    ${settings.owner ? `
                        <div class="settings-meta-item">
                            <span class="settings-meta-label">Владелец:</span>
                            <span class="settings-meta-value">${settings.owner?.substring(0, 8)}...</span>
                        </div>
                    ` : ''}
                </div>
            `

            // Обработчики событий
            const visibilityGroup = form.querySelector('#visibility-group')
            if (visibilityGroup) {
                visibilityGroup.addEventListener('change', (e) => {
                    const passwordField = form.querySelector('#password-field')
                    if (e.target.value === ROOM_SETTINGS.PASSWORD) {
                        passwordField.style.display = 'block'
                    } else {
                        passwordField.style.display = 'none'
                    }
                })
            }

            const maxUsersRange = form.querySelector('#max-users')
            const maxUsersValue = form.querySelector('.settings-range-value')
            if (maxUsersRange && maxUsersValue) {
                maxUsersRange.addEventListener('input', (e) => {
                    maxUsersValue.textContent = e.target.value
                })
            }

            const saveBtn = form.querySelector('#save-settings')
            if (saveBtn) {
                saveBtn.addEventListener('click', saveSettings)
            }

            const resetBtn = form.querySelector('#reset-settings')
            if (resetBtn) {
                resetBtn.addEventListener('click', resetForm)
            }

            // Показываем статус
            updateStatus('ready', 'Настройки загружены')
        }

        function saveSettings() {
            const form = document.getElementById('settings-form')
            if (!form) return

            const newSettings = {
                name: form.querySelector('#room-name').value.trim(),
                description: form.querySelector('#room-description').value.trim(),
                visibility: form.querySelector('input[name="visibility"]:checked')?.value || ROOM_SETTINGS.PUBLIC,
                password: form.querySelector('#room-password')?.value || '',
                maxUsers: parseInt(form.querySelector('#max-users').value) || 20,
                defaultRole: form.querySelector('#default-role').value,
                gridEnabled: form.querySelector('#grid-enabled').checked,
                snapEnabled: form.querySelector('#snap-enabled').checked
            }

            // Валидация
            const validation = validateSettings(newSettings)
            if (!validation.valid) {
                updateStatus('error', validation.errors.join(', '))
                return
            }

            // Если пароль не требуется, очищаем его
            if (newSettings.visibility !== ROOM_SETTINGS.PASSWORD) {
                newSettings.password = ''
            }

            updateStatus('saving', 'Сохранение...')

            // Сохраняем в store для немедленного обновления UI
            setState({
                roomSettings: {
                    ...currentSettings,
                    ...newSettings
                }
            })

            // Отправляем на сервер
            const success = saveRoomSettings(newSettings)
            if (success) {
                updateStatus('success', 'Настройки сохранены')

                // Через 3 секунды скрываем статус
                setTimeout(() => {
                    updateStatus('ready', '')
                }, 3000)
            } else {
                updateStatus('error', 'Ошибка сохранения')
            }
        }

        function resetForm() {
            renderForm()
            updateStatus('info', 'Изменения сброшены')

            setTimeout(() => {
                updateStatus('ready', '')
            }, 2000)
        }

        function updateStatus(type, message) {
            const statusEl = document.getElementById('settings-status')
            if (!statusEl) return

            statusEl.className = `settings-status settings-status-${type}`
            statusEl.textContent = message
            statusEl.style.display = message ? 'block' : 'none'
        }

        // Первоначальный рендеринг
        renderForm()

        // Подписываемся на изменения
        unsubscribe = subscribe(renderForm)

        return () => {
            if (unsubscribe) unsubscribe()
        }
    }
})

// Добавляем стили для панели настроек
if (!document.getElementById('settings-panel-styles')) {
    const styleEl = document.createElement('style')
    styleEl.id = 'settings-panel-styles'
    styleEl.textContent = `
        .settings-panel {
            padding: 16px;
            color: #fff;
            font-family: 'Inter', sans-serif;
        }

        .settings-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #222;
        }

        .settings-title {
            font-size: 20px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
        }

        .settings-status {
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            display: none;
        }

        .settings-status-saving {
            background: rgba(255, 193, 7, 0.1);
            color: #ffc107;
            border: 1px solid rgba(255, 193, 7, 0.3);
        }

        .settings-status-success {
            background: rgba(32, 201, 151, 0.1);
            color: #20c997;
            border: 1px solid rgba(32, 201, 151, 0.3);
        }

        .settings-status-error {
            background: rgba(255, 71, 87, 0.1);
            color: #ff4757;
            border: 1px solid rgba(255, 71, 87, 0.3);
        }

        .settings-status-info {
            background: rgba(74, 158, 255, 0.1);
            color: #4a9eff;
            border: 1px solid rgba(74, 158, 255, 0.3);
        }

        .settings-section {
            margin-bottom: 24px;
            background: #1a1a1a;
            border: 1px solid #222;
            border-radius: 8px;
            padding: 16px;
        }

        .settings-section-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 16px;
        }

        .settings-section-icon {
            font-size: 18px;
        }

        .settings-field {
            margin-bottom: 16px;
        }

        .settings-field label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #ddd;
            margin-bottom: 8px;
        }

        .settings-field input[type="text"],
        .settings-field input[type="password"],
        .settings-field textarea,
        .settings-field select {
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

        .settings-field input:focus,
        .settings-field textarea:focus,
        .settings-field select:focus {
            border-color: #4a9eff;
            outline: none;
            background: #2c2c2c;
        }

        .settings-field textarea {
            resize: vertical;
            min-height: 60px;
        }

        .settings-hint {
            font-size: 12px;
            color: #888;
            margin-top: 4px;
        }

        .settings-radio-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .settings-radio {
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

        .settings-radio:hover {
            background: #333;
            border-color: #444;
        }

        .settings-radio input[type="radio"] {
            margin: 0;
        }

        .settings-radio-icon {
            font-size: 18px;
            width: 24px;
            text-align: center;
        }

        .settings-radio-text {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .settings-radio-text strong {
            font-size: 14px;
            color: #fff;
        }

        .settings-radio-text small {
            font-size: 12px;
            color: #888;
        }

        .settings-range {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .settings-range input[type="range"] {
            flex: 1;
            height: 4px;
            background: #333;
            border-radius: 2px;
            outline: none;
        }

        .settings-range-value {
            min-width: 40px;
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            color: #4a9eff;
        }

        /* ИСПРАВЛЕНО: Новая структура тогглов */
        .settings-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            padding: 12px 0;
            width: 100%;
        }

        /* Текст слева */
        .settings-toggle-text {
            font-size: 14px;
            color: #ddd;
            flex: 1;
            padding-right: 16px;
        }

        /* Контейнер для чекбокса и ползунка справа */
        .settings-toggle input[type="checkbox"] {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
        }

        /* Ползунок */
        .settings-toggle-slider {
            position: relative;
            display: inline-block;
            width: 52px;
            height: 28px;
            background: #333;
            border-radius: 14px;
            transition: all 0.3s ease;
            flex-shrink: 0;
        }

        .settings-toggle-slider:before {
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

        /* Состояние включено */
        .settings-toggle input:checked + .settings-toggle-slider {
            background: #4a9eff;
        }

        .settings-toggle input:checked + .settings-toggle-slider:before {
            transform: translateX(24px);
            background: #fff;
        }

        /* Состояние отключено */
        .settings-toggle input:not(:checked) + .settings-toggle-slider {
            background: #333;
        }

        .settings-toggle input:not(:checked) + .settings-toggle-slider:before {
            background: #888;
        }

        /* Hover состояния */
        .settings-toggle:hover .settings-toggle-slider {
            background: #444;
        }

        .settings-toggle:hover input:checked + .settings-toggle-slider {
            background: #3a8aef;
        }

        .settings-actions {
            display: flex;
            gap: 12px;
            margin: 24px 0;
        }

        .settings-btn {
            flex: 1;
            padding: 12px 16px;
            border-radius: 6px;
            border: 1px solid #333;
            background: #2a2a2a;
            color: #fff;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .settings-btn:hover {
            background: #333;
            border-color: #444;
        }

        .settings-btn-primary {
            background: #4a9eff;
            border-color: #4a9eff;
        }

        .settings-btn-primary:hover {
            background: #3a8aef;
            border-color: #3a8aef;
        }

        .settings-btn-icon {
            font-size: 16px;
        }

        .settings-info {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: rgba(224, 180, 0, 0.1);
            border: 1px solid rgba(224, 180, 0, 0.3);
            border-radius: 8px;
            margin: 24px 0;
        }

        .settings-info-icon {
            font-size: 20px;
            color: #e0b400;
        }

        .settings-info-text {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .settings-info-text strong {
            font-size: 14px;
            color: #e0b400;
        }

        .settings-info-text small {
            font-size: 12px;
            color: rgba(224, 180, 0, 0.8);
        }

        .settings-meta {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #222;
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

            .settings-meta {
                grid-template-columns: 1fr;
            }
            
            .settings-toggle {
                padding: 10px 0;
            }
            
            .settings-toggle-text {
                font-size: 13px;
                padding-right: 12px;
            }
            
            .settings-toggle-slider {
                width: 48px;
                height: 26px;
            }
            
            .settings-toggle-slider:before {
                width: 22px;
                height: 22px;
            }
            
            .settings-toggle input:checked + .settings-toggle-slider:before {
                transform: translateX(22px);
            }
        }
    `
    document.head.appendChild(styleEl)
}