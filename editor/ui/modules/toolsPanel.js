// editor/ui/modules/toolsPanel.js
import { PanelBase, PanelFactory } from '../panelBase.js'
import { getState, setState, subscribe } from '../store.js'

/**
 * Панель инструментов (переработана на основе PanelBase)
 */
class ToolsPanel extends PanelBase {
    constructor() {
        super({
            id: 'tools',
            title: 'Инструменты',
            icon: '🛠️',
            requiredRoles: ['admin', 'editor','owner'],
            description: 'Основные инструменты для рисования',
            category: 'tools',
            version: '2.0.0'
        })

        this.tools = [
            { id: 'draw', label: 'Рисовать', icon: '✏️', description: 'Режим рисования' },
            { id: 'erase', label: 'Стереть', icon: '🧹', description: 'Режим стирания' }
        ]

        this.toolElements = new Map()
    }

    /**
     * Рендерит контент панели
     */
    renderContent() {
        // Очищаем контент
        this.content.innerHTML = ''

        // Создаем контейнер для инструментов
        const toolsContainer = document.createElement('div')
        toolsContainer.className = 'tools-container'

        // Создаем сетку инструментов
        const toolsGrid = document.createElement('div')
        toolsGrid.className = 'tools-grid'

        this.tools.forEach(tool => {
            const toolElement = this.createToolButton(tool)
            toolsGrid.appendChild(toolElement)
            this.toolElements.set(tool.id, toolElement)
        })

        toolsContainer.appendChild(toolsGrid)

        // Добавляем секцию с информацией
        const infoSection = this.createSection({
            title: 'Информация',
            icon: 'ℹ️'
        })

        const infoContent = document.createElement('div')
        infoContent.className = 'tools-info'
        infoContent.innerHTML = `
            <div class="tools-info-item">
                <span class="tools-info-label">Текущий инструмент:</span>
                <span class="tools-info-value" id="current-tool">Рисовать</span>
            </div>
            <div class="tools-info-item">
                <span class="tools-info-label">Горячие клавиши:</span>
                <span class="tools-info-value">D - Рисовать, E - Стереть</span>
            </div>
        `

        infoSection.appendChild(infoContent)
        toolsContainer.appendChild(infoSection)

        this.content.appendChild(toolsContainer)

        // Обновляем состояние инструментов
        this.updateToolStates()

        // Подписываемся на изменения состояния
        this.setupToolSubscriptions()

        // Применяем дополнительные стили
        this.applyToolStyles()
    }

    /**
     * Создает кнопку инструмента
     */
    createToolButton(tool) {
        const button = document.createElement('button')
        button.className = 'tool-button'
        button.dataset.tool = tool.id
        button.title = `${tool.label}: ${tool.description}`

        button.innerHTML = `
            <div class="tool-icon">${tool.icon}</div>
            <div class="tool-label">${tool.label}</div>
            ${tool.description ? `<div class="tool-description">${tool.description}</div>` : ''}
        `

        button.addEventListener('click', () => {
            this.selectTool(tool.id)
        })

        return button
    }

    /**
     * Выбирает инструмент
     */
    selectTool(toolId) {
        console.log(`🛠️ Выбран инструмент: ${toolId}`)

        // Обновляем состояние
        setState({ tool: toolId })

        // Обновляем UI
        this.updateToolStates()

        // Показываем сообщение
        const tool = this.tools.find(t => t.id === toolId)
        if (tool) {
            this.showMessage('info', `Выбран инструмент: ${tool.label}`)
        }
    }

    /**
     * Обновляет состояние кнопок инструментов
     */
    updateToolStates() {
        const state = getState()
        const currentTool = state.tool || 'draw'

        this.toolElements.forEach((element, toolId) => {
            const isActive = toolId === currentTool
            element.classList.toggle('active', isActive)

            // Обновляем иконку
            const icon = element.querySelector('.tool-icon')
            if (icon) {
                icon.style.color = isActive ? '#4a9eff' : '#888'
            }

            // Обновляем лейбл
            const label = element.querySelector('.tool-label')
            if (label) {
                label.style.color = isActive ? '#4a9eff' : '#ccc'
            }
        })

        // Обновляем информацию о текущем инструменте
        const currentToolElement = document.getElementById('current-tool')
        if (currentToolElement) {
            const tool = this.tools.find(t => t.id === currentTool)
            currentToolElement.textContent = tool ? tool.label : 'Неизвестно'
        }
    }

    /**
     * Настраивает подписки для инструментов
     */
    setupToolSubscriptions() {
        // Подписываемся на изменения инструмента
        this.unsubscribeTool = subscribe((state) => {
            if (state.tool !== this.lastTool) {
                this.lastTool = state.tool
                this.updateToolStates()
            }
        })

        this.cleanupFunctions.push(() => {
            if (this.unsubscribeTool) {
                this.unsubscribeTool()
            }
        })

        // Добавляем горячие клавиши
        const keyHandler = (e) => {
            // D - рисование
            if (e.key === 'd' || e.key === 'D') {
                e.preventDefault()
                this.selectTool('draw')
            }

            // E - стирание
            if (e.key === 'e' || e.key === 'E') {
                e.preventDefault()
                this.selectTool('erase')
            }
        }

        window.addEventListener('keydown', keyHandler)
        this.cleanupFunctions.push(() => {
            window.removeEventListener('keydown', keyHandler)
        })
    }

    /**
     * Применяет стили для инструментов
     */
    applyToolStyles() {
        // Проверяем, не добавлены ли уже стили
        if (document.getElementById('tools-panel-styles')) return

        const styleEl = document.createElement('style')
        styleEl.id = 'tools-panel-styles'
        styleEl.textContent = `
            .tools-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .tools-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 12px;
            }
            
            .tool-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 16px 8px;
                background: #1a1a1a;
                border: 2px solid #222;
                border-radius: 8px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 100px;
                outline: none;
            }
            
            .tool-button:hover {
                background: #222;
                border-color: #333;
                transform: translateY(-2px);
            }
            
            .tool-button.active {
                border-color: #4a9eff;
                background: rgba(74, 158, 255, 0.1);
            }
            
            .tool-icon {
                font-size: 24px;
                margin-bottom: 8px;
                transition: color 0.2s ease;
            }
            
            .tool-label {
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 4px;
                transition: color 0.2s ease;
            }
            
            .tool-description {
                font-size: 11px;
                color: #888;
                text-align: center;
                line-height: 1.3;
            }
            
            .tools-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .tools-info-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #222;
            }
            
            .tools-info-label {
                font-size: 13px;
                color: #888;
            }
            
            .tools-info-value {
                font-size: 13px;
                color: #4a9eff;
                font-weight: 500;
            }
            
            @media (max-width: 768px) {
                .tools-grid {
                    grid-template-columns: 1fr 1fr;
                }
                
                .tool-button {
                    min-height: 80px;
                    padding: 12px 6px;
                }
                
                .tool-icon {
                    font-size: 20px;
                }
                
                .tool-label {
                    font-size: 12px;
                }
            }
        `
        document.head.appendChild(styleEl)
    }
}

// Создаем и регистрируем панель
const toolsPanel = new ToolsPanel()
PanelFactory.register(toolsPanel)

// Экспортируем для использования в других модулях
export { toolsPanel }