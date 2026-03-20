# UI Components

This folder contains the UI pieces that make up the Viewora dashboard.

## 📁 Organization
- **`/app`**: Specific components for the core product experience (e.g., `PannellumViewer.vue`).
- **`SidebarLink.vue`**: The core navigation element, handling internal routing and active states.

## 🛠️ Design Patterns
- **Atomic-ish Design**: Keep components small and specialized.
- **Props-Driven**: Most components should be purely functional, relying on props for data.
- **Micro-Animations**: Use `transition-all duration-300` and `hover:scale-105` for that "Apple-like" feel.

## 💡 Guidelines
- All new components **must** use Tailwind CSS.
- If a component is specific to one page (e.g., `LeadDetailModal`), consider keeping it inside the `pages/` folder temporarily or moving it here if it becomes reusable.
