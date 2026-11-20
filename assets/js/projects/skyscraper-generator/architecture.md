# 3D Skyscraper Generator Architecture

Open `projects/skyscraper-generator.html` to preview towers. The studio uses plain JavaScript and Three.js. `scripts/build-skyscraper-generator.js` builds the browser bundle at `assets/js/projects/skyscraper-generator.js`, and the stylesheet lives at `assets/css/projects/skyscraper-generator.css`. Start in `config.js` for presets or in the layout code for changes to tower sections and setbacks.

## Module Structure

- `config.js`: Defines `STYLES` (22 architectural styles), `PRESETS` (22 preset configurations), `OPTIONS` (including `footprint`, `transitionMode`, and `variationStrength`), `MATERIAL_FAMILIES`, `BASE`, `sanitiseConfig`, `applyPresetWithLocks`, and deterministic 6-stream `applySeedVariation`.
- `utils.js`: Shared deterministic pseudorandom generator (`rng32`), color helpers, geometry utilities, and string hashing.
- `core/footprints.js`: Generates 16 procedural 2d footprints (`generateFootprintPolygon`, `isPolygonSimple`) including `triangle`, transforms vertices (`transformFootprintVertices2D`), computes 2d support hulls (`computeConvexHull2D`, `computePolygonSupportMetrics`), and runs `validateSectionTransition`.
- `core/sections.js`: Computes stacked tier elevations (`resolveStackedSections`), handles independent section CRUD (`addSectionToState`, `removeSectionFromState`, `moveSectionInState`, `duplicateSectionInState`, `updateSectionPropertyInState`), marks `isTopSection`, and records transition `diagnostics` (`verticalGapCount`, `maxHullProtrusion`, `warnings`).
- `core/towers.js`: Resolves 1 to 4 tower layouts (`resolveTowerComplex`), including twin mirrored, twin asymmetrical (without double-negated rotation), `split_core_atrium`, parallel 3-ray exit sampling (`towerRayExitDistance`) for skybridge and truss anchors, and `maxSingleTowerFloors`.
- `core/entrances.js`: Places street-level monumental portals, recessed entries, canopies, and plaza access (`computeSkyscraperEntrances`).
- `core/blueprints.js`: Produces and validates deterministic `.json` blueprint schemas (`generateSkyscraperBlueprint`, `validateSkyscraperBlueprint`), including `maxTowerFloors`, per-section `transitionMode`, and transition diagnostics.
- `geometry/footprints-mesh.js`: Builds tapered/stepped section meshes (`computeSliceTransform` restricting `slantedTopDeg` shear to top sections via `isTopSection`), plus `buildSectionTransitionMesh` for tapered collars, stepped plinths, supported cantilever transfer belts and knee braces, open transition piers, and terrace planters.
- `geometry/facades.js`: Builds procedural facade bays, cornices, recessed curtain walls, vertical ribs, and bounded balcony projections.
- `geometry/podiums.js`: Builds ground-level plinths, podium tiers, colonnades, and plaza bases.
- `geometry/bridges.js`: Builds enclosed/open skybridges with portal attachment collars and structural inter-tower trusses with anchor shoes.
- `geometry/skyscraper.js`: Assembles tower complexes, podiums, section transitions, facades, crowns, spires, bridges, and entrances (`createSkyscraper`).
- `materials/materials.js`: Synthesizes procedural canvas textures (`createSurfaceCanvas`) with calibrated light tones and caches Three.js materials (`getSkyscraperMaterial`, `getSolidMaterial`, `reapplySkyscraperMaterials`).
- `studio/preview.js`: Manages debug gizmo overlays (`buildSkyscraperDebugGizmos` drawing per-tower section boundary loops, cantilever support struts, bridge vectors, and truss endpoints) and field-of-view/aspect-aware projected bounding box camera framing (`resetCameraForFocus`) with dynamic clip planes and fog scaling.
- `studio/controls.js`: Renders style/preset libraries, lockable field rows (`ctrlBuildFieldRow` with `.studio-row-end`), section stack manager cards with Clamped/Cantilever indicators, and `SECTION_EDITOR_FIELDS` including `transitionMode`.
- `studio/export.js`: Handles `.json` blueprint export/import and binary `.glb` mesh export (`exportSkyscraperBlueprint`, `exportSkyscraperJSON`, `exportSkyscraperGLB`).
- `index.js`: Coordinates studio state, `seedDerivedFromPreset` deterministic variation (`Seed`, `Regenerate`, `New Seed`, `Reset Preset`, and `Variation Strength`), calibrated daytime lighting, `Frame` camera hotkey/button, and tower/max-floor stage metrics.

## Architectural Families (22 Presets)

1. Original and Refined Families: `art_deco_monumental`, `neo_gothic_corporate`, `modern_corporate`, `glass_curtain_wall`, `brutalist_monolith`, `futuristic_asymmetrical`, `supertall_tapered`, `twin_art_deco`, `corporate_headquarters`, `retro_futuristic`, `industrial_highrise`, `luxury_residential`, `connected_twin_towers`, `curved_contemporary`.
2. Expanded Families: `stepped_ziggurat`, `mid_century_slab`, `hightech_exoskeleton`, `triangular_wedge`, `terraced_garden`, `split_core_atrium`, `broadcast_comm_tower`, `cantilevered_landmark`.

## Section transitions and seeded variation

- **Section Transition Modes (`transitionMode`)**: `direct`, `setback`, `tapered`, `stepped`, `outward_expansion`, `supported_cantilever`, and `open_transition`.
- **Overhang checks**: Unless `allowCantileveredSteps` or explicit `supported_cantilever` mode is enabled, upper tiers are polygon-checked and constrained via `maxOutwardExpansionRatio` against the lower convex hull. Cantilevers generate transfer belts and diagonal knee braces.
- **Seed Variation (`applySeedVariation`)**: Uses six independent PRNG streams to vary proportions, section heights, setback/taper rhythms, tower spacing/rotation, facade bays/crown details, and material accents, scaled by `variationStrength` (`none`, `subtle`, `moderate`, `strong`) while preserving locked controls.

## Verification

- Run `node scripts/build-skyscraper-generator.js` after editing module files to update `assets/js/projects/skyscraper-generator.js`.
- Run `node tests/verify-skyscraper.js` and `node tests/verify.js` to validate all 22 presets, 16 footprints, regression cases, 20-seed variation sweeps, and `.glb` export.
