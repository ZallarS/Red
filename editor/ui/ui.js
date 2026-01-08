import { createPanelContainer } from './panels/panelContainer.js'

// импорт модулей (ВАЖНО!)
import './modules/toolsPanel.js'
import './modules/usersPanel.js'

export function initUI() {
    createPanelContainer('left')
    createPanelContainer('right')
}
