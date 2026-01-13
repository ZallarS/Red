// editor/ui/modules/usersPanel.js
import { PanelBase, PanelFactory } from '../panelBase.js'
import { getState, subscribe } from '../store.js'
import { setUserRole } from '../../actions.js'
import { ROLE_META, MESSAGES  } from '../../config.js'

/**
 * Панель пользователей (исправленная версия)
 */
class UsersPanel extends PanelBase {
    constructor() {
        super({
            id: 'users',
            title: 'Пользователи',
            icon: '👥',
            requiredRoles: ['owner', 'admin', 'editor', 'viewer'],
            description: 'Управление пользователями и ролями',
            category: 'users',
            version: '2.0.2' // Обновляем версию
        })

        this.users = []
        this.myId = null
        this.myRole = null
    }

    /**
     * Рендерит контент панели
     */
    renderContent() {
        // Очищаем контент
        this.content.innerHTML = ''

        // Создаем заголовок с статистикой
        const statsSection = this.createSection({
            title: 'Статистика',
            icon: '📊'
        })

        const statsContent = document.createElement('div')
        statsContent.className = 'users-stats'
        statsContent.innerHTML = `
            <div class="users-stats-grid">
                <div class="users-stat">
                    <div class="users-stat-value" id="total-users">0</div>
                    <div class="users-stat-label">Всего</div>
                </div>
                <div class="users-stat">
                    <div class="users-stat-value" id="active-users">0</div>
                    <div class="users-stat-label">Активных</div>
                </div>
                <div class="users-stat">
                    <div class="users-stat-value" id="admin-users">0</div>
                    <div class="users-stat-label">Админов</div>
                </div>
            </div>
        `

        statsSection.appendChild(statsContent)
        this.content.appendChild(statsSection)

        // Создаем контейнер для списка пользователей
        const listContainer = document.createElement('div')
        listContainer.className = 'users-list-container'

        const listHeader = document.createElement('div')
        listHeader.className = 'users-list-header'
        listHeader.innerHTML = `
            <div class="users-list-title">Список пользователей</div>
            <div class="users-list-actions">
                <button class="panel-btn" id="refresh-users" title="Обновить список">
                    <span class="panel-btn-icon">🔄</span>
                </button>
            </div>
        `

        listContainer.appendChild(listHeader)

        const usersList = document.createElement('div')
        usersList.className = 'users-list'
        usersList.id = 'users-list-content'
        listContainer.appendChild(usersList)

        this.content.appendChild(listContainer)

        // Рендерим список пользователей
        this.renderUsersList()

        // Настраиваем обработчики
        this.setupEventHandlers()

        // Применяем стили
        this.applyUsersStyles()

        // Подписываемся на изменения
        this.setupSubscriptions()
    }

    /**
     * Рендерит список пользователей
     */
    renderUsersList() {
        const state = getState()
        this.users = state.users || []
        this.myId = state.userId
        this.myRole = state.role

        const usersList = document.getElementById('users-list-content')
        if (!usersList) return

        // Очищаем список
        usersList.innerHTML = ''

        if (this.users.length === 0) {
            const emptyState = document.createElement('div')
            emptyState.className = 'users-empty'
            emptyState.innerHTML = `
                <div class="users-empty-icon">👤</div>
                <div class="users-empty-title">Нет пользователей</div>
                <div class="users-empty-text">В комнате пока нет других пользователей</div>
            `
            usersList.appendChild(emptyState)
            return
        }

        // Сортируем пользователей: сначала владельцы, потом админы, потом редакторы, потом наблюдатели
        const sortedUsers = [...this.users].sort((a, b) => {
            const roleOrder = { owner: 0, admin: 1, editor: 2, viewer: 3 }
            return roleOrder[a.role] - roleOrder[b.role]
        })

        // Создаем элементы пользователей
        sortedUsers.forEach(user => {
            const userElement = this.createUserElement(user)
            usersList.appendChild(userElement)
        })

        // Обновляем статистику
        this.updateStats()
    }

