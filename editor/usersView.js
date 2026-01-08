// editor/usersView.js

// ===== ROLE CONFIG =====
const ROLE_META = {
    admin: {
        icon: '👑',
        color: '#e0b400',
        label: 'Admin'
    },
    editor: {
        icon: '✏️',
        color: '#4a90e2',
        label: 'Editor'
    },
    viewer: {
        icon: '👁',
        color: '#888',
        label: 'Viewer'
    }
}

// ===== ROLE DETECTION =====
function detectRole(user) {
    // 1️⃣ если сервер уже прислал нормальное поле
    if (user.role) {
        return user.role
    }

    // 2️⃣ распространённые варианты
    if (user.isAdmin) return 'admin'
    if (user.isEditor) return 'editor'

    // 3️⃣ permissions-массив
    if (Array.isArray(user.permissions)) {
        if (user.permissions.includes('admin')) return 'admin'
        if (user.permissions.includes('edit')) return 'editor'
    }

    // 4️⃣ fallback
    return 'viewer'
}

function getRoleMeta(role) {
    return ROLE_META[role] || {
        icon: '❓',
        color: '#999',
        label: role || 'Unknown'
    }
}

// ===== RENDER USERS =====
export function renderUsers(users, container) {
    container.innerHTML = ''

    for (const user of users.values()) {
        const role = detectRole(user)
        const roleMeta = getRoleMeta(role)

        const row = document.createElement('div')
        Object.assign(row.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 6px',
            borderRadius: '4px',
            cursor: 'default'
        })

        row.onmouseenter = () => {
            row.style.background = 'rgba(0,0,0,0.05)'
        }

        row.onmouseleave = () => {
            row.style.background = 'transparent'
        }

        // ===== ROLE ICON =====
        const roleIcon = document.createElement('span')
        roleIcon.textContent = roleMeta.icon
        roleIcon.title = roleMeta.label
        roleIcon.style.color = roleMeta.color
        roleIcon.style.width = '18px'
        roleIcon.style.textAlign = 'center'
        roleIcon.style.flexShrink = '0'

        // ===== USER NAME =====
        const name = document.createElement('span')
        name.textContent = user.name || `User ${user.id}`
        name.style.flex = '1'
        name.style.whiteSpace = 'nowrap'
        name.style.overflow = 'hidden'
        name.style.textOverflow = 'ellipsis'

        // ===== COLOR DOT =====
        const colorDot = document.createElement('span')
        Object.assign(colorDot.style, {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: user.color || '#000',
            flexShrink: '0'
        })

        row.append(roleIcon, name, colorDot)
        container.appendChild(row)
    }
}
