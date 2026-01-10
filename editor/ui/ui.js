import { createPanelContainer } from './panels/panelContainer.js'
import { subscribe, getState } from './store.js'

// импорт модулей (инициализация панелей)
import './modules/toolsPanel.js'
import './modules/usersPanel.js'

function applyRoleToUI(role) {
    const body = document.body

    body.classList.toggle('role-admin', role === 'admin')
    body.classList.toggle('role-editor', role === 'editor')
    body.classList.toggle('role-viewer', role === 'viewer')
}

export function initUI() {
    // создаём контейнеры панелей
    createPanelContainer('left')
    createPanelContainer('right')

    // применяем роль сразу
    applyRoleToUI(getState().role)

    // 🔥 РЕАКТИВНО обновляем UI при смене роли
    subscribe(state => {
        applyRoleToUI(state.role)
    })
}