    /**
     * Создает элемент пользователя
     */
    createUserElement(user) {
        const element = document.createElement('div')
        element.className = 'user-item'
        if (user.id === this.myId) {
            element.classList.add('user-item-me')
        }

        const roleMeta = ROLE_META[user.role] || ROLE_META.viewer

        // Контейнер для всей информации о пользователе
        const userContainer = document.createElement('div')
        userContainer.className = 'user-container'

        // Левая часть: аватар и основная информация
        const userMain = document.createElement('div')
        userMain.className = 'user-main'

        const avatar = document.createElement('div')
        avatar.className = 'user-avatar'
        avatar.style.backgroundColor = user.color || roleMeta.color
        avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U'

        const userInfo = document.createElement('div')
        userInfo.className = 'user-info'

        const nameRow = document.createElement('div')
        nameRow.className = 'user-name-row'

        const name = document.createElement('div')
        name.className = 'user-name'
        name.textContent = user.name || 'Аноним'

        if (user.id === this.myId) {
            const youBadge = document.createElement('span')
            youBadge.className = 'user-badge-you'
            youBadge.textContent = 'Вы'
            name.appendChild(youBadge)
        }

        nameRow.appendChild(name)

        const id = document.createElement('div')
        id.className = 'user-id'
        id.textContent = `ID: ${user.id?.substring(0, 8)}...`

        userInfo.appendChild(nameRow)
        userInfo.appendChild(id)

        userMain.appendChild(avatar)
        userMain.appendChild(userInfo)

        // Правая часть: текущая роль
        const userRole = document.createElement('div')
        userRole.className = 'user-role-display'

        const roleBadge = document.createElement('div')
        roleBadge.className = `user-role-badge user-role-${user.role}`
        roleBadge.innerHTML = `
            <span class="user-role-icon">${roleMeta.icon}</span>
            <span class="user-role-text">${roleMeta.label}</span>
        `

        userRole.appendChild(roleBadge)

        userContainer.appendChild(userMain)
        userContainer.appendChild(userRole)

        // Дополнительная секция с селектором роли (если нужно)
        const canChangeRole = (
            (this.myRole === 'owner' || this.myRole === 'admin') &&
            user.id !== this.myId &&
            user.role !== 'owner'
        )

        if (canChangeRole) {
            const roleSelectorSection = document.createElement('div')
            roleSelectorSection.className = 'user-role-selector-section'

            const selectorLabel = document.createElement('div')
            selectorLabel.className = 'user-role-selector-label'
            selectorLabel.innerHTML = `
                <span class="user-role-selector-icon">🔄</span>
                <span>Изменить роль:</span>
            `

            const roleSelect = document.createElement('select')
            roleSelect.className = 'user-role-select'
            roleSelect.dataset.userId = user.id

            // Создаем опции ролей
            const availableRoles = []

            if (this.myRole === 'owner') {
                availableRoles.push({ value: 'owner', label: 'Владелец' })
            }

            availableRoles.push(
                { value: 'admin', label: 'Администратор' },
                { value: 'editor', label: 'Редактор' },
                { value: 'viewer', label: 'Наблюдатель' }
            )

            availableRoles.forEach(role => {
                const option = document.createElement('option')
                option.value = role.value
                option.textContent = role.label
                if (role.value === user.role) option.selected = true
                roleSelect.appendChild(option)
            })

            roleSelect.addEventListener('change', (e) => {
                this.changeUserRole(user.id, e.target.value)
            })

            roleSelectorSection.appendChild(selectorLabel)
            roleSelectorSection.appendChild(roleSelect)
            userContainer.appendChild(roleSelectorSection)
        } else if (user.id === this.myId) {
            // Информация о том, что нельзя изменить свою роль
            const roleInfo = document.createElement('div')
            roleInfo.className = 'user-role-info'
            roleInfo.innerHTML = `
                <span class="user-role-info-icon">ℹ️</span>
                <span class="user-role-info-text">Вы не можете изменить свою роль</span>
            `
            userContainer.appendChild(roleInfo)
        } else if (user.role === 'owner') {
            // Информация о владельце
            const ownerInfo = document.createElement('div')
            ownerInfo.className = 'user-role-info user-role-info-owner'
            ownerInfo.innerHTML = `
                <span class="user-role-info-icon">👑</span>
                <span class="user-role-info-text">Роль владельца нельзя изменить</span>
            `
            userContainer.appendChild(ownerInfo)
        }

        element.appendChild(userContainer)
        return element
    }

