# Editor Engine

The Editor is built around the **Marzipano** library, a WebGL-based 360° media viewer.

## State Management
- `pages/app/spaces/[spaceId]/editor.vue` manages the global state (current scene, hotspots, mode).
- It passes strictly mapped data props down to `<EditorMarzipanoViewer />`.

## Coordinate System
Marzipano uses spherical coordinates:
- **Yaw (Horizontal):** Radians (0 to 2π or -π to π).
- **Pitch (Vertical):** Radians (-π/2 to π/2, where 0 is the horizon).

## Hotspot Placement Flow
1. User clicks "Add Hotspot" (toggles `addHotspotMode`).
2. A crosshair overlay appears over the canvas.
3. User clicks the canvas. The viewer intercepts the `MouseEvent`.
4. Using `currentMScene.view().screenToCoordinates(x, y)`, the browser screen X/Y is converted into Marzipano Yaw/Pitch.
5. An event emits back to the parent page with `{ yaw, pitch }`.
6. A modal opens prompting the user for hotspot details (type, target scene).
7. Upon save, the data is pushed to Supabase and instantly re-rendered in the viewer.
