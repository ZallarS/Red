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

    console.log('📊 Updating users in store:', list.map(u => ({ id: u.id, role: u.role })))

    // 🔥 КРИТИЧНО: Всегда обновляем пользователей, даже если список кажется таким же
    setState({ users: list })
}

// ===== PANEL MODULE =====
registerPanelModule('users', {
    title: 'Пользователи',

    render(container) {
        container.innerHTML = ''
        container.style.padding = '10px'

        // Создаем основные элементы
        const title = document.createElement('h3')
        title.textContent = 'Пользователи в комнате'
        title.style.margin = '0 0 10px 0'
        title.style.fontSize = '14px'
        title.style.color = '#ddd'

        const listEl = document.createElement('div')
        listEl.className = 'users-list'
        listEl.style.display = 'flex'
        listEl.style.flexDirection = 'column'
        listEl.style.gap = '8px'

        container.appendChild(title)
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
                console.log('⚡ Users panel: state unchanged, skipping render')
                return
            }

            prevState = {
                users: [...users],
                userId: myId,
                role: myRole
            }

            console.log('🔄 Rendering users panel:', {
                myId,
                myRole,
                usersCount: users.length,
                amIAdmin: myRole === 'admin'
            })

            listEl.innerHTML = ''

            if (users.length === 0) {
                const emptyMsg = document.createElement('div')
                emptyMsg.textContent = 'Нет пользователей'
                emptyMsg.style.color = '#888'
                emptyMsg.style.textAlign = 'center'
                emptyMsg.style.padding = '20px'
                listEl.appendChild(emptyMsg)
                return
            }

            users.forEach(user => {
                const row = document.createElement('div')
                row.className = 'user-row'
                row.style.display = 'flex'
                row.style.justifyContent = 'space-between'
                row.style.alignItems = 'center'
                row.style.padding = '8px'
                row.style.background = 'rgba(255,255,255,0.05)'
                row.style.borderRadius = '4px'
                row.style.border = user.id === myId ? '1px solid rgba(255,255,255,0.2)' : 'none'

                // ===== USER INFO =====
                const info = document.createElement('div')
                info.className = 'user-info'
                info.style.display = 'flex'
                info.style.alignItems = 'center'
                info.style.gap = '8px'
                info.style.flex = '1'

                const color = document.createElement('div')
                color.className = 'user-color'
                color.style.width = '12px'
                color.style.height = '12px'
                color.style.borderRadius = '50%'
                color.style.background = user.color || '#888'
                color.style.flexShrink = '0'

                const nameContainer = document.createElement('div')
                nameContainer.style.display = 'flex'
                nameContainer.style.flexDirection = 'column'
                nameContainer.style.gap = '2px'

                const name = document.createElement('span')
                name.className = 'user-name'
                name.textContent = user.name || 'Unknown'
                name.style.color = '#ddd'
                name.style.fontSize = '13px'

                const idLabel = document.createElement('span')
                idLabel.textContent = `ID: ${user.id.substring(0, 8)}...`
                idLabel.style.color = '#888'
                idLabel.style.fontSize = '11px'

                nameContainer.appendChild(name)
                nameContainer.appendChild(idLabel)
                info.append(color, nameContainer)

                // ===== ROLE CELL =====
                const roleCell = document.createElement('div')
                roleCell.className = 'user-role'
                roleCell.style.display = 'flex'
                roleCell.style.alignItems = 'center'
                roleCell.style.gap = '6px'

                // Показываем метку "Вы" для текущего пользователя
                if (user.id === myId) {
                    const youLabel = document.createElement('span')
                    youLabel.textContent = '(Вы)'
                    youLabel.style.color = '#4a90e2'
                    youLabel.style.fontSize = '11px'
                    roleCell.appendChild(youLabel)
                }

                // 👑 СЕЛЕКТОР — ТОЛЬКО ЕСЛИ МЫ АДМИН И ЭТО НЕ МЫ
                if (myRole === 'admin' && user.id !== myId) {
                    console.log(`✅ Showing selector for user ${user.id} because I am ${myRole}`)

                    const select = document.createElement('select')
                    select.style.background = '#2a2a2a'
                    select.style.color = '#fff'
                    select.style.border = '1px solid #e0b400' // Золотая рамка для админов
                    select.style.borderRadius = '3px'
                    select.style.padding = '4px 8px'
                    select.style.fontSize = '12px'
                    select.style.cursor = 'pointer'
                    select.style.minWidth = '80px'
                    select.style.fontWeight = 'bold'
                    select.dataset.userId = user.id

                    const roles = ['admin', 'editor', 'viewer']
                    roles.forEach(role => {
                        const opt = document.createElement('option')
                        opt.value = role
                        opt.textContent = role
                        if (role === user.role) opt.selected = true
                        select.appendChild(opt)
                    })

                    select.onchange = () => {
                        console.log(`📤 Changing role for ${user.id} to ${select.value}`)
                        setUserRole(user.id, select.value)
                    }

                    roleCell.appendChild(select)
                } else {
                    console.log(`📝 Showing role text for user ${user.id}: ${user.role}`)

                    // Просто показываем роль
                    const roleText = document.createElement('span')
                    roleText.textContent = user.role || 'viewer'
                    roleText.style.color =
                        user.role === 'admin' ? '#e0b400' :
                            user.role === 'editor' ? '#4a90e2' : '#888'
                    roleText.style.fontSize = '12px'
                    roleText.style.fontWeight = user.role === 'admin' ? 'bold' : 'normal'

                    roleCell.appendChild(roleText)
                }

                row.append(info, roleCell)
                listEl.appendChild(row)
            })
        }

        // Первичный рендер
        renderUsers()

        // 🔥 ПОДПИСКА НА ИЗМЕНЕНИЯ ВСЕГО STATE
        const unsubscribe = subscribe(() => {
            console.log('📢 Store updated, checking if users panel needs re-render')
            renderUsers()
        })

        // Возвращаем функцию очистки
        return () => {
            console.log('🧹 Cleaning up users panel subscription')
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