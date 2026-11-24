# B Remastered Story Architect and Zone Mission Generator 4.0

Open the repository root in VS Code and start Live Server there. Open /projects/zone-mission-generator.html in the local server. The studio has no build step. It loads pinned Three.js ES modules for WebGL and active-segment GLB export, with a Canvas fallback for editing, walkthroughs, and JSON export.

## Generate and explore

Select a scenario above the mission settings or choose an archetype. The default office is a single expansive floor with wide circulation and few closed doors. Compact through Massive scale the bays, room depth, circulation, and cave dimensions independently of the segment count. Up to 12 segments are supported. A building area target adjusts bay spans within size limits while keeping the primary corridor width. Cave area targets are approximate. Open-region merges, secondary galleries, and side chambers change the realized space count.

- Use the floor plan to select rooms, zoom, and drag the zoomed plan. The mission graph shows forward and return links, shortcuts, and local transfers.
- Use Theatre (T) to expand the workspace inside the page. Fullscreen (F) uses browser fullscreen. Both keep the segment selector and camera controls accessible. The viewport can fit a segment or selected room, switch to a top-down or isometric view, and hide walls, ceilings, props, or the grid.
- In the local walkthrough, use WASD or arrow keys to move, Shift to sprint, and E to interact. Access checkpoints and boss objectives can grant a transfer token. Boss checkpoints use an interaction in the preview.
- Partial regeneration can replace the active segment, reassign room labels, refresh furnishing, or reroll encounters. Segment rerolls replace that segment's generated content and re-anchor affected transitions. Other segments and their edits stay intact. Label and furniture rerolls respect manually edited rooms.

## Architecture and traversal

Building regions tile a common floor at matching edges. Spine, cross-passage, gallery-loop, and campus layouts use variable-width bays, wide circulation, merged open spaces, side rooms, and one or more architectural wings. Archetypes supply their own defaults and landmark names. Large regions can have higher ceilings, corner columns, and semantic furnishing rows.

Each shared or exterior boundary is stored once as a partition. An opening records the two regions, measured span, position, and any associated door. This corrects the 0.8 error where positive-Z rooms had a doorway placed on the corridor-facing edge but labeled for the opposite wall. The renderer and SVG plan cut openings from the same partition data, while the walkthrough tests boundary crossings and simple prop and column footprints. The validator traverses those openings as keys and objectives grant access. Independent segment transfers carry explicit walkable anchors.

### Three-dimensional cave terrain

The generator samples the union of irregular chamber polygons and widened, bent tunnel centerlines on a bounded grid. It clips each grid triangle against the footprint and shares vertices at cell edges. One continuous elevation field grades the main route through the resulting indexed floor. Optional off-route ridges and basins add steeper relief. A ceiling mesh uses the same horizontal coordinates with separate vault heights. Three triangulated wall bands meet the exact floor and roof boundary vertices and lean between them. This joins chambers and tunnel junctions without doorway caps.

Cave controls cover cavern dimensions, passage width and length, triangle spacing, terrain relief, grade, minimum headroom, rock profiles, overhangs, formations, and optional shallow pools. At extreme scales the mesh budget can coarsen the grid. To keep a requested narrow route representable, the generator may widen it and report the resulting width in Validation.

Local walking interpolates ground and ceiling elevations from the actual floor triangle, checks grade and headroom, and blocks movement outside the mesh or through collidable formation footprints. Main tunnel centerlines are checked against the generated terrain. Geometry, tunnel waypoints, props, objectives, avatar, and segment transfer anchors use Y-up coordinates. Cave depth transitions still connect independent segments. There is one terrain surface per horizontal point within each segment.

Use the ceiling and walls controls to inspect the full shell or a cutaway. Use Wireframe and Steep terrain to inspect the mesh and grade limits. Validation reports triangle count, elevation range, widths, tunnel length, and area within the configured grade. In walkthrough mode, the cave camera button frames the player from inside the cave.

## Reproducible examples

| Studio preset | Seed | First-segment footprint | Mission |
| --- | ---: | ---: | --- |
| Open Corporate Headquarters | 2048 | 193 × 76 m | 21 spaces on one floor |
| Hospital Department Complex | 1570 | 305 × 100 m | 47 spaces and two circulation bands |
| Modern Research Campus | 7931 | 476 × 146 m | 46 spaces across galleries and equipment halls |
| Multi-Floor Boss Gauntlet | 2048 | 193 × 76 m | 97 spaces across five linked floors |
| Wide Natural Caverns | 5052 | 277 × 248 m | 22 chambers and 23 m passages |
| Vast Limestone Cave | 5052 | 450 × 403 m | 23 chambers, high vaults, and optional pools |
| Deep Volcanic Cavern | 5052 | 274 × 256 m | 23 chambers and 30 m of terrain relief |
| Massive Underground Caverns | 5052 | 561 × 537 m | 47 chambers, 19–28 m passages, and 38 m of relief |
| Massive Underground Canyon | 5052 | 1,570 × 232 m | 36 chambers, 38 m passages, and 78 m of relief |
| Epic Multi-Level Caverns | 5052 | 510 × 445 m | 132 chambers across four independent depths |

