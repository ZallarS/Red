import { subscribe, setState } from '../store.js'
import { getPanelModule } from './panelRegistry.js'

export function createPanelContainer(side) {
    const root = document.createElement('div')
    const edge = document.createElement('div')

    // ===== PANEL ROOT =====
    Object.assign(root.style, {
        position: 'fixed',
        top: '0',
        [side]: '0',
        width: '220px',
        height: '100%',
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 3000
    })

    // ===== EDGE TOGGLE =====
    Object.assign(edge.style, {
        position: 'fixed',
        top: '50%',
        [side]: '0',
        transform: 'translateY(-50%)',
        width: '18px',
        height: '64px',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        cursor: 'pointer',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3001,
        fontSize: '12px',
        userSelect: 'none'
    })

    edge.textContent = side === 'left' ? '▶' : '◀'

    // ===== HEADER =====
    const header = document.createElement('div')
    Object.assign(header.style, {
        padding: '6px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    })

    const title = document.createElement('div')
    title.style.fontWeight = 'bold'

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.marginLeft = '8px'

    header.append(title, closeBtn)

    // ===== CONTENT =====
    const content = document.createElement('div')
    Object.assign(content.style, {
        flex: '1',
        overflow: 'auto',
        padding: '6px'
    })

    root.append(header, content)

    function toggle(open) {
        setState({
            panels: {
                [side]: {
                    open
                }
            }
        })
    }

    closeBtn.onclick = () => toggle(false)
    edge.onclick = () => toggle(true)

    let cleanupFunction = null

    function render(state) {
        const panelState = state.panels[side]
        const module = getPanelModule(panelState.active)

        // panel visibility
        root.style.display = panelState.open ? 'flex' : 'none'
        edge.style.display = panelState.open ? 'none' : 'flex'

        if (!module) return

        title.textContent = module.title

        // 🔥 ОЧИЩАЕМ ПРЕДЫДУЩИЙ РЕНДЕР
        if (cleanupFunction) {
            console.log(`🧹 Cleaning up previous ${side} panel render`)
            cleanupFunction()
            cleanupFunction = null
        }

        content.innerHTML = ''

        // 🔥 РЕНДЕРИМ И СОХРАНЯЕМ ФУНКЦИЮ ОЧИСТКИ
        const cleanup = module.render(content)
        if (typeof cleanup === 'function') {
            cleanupFunction = cleanup
        }
    }

    // 🔥 ВЕШАЕМ ПОДПИСКУ
    const unsubscribeStore = subscribe(render)

    // 🔥 ОЧИСТКА ПРИ УДАЛЕНИИ КОНТЕЙНЕРА
    const cleanupContainer = () => {
        console.log(`🧹 Cleaning up ${side} panel container`)
        if (cleanupFunction) {
            cleanupFunction()
            cleanupFunction = null
        }
        if (unsubscribeStore) {
            unsubscribeStore()
        }
        if (root.parentNode) {
            root.parentNode.removeChild(root)
        }
        if (edge.parentNode) {
            edge.parentNode.removeChild(edge)
        }
    }

    document.body.appendChild(root)
    document.body.appendChild(edge)

    // 🔥 ВОЗВРАЩАЕМ ФУНКЦИЮ ДЛЯ ОЧИСТКИ (опционально)
    return cleanupContainer
}