    /**
     * Изменяет роль пользователя
     */
    changeUserRole(userId, newRole) {
        console.log(`📤 Изменение роли для ${userId} на ${newRole}`)

        // Проверка для владельца
        const user = this.users.find(u => u.id === userId)
        if (user && user.role === 'owner') {
            this.showMessage('error', MESSAGES.OWNER_IMMUNE)
            return
        }

        setUserRole(userId, newRole)
        this.showMessage('info', `Запрос на изменение роли отправлен`)

        // Визуальная обратная связь
        const select = document.querySelector(`.user-role-select[data-user-id="${userId}"]`)
        if (select) {
            const originalColor = select.style.backgroundColor
            select.style.backgroundColor = 'rgba(74, 158, 255, 0.2)'
            setTimeout(() => {
                select.style.backgroundColor = originalColor
            }, 1000)
        }
    }

    /**
     * Обновляет статистику
     */
    updateStats() {
        const totalUsers = this.users.length
        const activeUsers = this.users.filter(u => !u.afk).length
        const adminUsers = this.users.filter(u => u.role === 'admin' || u.role === 'owner').length

        document.getElementById('total-users').textContent = totalUsers
        document.getElementById('active-users').textContent = activeUsers
        document.getElementById('admin-users').textContent = adminUsers
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventHandlers() {
        const refreshBtn = document.getElementById('refresh-users')
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.renderUsersList()
                this.showMessage('info', 'Список пользователей обновлен')
            })

