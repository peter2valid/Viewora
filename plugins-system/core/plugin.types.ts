// Plugin system type contracts.
// No plugins are implemented in V1 — this is the foundation only.

export interface PluginContext {
  // Viewer adapter handles — populated by the viewer when it initialises.
  viewerHandle?: unknown
  // Editor store reference — populated in editor context only.
  editorStoreRef?: unknown
}

export interface Plugin {
  /** Unique machine-readable identifier. Must be kebab-case. */
  readonly name: string
  /** Human-readable description (used in debug logs). */
  readonly description?: string
  /**
   * Called once when the plugin is registered and a context is available.
   * Use this to attach event listeners, inject UI, etc.
   */
  init(context: PluginContext): void | Promise<void>
  /**
   * Called on viewer destroy or plugin removal.
   * Must remove all event listeners and free any resources.
   */
  destroy(): void
}

export interface PluginRegistration {
  plugin: Plugin
  enabled: boolean
}
