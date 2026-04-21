import type { Plugin, PluginContext, PluginRegistration } from './plugin.types'

// Central plugin registry. One instance per viewer/editor mount.
// Usage:
//   const manager = createPluginManager()
//   manager.register(myPlugin)
//   manager.initAll({ viewerHandle })
//   // on teardown:
//   manager.destroyAll()

export function createPluginManager() {
  const registry = new Map<string, PluginRegistration>()

  function register(plugin: Plugin, enabled = true): void {
    if (registry.has(plugin.name)) {
      console.warn(`[PluginManager] Plugin "${plugin.name}" is already registered. Skipping.`)
      return
    }
    registry.set(plugin.name, { plugin, enabled })
  }

  function unregister(name: string): void {
    const entry = registry.get(name)
    if (entry) {
      entry.plugin.destroy()
      registry.delete(name)
    }
  }

  function enable(name: string): void {
    const entry = registry.get(name)
    if (entry) entry.enabled = true
  }

  function disable(name: string): void {
    const entry = registry.get(name)
    if (entry) entry.enabled = false
  }

  async function initAll(context: PluginContext): Promise<void> {
    for (const { plugin, enabled } of registry.values()) {
      if (!enabled) continue
      try {
        await plugin.init(context)
      } catch (err) {
        console.error(`[PluginManager] Failed to init plugin "${plugin.name}":`, err)
      }
    }
  }

  function destroyAll(): void {
    for (const { plugin } of registry.values()) {
      try {
        plugin.destroy()
      } catch (err) {
        console.error(`[PluginManager] Failed to destroy plugin "${plugin.name}":`, err)
      }
    }
    registry.clear()
  }

  function list(): PluginRegistration[] {
    return Array.from(registry.values())
  }

  return { register, unregister, enable, disable, initAll, destroyAll, list }
}

export type PluginManager = ReturnType<typeof createPluginManager>