            this.cleanupFunctions.push(() => {
                refreshBtn.removeEventListener('click', this.renderUsersList)
            })
        }
    }

    /**
     * Настраивает подписки
     */
    setupSubscriptions() {
        // Подписываемся на изменения пользователей
        this.unsubscribeUsers = subscribe((state) => {
            const newUsers = state.users || []
            const usersChanged = JSON.stringify(newUsers) !== JSON.stringify(this.users)

            if (usersChanged) {
                this.users = newUsers
                this.renderUsersList()
            }

            if (state.userId !== this.myId) {
                this.myId = state.userId
            }

            if (state.role !== this.myRole) {
                this.myRole = state.role
                this.renderUsersList()
            }
        })

        this.cleanupFunctions.push(() => {
            if (this.unsubscribeUsers) {
                this.unsubscribeUsers()
            }
        })
    }

    /**
     * Применяет стили для панели пользователей
     */
    applyUsersStyles() {
        if (document.getElementById('users-panel-styles')) return

        const styleEl = document.createElement('style')
        styleEl.id = 'users-panel-styles'
        styleEl.textContent = `
            .users-stats {
                padding: 12px 0;
            }
            
            .users-stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }
            
            .users-stat {
                text-align: center;
                padding: 12px;
                background: #2a2a2a;
                border-radius: 8px;
                border: 1px solid #333;
            }
            
            .users-stat-value {
                font-size: 20px;
                font-weight: 600;
                color: #4a9eff;
                margin-bottom: 4px;
            }
            
            .users-stat-label {
                font-size: 11px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .users-list-container {
                margin-top: 16px;
            }
            
            .users-list-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .users-list-title {
                font-size: 14px;
                font-weight: 600;
                color: #ddd;
            }
            
            .users-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
                max-height: 500px;
                overflow-y: auto;
                padding: 4px 4px 4px 0;
            }
            
            .users-list::-webkit-scrollbar {
                width: 6px;
            }
            
            .users-list::-webkit-scrollbar-track {
                background: #1a1a1a;
                border-radius: 3px;
            }
            
            .users-list::-webkit-scrollbar-thumb {
                background: #333;
                border-radius: 3px;
            }
            
            .users-list::-webkit-scrollbar-thumb:hover {
                background: #444;
            }
            
            .user-item {
                background: #1a1a1a;
                border: 1px solid #222;
                border-radius: 10px;
                padding: 0;
                overflow: hidden;
                transition: all 0.2s ease;
                min-height: auto;
            }
            
            .user-item:hover {
                background: #222;
                border-color: #333;
            }
            
            .user-item-me {
                border-color: #4a9eff;
                background: rgba(74, 158, 255, 0.05);
            }
            
            .user-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 16px;
            }
            
            .user-main {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .user-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: white;
                font-size: 18px;
                flex-shrink: 0;
            }
            
            .user-info {
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }
            
            .user-name-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
                min-width: 0;
            }
            
            .user-name {
                font-size: 16px;
                font-weight: 500;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            }
            
            .user-badge-you {
                background: rgba(74, 158, 255, 0.2);
                color: #4a9eff;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                white-space: nowrap;
                flex-shrink: 0;
            }
            
            .user-id {
                font-size: 12px;
                color: #666;
                font-family: 'JetBrains Mono', monospace;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .user-role-display {
                display: flex;
                justify-content: flex-end;
            }
            
            .user-role-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                white-space: nowrap;
            }
            
            .user-role-owner {
                color: #ff6b35;
                background: rgba(255, 107, 53, 0.1);
                border: 1px solid rgba(255, 107, 53, 0.3);
            }
            
            .user-role-admin {
                color: #e0b400;
                background: rgba(224, 180, 0, 0.1);
                border: 1px solid rgba(224, 180, 0, 0.3);
            }
            
            .user-role-editor {
                color: #4a9eff;
                background: rgba(74, 158, 255, 0.1);
                border: 1px solid rgba(74, 158, 255, 0.3);
            }
            
            .user-role-viewer {
                color: #888;
                background: rgba(136, 136, 136, 0.1);
                border: 1px solid rgba(136, 136, 136, 0.3);
            }
            
            .user-role-icon {
                font-size: 14px;
            }
            
            .user-role-text {
                font-size: 12px;
            }
            
            .user-role-selector-section {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid #222;
                margin-top: 4px;
            }
            
            .user-role-selector-label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #ccc;
                white-space: nowrap;
            }
            
            .user-role-selector-icon {
                font-size: 14px;
            }
            
            .user-role-select {
                width: 100%;
                padding: 10px 12px;
                background: #2a2a2a;
                border: 1px solid #333;
                border-radius: 6px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                transition: all 0.2s ease;
                cursor: pointer;
                box-sizing: border-box;
            }
            
            .user-role-select:focus {
                border-color: #4a9eff;
                outline: none;
                background: #2c2c2c;
            }
            
            .user-role-info {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(136, 136, 136, 0.1);
                border-radius: 6px;
                font-size: 13px;
                color: #888;
                margin-top: 8px;
                border-top: 1px solid #222;
                padding-top: 12px;
            }
            
            .user-role-info-owner {
                background: rgba(255, 107, 53, 0.1);
                color: #ff6b35;
            }
            
            .users-empty {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }
            
            .users-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            
            .users-empty-title {
                font-size: 16px;
                margin-bottom: 8px;
                color: #888;
            }
            
            .users-empty-text {
                font-size: 13px;
                line-height: 1.4;
            }
            
            /* Адаптивность */
            @media (max-width: 768px) {
                .users-stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .user-container {
                    padding: 12px;
                }
                
                .user-main {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .user-info {
                    width: 100%;
                }
                
                .user-name {
                    font-size: 14px;
                }
                
                .user-role-display {
                    justify-content: flex-start;
                }
                
                .user-role-badge {
                    padding: 6px 10px;
                    font-size: 12px;
                }
            }
            
            @media (max-width: 480px) {
                .user-avatar {
                    width: 40px;
                    height: 40px;
                    font-size: 16px;
                }
                
                .user-name {
                    font-size: 13px;
                }
                
                .user-badge-you {
                    font-size: 10px;
                    padding: 3px 6px;
                }
                
                .user-id {
                    font-size: 11px;
                }
                
                .user-role-select {
                    font-size: 13px;
                    padding: 8px 10px;
                }
                
                .user-role-selector-label {
                    font-size: 12px;
                }
                
                .user-role-info {
                    font-size: 12px;
                }
            }
        `
        document.head.appendChild(styleEl)
    }
}

// Создаем и регистрируем панель
const usersPanel = new UsersPanel()
PanelFactory.register(usersPanel)

// Экспортируем адаптер для обратной совместимости
export function setUsers(users) {
    if (!users) return
    const list = users instanceof Map ? [...users.values()] : Array.isArray(users) ? users : []
    console.log('📊 Обновление пользователей в магазине:', list.map(u => ({ id: u.id, role: u.role })))
}

export { usersPanel }