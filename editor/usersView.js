export function renderUsers(users, container) {
    container.innerHTML = ''

    for (const u of users.values()) {
        let indicator = '●'
        let indicatorColor = '#4caf50'

        if (u.timeout) {
            indicator = '✕'
            indicatorColor = '#666'
        } else if (u.afk) {
            indicator = '○'
            indicatorColor = '#999'
        }

        const pingText = u.ping != null ? ` · ${u.ping}ms` : ''

        const div = document.createElement('div')
        div.style.color = u.timeout ? '#666' : u.color

        const ind = document.createElement('span')
        ind.textContent = indicator
        ind.style.color = indicatorColor
        ind.style.marginRight = '6px'

        const text = document.createElement('span')
        text.textContent = u.editing
            ? `${u.name}▌${pingText}`
            : `${u.name}${pingText}`

        div.append(ind, text)
        container.appendChild(div)
    }
}