Footprints are bounding rectangles. Each preset includes its seed and settings. Use the preset selector for a visual example or generate JSON fixtures from this module directory.

```powershell
node generate-examples.mjs C:/path/to/output "Massive Underground Caverns"
```

Omit the scenario name to generate all 72. The script requires an explicit output directory and preserves existing files. The examples directory holds the original 0.8 fixtures for import compatibility.

## Export and compatibility

Mission JSON retains the b.zone-mission.v1 schema and sets generator.version to 4.0.0. Cave segments add an optional terrain record with indexed floor, wall, and ceiling surfaces, style information, the grid, elevation and clearance constraints, steep triangle indices, geological formations, and pools when enabled. The terrain and tagged anchors retain vertical coordinates. Normals are derived from triangle winding for GLB. Building partitions, room details, and progression metadata remain intact. Navigation and validation are regenerated from the mission on export. Template IDs remain distinct from future runtime instance IDs. Coordinate conventions remain Y-up metres, with 16.404199475065617 B units per metre and the same axis transform.

The studio imports 0.8 blueprints, keeps their footprints and mission content, and repairs inverted north/south metadata when it can derive the correct side from the door position. Earlier cave blueprints continue to use their existing preview when the terrain field is absent. Older consumers need terrain support to reproduce the 3.0 cave. A cave GLB includes the complete shell of the active segment, even when the editor hides its roof or walls. JSON contains the complete multi-segment definition.

## Verification

Run the Node tests from the module directory.

```powershell
npm test
```

Run the browser smoke test against a running Live Server. The runner needs Node with WebSocket support and a Chromium executable. Run it once for each backend.

```powershell
node browser-smoke.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe" http://127.0.0.1:5500 canvas
node browser-smoke.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe" http://127.0.0.1:5500 webgl
```

Regression tests cover the original building matrix and progression, all 72 presets, legacy imports, shell seams and winding, tunnel clearance and elevation, deterministic generation, adaptive mesh detail, and optional pools. Browser checks cover Theatre, Fullscreen, office and cave generation, cave grade and wireframe, terrain-following walkthrough movement, legacy import, and the complete cave shell in GLB.

On the test machine, the Massive Underground Caverns preset generated 41,736 shell triangles in a median 119 ms over three runs. The 12-depth stress case generated 655 chambers and 522,776 shell triangles in a median 974 ms and produced 23.0 MB of compact JSON. The WebGL preview loads only the active depth. These core timings include progression and cave-route validation and exclude rendering.

## Runtime boundaries

The editor is standalone. Encounter placements and boss checkpoints are authoring data and local simulations. Cave walking uses triangle heights, slope and clearance checks, and simple prop and formation footprints. Stacked walkable terrain, over-under passages within a segment, swimming, full 3D character physics, and runtime navmesh generation remain future work. City Object imports still provide identifiers and proxy dimensions.

The indexed shell, waypoint heights, and collision metadata give the game runtime a starting point for terrain meshes, derived collision, and navigation. The next stage is to integrate those outputs with authoritative mission instances, canonical City Object meshes, and runtime movement. CODEX_HANDOFF.md records the original 0.8 roadmap.

## Story Architect 4.0

Use Story Architect below the three-column map workshop. Story settings hold arc metadata, contact and souvenir data, and custom group references. An arc supports 1–100 ordered missions. Each mission keeps its own snapshot of a zone blueprint, dialogue, clues, encounters, objectives, and event rules. Candidate regeneration changes the gallery. Select a candidate or attach the current workshop map to update the mission snapshot.

The browser stores arcs and checkpoints in IndexedDB for the current origin. The Library reopens saved arcs and restores checkpoints as separate drafts. Story export uses b.story-arc.v1 and embeds b.zone-mission.v1 blueprints. The editor validates objective dependencies, references between event rules and objectives, and mission level bounds. The simulator steps through one mission or a consecutive arc. It tracks quantities, activation, completion, failures, and effects when events fire.

Warehouse layouts use shared partitions with larger industrial bays, forklift aisles, and storage, receiving, and dispatch areas. Try Freight Distribution Center, Cold Storage Depot, or Abandoned Freight Terminal. Water-Carved Descent gives a single cave segment a continuous graded decline. Each segment still has one walkable surface per horizontal position.

NPC and enemy-group fields store unresolved references. The website supplies zone geometry and City Object preview data. Production NPC resolution, combat, shared publishing, and persistent rewards need the game runtime. Event effects run in the story simulator. The standalone map walkthrough continues to use the zone blueprint. Next, bind authored objectives, encounters, and commands to the authoritative mission instance and its registries.

Run npm test in this directory to verify map and story regressions.
