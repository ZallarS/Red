const modules = new Map()

export function registerPanelModule(id, module) {
    modules.set(id, module)
}

export function getPanelModule(id) {
    return modules.get(id)
}

export function getAllModules() {
    return modules
}
