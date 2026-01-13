import { getState, setState, subscribe } from '../store.js'
import { setUserRole } from '../../actions.js'
import { ROLE_META, ROLES, MESSAGES } from '../../constants.js'

// ===== ADAPTER =====
export function setUsers(users) {
    if (!users) return

    const list =
        users instanceof Map
            ? [...users.values()]
            : Array.isArray(users)
                ? users
                : []

    console.log('📊 Обновление пользователей в магазине:', list.map(u => ({ id: u.id, role: u.role })))
    setState({ users: list })
}

// Регистрируем модуль в глобальном реестре
if (!window.__canvasverse_panelModules) {
    window.__canvasverse_panelModules = new Map()
}

window.__canvasverse_panelModules.set('users', {
    title: 'Пользователи',
    requiredRoles: ['owner', 'admin', 'editor', 'viewer'],

    render(container) {
        console.log('👥 Рендерим панель пользователей')

        const panel = document.createElement('div')
        panel.className = 'users-panel'

        const header = document.createElement('div')
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid #222;
            background: #1a1a1a;
        `

        const title = document.createElement('div')
        title.textContent = 'Пользователи'
        title.style.cssText = `
            color: #fff;
            font-size: 14px;
            font-weight: 600;
        `

        header.appendChild(title)
        panel.appendChild(header)

        const listContainer = document.createElement('div')
        listContainer.className = 'users-list'
        listContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 12px;
        `

        panel.appendChild(listContainer)
        container.appendChild(panel)

        let prevState = null

        function renderUsersList() {
            const state = getState()
            const users = state.users || []
            const myId = state.userId
            const myRole = state.role

            // Проверяем, изменилось ли состояние
            const stateChanged =
                !prevState ||
                prevState.users !== users ||
                prevState.userId !== myId ||
                prevState.role !== myRole

            if (!stateChanged) return

            prevState = { users: [...users], userId: myId, role: myRole }
            listContainer.innerHTML = ''

            if (users.length === 0) {
                const emptyMsg = document.createElement('div')
                emptyMsg.style.cssText = `
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                `
                emptyMsg.innerHTML = `
                    <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.5">👤</div>
                    <div>Нет активных пользователей</div>
                `
                listContainer.appendChild(emptyMsg)
                return
            }

            users.forEach(user => {
                const row = document.createElement('div')
                row.className = 'user-row'
                if (user.id === myId) row.classList.add('user-row-you')

                // Информация о пользователе
                const userInfo = document.createElement('div')
                userInfo.className = 'user-info'

                const color = document.createElement('div')
                color.className = 'user-color'
                const roleMeta = ROLE_META[user.role] || ROLE_META.viewer
                color.style.background = user.color || roleMeta.color || '#666'

                const nameContainer = document.createElement('div')
                nameContainer.style.flex = '1'

                const name = document.createElement('div')
                name.className = 'user-name'
                name.textContent = user.name || 'Аноним'

                const id = document.createElement('div')
                id.className = 'user-id'
                id.textContent = `ID: ${user.id?.substring(0, 8) || 'unknown'}...`

                nameContainer.appendChild(name)
                nameContainer.appendChild(id)
                userInfo.appendChild(color)
                userInfo.appendChild(nameContainer)

                // Блок роли
                const roleContainer = document.createElement('div')
                roleContainer.className = 'user-role-container'

                // Если это текущий пользователь, показываем бейдж
                if (user.id === myId) {
                    const youBadge = document.createElement('span')
                    youBadge.className = 'you-badge'
                    youBadge.textContent = 'Вы'
                    name.appendChild(youBadge)
                }

                // Определяем, можно ли менять роль этому пользователю
                const canChangeRole = (
                    // Только владелец или админ могут менять роли
                    (myRole === 'owner' || myRole === 'admin') &&
                    // Нельзя менять свою собственную роль (кроме некоторых случаев)
                    user.id !== myId &&
                    // Нельзя менять роль владельца
                    user.role !== 'owner'
                )

                // Если можем менять роль - показываем селектор
                if (canChangeRole) {
                    const select = document.createElement('select')
                    select.className = 'role-select'
                    select.dataset.userId = user.id

                    // Создаем список ролей, доступных для назначения
                    const roles = [
                        { value: 'admin', label: 'Админ' },
                        { value: 'editor', label: 'Редактор' },
                        { value: 'viewer', label: 'Наблюдатель' }
                    ]

                    // Владелец может назначать роль owner
                    if (myRole === 'owner') {
                        roles.unshift({ value: 'owner', label: 'Владелец' })
                    }

                    roles.forEach(role => {
                        const option = document.createElement('option')
                        option.value = role.value
                        option.textContent = role.label
                        if (role.value === user.role) option.selected = true
                        select.appendChild(option)
                    })

                    select.addEventListener('change', () => {
                        console.log(`📤 Изменение роли для ${user.id} на ${select.value}`)

                        // Дополнительная проверка для владельца
                        if (user.role === 'owner') {
                            alert(MESSAGES.OWNER_IMMUNE)
                            select.value = user.role // Сбрасываем значение
                            return
                        }

                        setUserRole(user.id, select.value)
                    })

                    roleContainer.appendChild(select)
                } else {
                    // Просто показываем роль с бейджем
                    const roleBadge = document.createElement('div')
                    roleBadge.className = `role-badge role-${user.role || 'viewer'}`

                    // Используем метаданные роли для отображения
                    const roleMeta = ROLE_META[user.role] || ROLE_META.viewer
                    roleBadge.textContent = roleMeta.label
                    roleBadge.style.color = roleMeta.color
                    roleBadge.style.borderColor = `${roleMeta.color}30`
                    roleBadge.style.background = `${roleMeta.color}10`

                    roleContainer.appendChild(roleBadge)
                }

                row.appendChild(userInfo)
                row.appendChild(roleContainer)
                listContainer.appendChild(row)
            })
        }

        // Первоначальный рендеринг
        renderUsersList()

        // Подписываемся на изменения
        const unsubscribe = subscribe(renderUsersList)

        return () => {
            if (unsubscribe) unsubscribe()
        }
    }
})