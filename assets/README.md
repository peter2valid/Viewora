# Assets & Styling

This folder contains global styling assets for the Viewora dashboard.

## 🎨 Design System: `main.css`
The foundation of the dashboard's visual identity.
- **Tailwind Directives**: Injects `@tailwind base`, `@tailwind components`, and `@tailwind utilities`.
- **Global Typography**: Sets the primary font (Inter) and root text color (`zinc-950`).
- **Base Components**: Standardizes the "Premium Zinc" inputs, buttons, and card styles that are reused throughout the app.

## 🛠️ Tailwind Config
`tailwind.config.ts` in the project root defines the specific color palette (Slate, Zinc, Emerald) and the `content` manifest required for production build optimization.

## 💡 Guidelines
- **NEVER** add static CSS for features that can be built with Tailwind.
- **Prefer** CSS variables (`--zinc-950`) for tokens that change (e.g., secondary branding).
