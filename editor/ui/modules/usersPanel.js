import { registerPanelModule } from '../panels/panelRegistry.js'
import { renderUsers } from '../../usersView.js'

let users = new Map()
let container = null

function update() {
    if (!container) return
    renderUsers(users, container)
}

export function setUsers(newUsers) {
    users = newUsers
    update()
}

registerPanelModule('users', {
    title: 'Users',

    render(el) {
        // очищаем контейнер панели
        el.innerHTML = ''

        // ===== ВНУТРЕННЯЯ ПОДЛОЖКА ДЛЯ ЧИТАЕМОСТИ =====
        const card = document.createElement('div')
        Object.assign(card.style, {
            background: 'rgba(255,255,255,0.92)',
            color: '#111',
            borderRadius: '8px',
            padding: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            fontSize: '13px',
            lineHeight: '1.4'
        })

        // контейнер, в который реально рендерятся пользователи
        const list = document.createElement('div')
        Object.assign(list.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        })

        card.appendChild(list)
        el.appendChild(card)

        // сохраняем ссылку для renderUsers
        container = list
        update()
    }
})
