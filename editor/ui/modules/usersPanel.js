import { getState, setState, subscribe } from '../store.js'
import { setUserRole } from '../../actions.js'

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
    // Панель пользователей доступна всем ролям
    requiredRoles: ['admin', 'editor', 'viewer'],

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
                color.style.background = user.color || '#666'

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

                // Если мы админ и это не мы - показываем селектор ролей
                if (myRole === 'admin' && user.id !== myId) {
                    const select = document.createElement('select')
                    select.className = 'role-select'
                    select.dataset.userId = user.id

                    const roles = [
                        { value: 'admin', label: 'Админ' },
                        { value: 'editor', label: 'Редактор' },
                        { value: 'viewer', label: 'Наблюдатель' }
                    ]

                    roles.forEach(role => {
                        const option = document.createElement('option')
                        option.value = role.value
                        option.textContent = role.label
                        if (role.value === user.role) option.selected = true
                        select.appendChild(option)
                    })

                    select.addEventListener('change', () => {
                        console.log(`📤 Изменение роли для ${user.id} на ${select.value}`)
                        setUserRole(user.id, select.value)
                    })

                    roleContainer.appendChild(select)
                } else {
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