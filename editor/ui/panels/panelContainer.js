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
        width: '280px',
        height: '100%',
        background: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 3000,
        borderRight: side === 'left' ? '1px solid #222' : 'none',
        borderLeft: side === 'right' ? '1px solid #222' : 'none',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    })

    // ===== EDGE TOGGLE =====
    Object.assign(edge.style, {
        position: 'fixed',
        top: '50%',
        [side]: '0',
        transform: 'translateY(-50%)',
        width: '20px',
        height: '60px',
        background: '#1a1a1a',
        color: '#888',
        cursor: 'pointer',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3001,
        fontSize: '12px',
        userSelect: 'none',
        border: '1px solid #222',
        borderRadius: side === 'left' ? '0 4px 4px 0' : '4px 0 0 4px',
        transition: 'all 0.2s ease'
    })

    edge.textContent = side === 'left' ? '▶' : '◀'

    edge.addEventListener('mouseenter', () => {
        edge.style.background = '#222'
        edge.style.color = '#fff'
    })

    edge.addEventListener('mouseleave', () => {
        edge.style.background = '#1a1a1a'
        edge.style.color = '#888'
    })

    // ===== HEADER =====
    const header = document.createElement('div')
    Object.assign(header.style, {
        padding: '20px 16px',
        borderBottom: '1px solid #222',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1a1a1a'
    })

    const title = document.createElement('div')
    title.style.fontWeight = '600'
    title.style.fontSize = '16px'
    title.style.color = '#fff'

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.background = 'none'
    closeBtn.style.border = 'none'
    closeBtn.style.color = '#888'
    closeBtn.style.fontSize = '20px'
    closeBtn.style.cursor = 'pointer'
    closeBtn.style.width = '24px'
    closeBtn.style.height = '24px'
    closeBtn.style.display = 'flex'
    closeBtn.style.alignItems = 'center'
    closeBtn.style.justifyContent = 'center'
    closeBtn.style.borderRadius = '4px'
    closeBtn.style.transition = 'all 0.2s ease'

    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#222'
        closeBtn.style.color = '#fff'
    })

    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none'
        closeBtn.style.color = '#888'
    })

    header.append(title, closeBtn)

    // ===== CONTENT =====
    const content = document.createElement('div')
    Object.assign(content.style, {
        flex: '1',
        overflow: 'auto',
        padding: '16px'
    })

    root.append(header, content)

    function toggle(open) {
        setState({
            panels: {
                [side]: { open }
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
            console.log(`🧹 Очистка предыдущих ${side} панелей рендера`)
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
        console.log(`🧹 Очистка ${side} контейнера панелей`)
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