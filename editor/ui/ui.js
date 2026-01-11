import { createPanelContainer } from './panels/panelContainer.js'
import { subscribe, getState } from './store.js'

// импорт модулей (инициализация панелей)
import './modules/toolsPanel.js'
import './modules/usersPanel.js'

function applyRoleToUI(role) {
    const body = document.body

    // Удаляем все ролевые классы
    body.classList.remove('role-admin', 'role-editor', 'role-viewer')

    // Добавляем текущую роль
    if (role === 'admin') {
        body.classList.add('role-admin')
    } else if (role === 'editor') {
        body.classList.add('role-editor')
    } else if (role === 'viewer') {
        body.classList.add('role-viewer')
    }

    console.log(`🎭 UI role updated to: ${role}`)
}

export function initUI() {
    console.log('🔄 Initializing UI...')

    // создаём контейнеры панелей
    createPanelContainer('left')
    createPanelContainer('right')

    // применяем роль сразу
    const initialState = getState()
    console.log('📋 Initial state:', initialState)
    applyRoleToUI(initialState.role)

    // 🔥 РЕАКТИВНО обновляем UI при смене роли
    subscribe(state => {
        console.log('🔄 UI subscription triggered, role:', state.role)
        applyRoleToUI(state.role)
    })
}