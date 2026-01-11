import { getState, setState, subscribe } from '../store.js'
import { registerPanelModule } from '../panels/panelRegistry.js'
import { setUserRole } from '../../actions.js'

// ===== ADAPTER (для editorCore.js) =====
export function setUsers(users) {
    if (!users) return

    const list =
        users instanceof Map
            ? [...users.values()]
            : Array.isArray(users)
                ? users
                : []

    console.log('📊 Обновление пользователей в магазине:', list.map(u => ({ id: u.id, role: u.role })))

    // 🔥 КРИТИЧНО: Всегда обновляем пользователей, даже если список кажется таким же
    setState({ users: list })
}

// ===== PANEL MODULE =====
registerPanelModule('users', {
    title: 'Пользователи',

    render(container) {
        container.innerHTML = ''

        const styles = document.createElement('style')
        styles.textContent = `
            .users-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .user-row {
                background: #1a1a1a;
                border: 1px solid #222;
                border-radius: 8px;
                padding: 12px;
                transition: all 0.2s ease;
            }
            
            .user-row:hover {
                background: #222;
                border-color: #333;
            }
            
            .user-row-you {
                border-color: #4a9eff;
                background: rgba(74, 158, 255, 0.1);
            }
            
            .user-info {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
            
            .user-color {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid #333;
            }
            
            .user-name {
                color: #fff;
                font-size: 14px;
                font-weight: 500;
            }
            
            .user-id {
                color: #888;
                font-size: 11px;
                font-family: 'JetBrains Mono', monospace;
                margin-top: 2px;
            }
            
            .user-role-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .role-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .role-admin {
                background: rgba(224, 180, 0, 0.1);
                color: #e0b400;
                border: 1px solid rgba(224, 180, 0, 0.3);
            }
            
            .role-editor {
                background: rgba(74, 158, 255, 0.1);
                color: #4a9eff;
                border: 1px solid rgba(74, 158, 255, 0.3);
            }
            
            .role-viewer {
                background: rgba(136, 136, 136, 0.1);
                color: #888;
                border: 1px solid rgba(136, 136, 136, 0.3);
            }
            
            .role-select {
                background: #2a2a2a;
                color: #fff;
                border: 1px solid #333;
                border-radius: 4px;
                padding: 6px 10px;
                font-size: 12px;
                font-family: 'Inter', sans-serif;
                cursor: pointer;
                min-width: 90px;
                transition: all 0.2s ease;
            }
            
            .role-select:focus {
                border-color: #4a9eff;
                outline: none;
            }
            
            .role-select option {
                background: #0f0f0f;
                color: #fff;
            }
            
            .you-badge {
                background: rgba(74, 158, 255, 0.2);
                color: #4a9eff;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                margin-left: 8px;
            }
            
            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }
            
            .empty-state-icon {
                font-size: 36px;
                margin-bottom: 12px;
                opacity: 0.5;
            }
            
            .empty-state-text {
                font-size: 14px;
                line-height: 1.5;
            }
        `
        container.appendChild(styles)

        // Создаем основные элементы
        const listEl = document.createElement('div')
        listEl.className = 'users-list'

        container.appendChild(listEl)

        // Переменная для хранения предыдущего состояния
        let prevState = null

        // Основная функция рендеринга
        function renderUsers() {
            const state = getState()
            const users = state.users || []
            const myId = state.userId
            const myRole = state.role

            // 🔥 Проверяем, изменилось ли состояние
            const stateChanged =
                !prevState ||
                prevState.users !== users ||
                prevState.userId !== myId ||
                prevState.role !== myRole ||
                JSON.stringify(users.map(u => ({ id: u.id, role: u.role }))) !==
                JSON.stringify((prevState.users || []).map(u => ({ id: u.id, role: u.role })))

            if (!stateChanged) {
                console.log('⚡ Панель пользователей: состояние не изменено, рендеринг пропущен')
                return
            }

            prevState = {
                users: [...users],
                userId: myId,
                role: myRole
            }

            console.log('🔄 Панель пользователей рендеринга:', {
                myId,
                myRole,
                usersCount: users.length,
                amIAdmin: myRole === 'admin'
            })

            listEl.innerHTML = ''

            if (users.length === 0) {
                const emptyMsg = document.createElement('div')
                emptyMsg.className = 'empty-state'
                emptyMsg.innerHTML = `
                    <div class="empty-state-icon">👤</div>
                    <div class="empty-state-text">Нет активных пользователей</div>
                `
                listEl.appendChild(emptyMsg)
                return
            }

            users.forEach(user => {
                const row = document.createElement('div')
                row.className = 'user-row'
                if (user.id === myId) {
                    row.classList.add('user-row-you')
                }

                // User info
                const userInfo = document.createElement('div')
                userInfo.className = 'user-info'

                const color = document.createElement('div')
                color.className = 'user-color'
                color.style.background = user.color || '#666'

                const nameContainer = document.createElement('div')
                nameContainer.style.flex = '1'

                const name = document.createElement('div')
                name.className = 'user-name'
                name.textContent = user.name || 'Аноним'

                const id = document.createElement('div')
                id.className = 'user-id'
                id.textContent = `ID: ${user.id.substring(0, 8)}...`

                nameContainer.appendChild(name)
                nameContainer.appendChild(id)
                userInfo.appendChild(color)
                userInfo.appendChild(nameContainer)

                // Role section
                const roleContainer = document.createElement('div')
                roleContainer.className = 'user-role-container'

                if (user.id === myId) {
                    const youBadge = document.createElement('span')
                    youBadge.className = 'you-badge'
                    youBadge.textContent = 'Вы'
                    name.appendChild(youBadge)
                }

                // 👑 СЕЛЕКТОР — ТОЛЬКО ЕСЛИ МЫ АДМИН И ЭТО НЕ МЫ
                if (myRole === 'admin' && user.id !== myId) {
                    console.log(`✅ Отображение селектора для пользователя ${user.id} Потому что я ${myRole}`)

                    const select = document.createElement('select')
                    select.className = 'role-select'
                    select.dataset.userId = user.id

                    const roles = ['admin', 'editor', 'viewer']
                    roles.forEach(role => {
                        const opt = document.createElement('option')
                        opt.value = role
                        opt.textContent = role === 'admin' ? 'Админ' :
                            role === 'editor' ? 'Редактор' : 'Наблюдатель'
                        if (role === user.role) opt.selected = true
                        select.appendChild(opt)
                    })

                    select.onchange = () => {
                        console.log(`📤 Изменение роли для ${user.id} для ${select.value}`)
                        setUserRole(user.id, select.value)
                    }

                    roleContainer.appendChild(select)
                } else {
                    console.log(`📝 Отображение текста роли для пользователя ${user.id}: ${user.role}`)

                    // Просто показываем роль
                    const roleBadge = document.createElement('div')
                    roleBadge.className = `role-badge role-${user.role || 'viewer'}`

                    if (user.role === 'admin') {
                        roleBadge.textContent = 'Админ'
                    } else if (user.role === 'editor') {
                        roleBadge.textContent = 'Редактор'
                    } else {
                        roleBadge.textContent = 'Наблюдатель'
                    }

                    roleContainer.appendChild(roleBadge)
                }

                row.appendChild(userInfo)
                row.appendChild(roleContainer)
                listEl.appendChild(row)
            })
        }

        // Первичный рендер
        renderUsers()

        // 🔥 ПОДПИСКА НА ИЗМЕНЕНИЯ ВСЕГО STATE
        const unsubscribe = subscribe(() => {
            console.log('📢 Обновлено хранилище, проверяется, не нуждается ли панель пользователей в повторном отображении')
            renderUsers()
        })

        // Возвращаем функцию очистки
        return () => {
            console.log('🧹 Очистка подписки на панель пользователей')
            if (unsubscribe) unsubscribe()
        }
    }
})

// 🔥 Гарантируем, что панель users активна
setState({
    panels: {
        right: {
            active: 'users'
        }
    }
})