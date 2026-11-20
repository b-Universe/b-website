# Tree Generator Architecture (`b.tree.v1`)

Open `projects/tree-generator.html` to preview trees and export their models and blueprints. Edit the modules under `assets/js/projects/tree-generator/`. `scripts/build-tree-generator.js` produces the browser bundle at `assets/js/projects/tree-generator.js`. Start in `core/species.js` for presets or `config.js` for shared parameters and validation.

## Directory Layout

- `config.js`: Schema constants (`TREE_BLUEPRINT_SCHEMA_VERSION = 'b.tree.v1'`, `TREE_B_UNITS_PER_METER = 16.404199475065617`), default baseline (`TREE_BASE`), dropdown dictionaries (`TREE_OPTIONS`), 7-tab UI control schema (`TREE_SCHEMA`), randomizer categories (`TREE_RANDOM_CATEGORIES`), config validation and clamping (`sanitiseTreeConfig`), and preset application that respects locks (`applyTreePresetWithLocks`).
- `utils.js`: Pure helpers (`treeSeededRng`, `treeRng32`, `treeClamp`, `treeHashConfig`, `treeSlugify`, `treeHexToHsl`, `treeHslToHex`, `tree$`, `tree$$`).
- `core/species.js`: 7 filterable flora categories (`TREE_CATEGORIES`), 20 botanical species archetypes (`TREE_SPECIES`), 40 presets (`TREE_PRESETS`), and backward-compatible lookup helpers (`getSpeciesMeta`, `getTreePreset`).
- `core/layout.js`: Pure DOM-free and Three-free structural solver (`resolveTreeLayout`, `treeVecToBUnits`) computing trunk curves, root buttresses, secondary limbs, canopy clusters, fruit/blossom/epiphyte anchors, wind flex weights, and bounding volumes.
- `core/blueprints.js`: Versioned `b.tree.v1` contract builder (`generateTreeBlueprint`), strict validator (`validateTreeBlueprint`), and compatibility checker (`checkTreeBlueprintCompatibility`).
- `core/variation.js`: Deterministic mutation and biome scattering (`applyTreeSeedVariation`, `generateTreeVariations`, `randomizeTreeSettings`, `buildBiomeGrovePack`).
- `materials/palettes.js`: Seasonal color schemes (`spring`, `summer`, `autumn`, `winter`, `blossom`, `arcane`) and procedural coherent palette generator (`generateCoherentTreePalette`).
- `materials/materials.js`: Cached procedural bark grain texture synthesis, foliage cards, emissive botanical accents, wireframe & clay silhouette material switcher (`setTreeSilhouetteAndWireframe`).
- `geometry/primitives.js`: Low-poly botanical geometry builders (`buildTreeTaperedLimb`, `buildTreeClusterGeometry`, `buildTreeRootButtresses`, `buildTreePlanterOrPot`, `buildTreeTrunkDetails`, `buildTreeStoryProps`).
- `geometry/details.js`: Interactive custom detail attachment catalog (`TREE_PLACED_DETAIL_TYPES` across Flowers, Fruits & Cones, and Hanging Objects), geometry builder (`buildPlacedTreeDetails`), smart branch/canopy scatter helpers (`buildSmartPlacedDetailBatch`, `scatterPlacedDetailsOnObject3D`), and sanitization (`sanitisePlacedDetailsList`).
- `geometry/lods.js`: Four-stage optimization builder (`generateTreeLodData`, `buildTreeBillboardMesh`, `buildTreeHemisphereGeo`, `buildTreeLod3Mesh`).
- `geometry/tree.js`: Main specimen assembler (`createProceduralTree`, `countTreeObjectStats`) supporting LOD 0 (hero), LOD 1 (reduced), LOD 2 (`billboard`, `hemisphere`, or `hybrid` card proxies), and LOD 3 (billboard dome).
- `studio/preview.js`: Three.js viewport lighting presets, 7 environment stages, 1.82m human scale reference, physics & harvest collision gizmos, ambient particles, live vertex wind sway, offscreen foliage billboard atlas baker, and disposal helper.
- `studio/catalog-modal.js`: Lazy-rendered 3D thumbnail catalog modal (`#tree-catalog-modal`) with category filter pills and keyword search.
- `studio/controls.js`: Schema-driven control tab renderer with per-parameter lock buttons, species grid, 6-card variation browser strip, preset search filter, and Local Storage custom preset vault.
- `studio/export.js`: Binary `.glb` export (real meters or B Units scale), Multi-LOD `.glb` bundle export, foliage atlas `.png`, `.tree.json` blueprint export, `.grove.json` biome scatter pack export, settings `.json` round-trip, and canvas viewport `.png` snapshots.
- `index.js`: Studio lifecycle bootstrapper, `window.BTreeBlueprint` runtime API, `window.__disposeTreeGenerator` cleanup hook, and keyboard shortcuts.

