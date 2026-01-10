import { getState, setState, subscribe } from '../store.js'
import { registerPanelModule } from '../panels/panelRegistry.js'
import { setUserRole } from '../../actions.js'

// ===== ADAPTER (для editorCore.js) =====
export function setUsers(users) {
    if (!users) return

    const list =
        users instanceof Map ? [...users.values()] :
            Array.isArray(users) ? users :
                []

    setState({ users: list })
}

// ===== PANEL MODULE =====
registerPanelModule('users', {
    title: 'Users',

    render(container) {
        container.innerHTML = ''

        const listEl = document.createElement('div')
        listEl.className = 'users-list'
        container.appendChild(listEl)

        function renderUsers() {
            const state = getState()
            const users = state.users || []
            const myId = state.userId
            const myRole = state.role

            listEl.innerHTML = ''

            users.forEach(user => {
                const row = document.createElement('div')
                row.className = 'user-row'

                // ===== USER INFO =====
                const info = document.createElement('div')
                info.className = 'user-info'

                const color = document.createElement('span')
                color.className = 'user-color'
                color.style.background = user.color || '#888'

                const name = document.createElement('span')
                name.className = 'user-name'
                name.textContent = user.name || 'Unknown'

                info.append(color, name)

                // ===== ROLE =====
                const roleCell = document.createElement('div')
                roleCell.className = 'user-role'

                // Админ может менять роли других пользователей
                if (myRole === 'admin' && user.id !== myId) {
                    const select = document.createElement('select')

                    ;['admin', 'editor', 'viewer'].forEach(role => {
                        const opt = document.createElement('option')
                        opt.value = role
                        opt.textContent = role
                        if (role === user.role) opt.selected = true
                        select.appendChild(opt)
                    })

                    select.onchange = () => {
                        setUserRole(user.id, select.value)
                    }

                    roleCell.appendChild(select)
                } else {
                    roleCell.textContent = user.role || 'viewer'
                }

                row.append(info, roleCell)
                listEl.appendChild(row)
            })
        }

        renderUsers()
        subscribe(renderUsers)
    }
})

// 🔥 Гарантируем активацию панели users
setState({
    panels: {
        right: {
            active: 'users'
        }
    }
})