## Species and presets

1. **Broadleaf Canopy (`broadleaf`)**: `oak`, `maple`, `birch`, `sakura`, `willow`, `baobab`.
2. **Conifers & Pines (`conifer`)**: `pine`, `cypress`, `redwood`, `yew`.
3. **Tropical & Coastal (`tropical`)**: `palm`, `banana_palm`, `mangrove`.
4. **Arid & Desert (`arid`)**: `cactus`, `bamboo`.
5. **Shrubs & Hedges (`shrub`)**: `bush`, `topiary`.
6. **Ornamental & Bonsai (`ornamental`)**: `bonsai`.
7. **Stylized & Fantasy (`fantasy`)**: `dead`, `fantasy`.

## Viewport modes, controls, and shortcuts

### Viewport Display Modes

- **Single Specimen**: Interactive orbit inspection at LOD 0-3 (`billboard`, `hemisphere`, or `hybrid` card proxy), live foliage billboard atlas preview, wind sway, and ambient seasonal particles (`leaves`, `petals`, `snow`, `fireflies`).
- **Compare LOD 0-3**: Side-by-side layout displaying all four geometric detail tiers simultaneously with triangle counts for each tier.
- **Biome Grove**: Procedural Poisson-like forest stand (10 to 400 instances) with selectable quality or distance-based dynamic LOD 0-2 distribution and optional mixed-biome species scattering.

### Parameter Tabs (Left Panel)

1. `Form`: Height, spread, trunk radius, twist, lean, root flare, bark furrows, planter/pot toggle, and base rocks.
2. `Branches`: Primary count, split levels, tier angle, droop, fork roughness, crotch bumps, twigs, and exposed surface roots.
3. `Canopy`: Style (`clusters`, `tiered`, `pine`, `willow`, `palm`, `bonsai`, `shrub`, `cactus`, `bamboo`, `spiral`), cluster count, puffiness, leaf card scale, and canopy fill density.
4. `Details`: Place attachments in the viewport (`Click Tree To Place (D)` with raycasted live cursor ring & drop cord preview, `Scatter +6` branch/crown scatter, Undo/Clear, individual removal, and 20 placeable Flowers, Fruits & Hanging Objects serialized in `attachments.placedDetails`), plus blossom/fruit/nest/hollow/moss/vine/mushroom sliders and planters.
5. `Seasons`: Quick season selector cards (`spring`, `summer`, `autumn`, `winter`, `blossom`, `arcane`), wind sway strength, and seasonal ambient particle emitter mode.
6. `Materials`: Bark grain roughness, foliage translucency/alpha cutoff, snow cap factor, and atlas texture resolution.
7. `Export`: Engine coordinate normalization (`Z-Up` toggle and `B Units` scale toggle for direct `16.4042` B Units/m conversion).

### Keyboard Shortcuts

Shortcuts are disabled while focus is in `<input>`, `<textarea>`, or `<select>` controls:

- `S`: Toggle Clay Silhouette Mode (neutral clay material inspection for silhouette readability).
- `E`: Toggle Debug Collision & Harvest Gizmos (trunk cylinder collider, canopy bounding box, harvest interaction ring).
- `H`: Toggle 1.82m Human Scale Reference (`30 B` character height check).
- `D`: Toggle Interactive Detail Placement Mode (click branch or canopy to place flowers, fruits, or hanging objects; `Shift+Click` removes nearest placed detail).
- `W`: Toggle Wireframe Overlay across trunk and canopy meshes.
- `I`: Toggle B 45° Elevated Isometric Camera (`hud-cam-mode`).
- `R`: Toggle Turntable Rotation.
- `T`: Toggle Theatre Mode (collapses left and right panels to maximize canvas area).
- `F`: Toggle Native Full-Screen Viewport Mode.
- `P`: Capture PNG Viewport Snapshot (`tree_<species>_seed<seed>.png`).
- `Esc`: Exit Native Full-Screen Mode.

## Build and test

- Rebuild production bundle from ESM modules:
  `npm --prefix b-website run build:tree-generator`
- Execute headless geometry, blueprint, LOD, `.glb` export, and formatting test suite:
  `npm --prefix b-website run test:tree-generator`
