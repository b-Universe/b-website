# 3D Specialty Building Suite Architecture

Open `projects/specialty-building-suite.html` to build low-poly specialty buildings, their lots, and their props. The visual references are Old School RuneScape and City of Heroes. The studio owns the building shell, lot layout, export metadata, and controls. It builds props through `window.BCityObjectSuite` without depending on the City Object Suite or Building Generator UI state.

## Directory Layout
- `assets/js/projects/specialty-building-suite/`
  - `utils.js`: Deterministic 32-bit PRNG (`rng32`, `forkRng`), color helpers, canonical blueprint hashing, DOM helpers.
  - `config.js`: 10 building categories, architectural eras, material families, condition levels, lot types, shared schema fields, and `B_UNITS_PER_METER = 16.404199475065617`.
  - `core/`
    - `registry.js`: Family & preset registration, category/search filtering, lock-preserving preset transitions, schema merging.
    - `seeded-generation.js`: Independent RNG streams (`structure`, `lot`, `materials`, `objects`, `decoration`), variation strength blending, lock-aware randomization.
    - `placement-anchors.js`: Entrance clearances, lane clearances (`fuel_bay`, `drive_thru`, `ambulance`), building footprints, roof bounds, and collision-avoiding prop placement (`validateAndReservePlacement`).
    - `object-integration.js`: Clean bridge to `BCityObjectSuite` (`buildLayerCObjects`), per-group filtering (`disabledObjectGroups`), and missing dependency tracking.
    - `lot-layout.js`: Deterministic lot surface, sidewalk aprons, curb cuts/driveways, parking stall grids, fences, service yards, and landscaping layout.
    - `blueprints.js`: Versioned schema `b.specialty-building.v1` serialization & validation (`validateSpecialtyBlueprint`).
  - `materials/materials.js`: Stylized flat-shaded solids, procedural brick/concrete/metal/stone/stucco textures, emissive windows/signs, window advertisement decals with fictional brands (`Starfuel`, `NukaFizz`, `Roast & Crumb`, `Mega Lotto`).
  - `geometry/`
    - `arch-primitives.js`: Building shells, roofs (`flat`, `pitched`, `hip`, `mansard`, `shed`, `sawtooth`, `stepped`), storefront doors, roll-up garage doors, awnings, fascia signage, window decals.
    - `lot-mesh.js`: 3D geometry builder for Layer B (asphalt/concrete/plaza deck, sidewalks, parking stripes, curbs, chain-link fences, planter beds & stylized low-poly trees).
    - `building-assembler.js`: Orchestrates Layer A, Layer B, Layer C, and blueprint attachment (`createSpecialtyBuilding`).
  - `families/`:
    - `automotive.js`: `gas_station` (13 presets), `auto_repair_garage` (10 presets).
    - `food-hospitality.js`: `restaurant` (14 presets), `bar_tavern` (10 presets), `cafe_bakery` (6 presets).
    - `entertainment-recreation.js`: `gym_fitness` (10 presets), `newsstand_kiosk` (5 presets).
    - `retail-shopping.js`: `costume_shop` (5 presets), `pharmacy_apothecary` (5 presets), `hardware_supply` (4 presets), `pawn_shop` (4 presets).
    - `civic-government.js`: `police_precinct` (6 presets), `bank_financial` (4 presets), `post_office` (3 presets), `news_radio_building` (3 presets), `fire_station` (3 presets).
    - `healthcare.js`: `hospital_clinic` (6 presets), `large_hospital_complex` (6 presets).
    - `lodging.js`: `hotel_motel` (6 presets).
    - `industrial-utilities.js`: `warehouse_distribution` (4 presets), `water_treatment_plant` (3 presets), `repair_shop` (3 presets).
    - `city-civic-cultural.js`: `city_hall_courthouse` (5 presets), `library_museum` (5 presets), `school_university` (5 presets).
    - `city-transit-parking.js`: `transit_station` (5 presets), `parking_garage` (4 presets).
    - `city-infrastructure-venues.js`: `power_substation` (4 presets), `cinema_theater` (5 presets), `civic_arena_rec` (4 presets).
  - Supports building footprints up to `64m x 52m` (`12` floors) and campus lot sizes up to `96m x 88m` across `30` families and `170` presets.
  - `studio/`
    - `preview.js`: Three.js viewport, OrbitControls, day/dusk/night/overcast presets, camera modes (`full`, `street`, `building`, `roof`), 1.82m human scale figure, entrance & anchor gizmos, wireframe/silhouette modes.
    - `controls.js`: 3-column studio UI, category/search/environment filters, parameter locks, context-sensitive feature tab, City Object group toggles & dependency diagnostics.
    - `export.js`: Binary `.glb` export (with layer scope filtering & optional Z-up / B-Units conversion), `.specialty.json` blueprint export/import, and `localStorage` saved configs.

## Scene graph layers
Each generated building group contains three distinct child groups:
1. `LayerA_BuildingStructure` (`MainBuildingStructure` + `AttachedStructures`)
2. `LayerB_PropertyLot` (parking, sidewalks, driveways, fences, landscaping)
3. `LayerC_EnvironmentalObjects` (City Object Suite sub-groups keyed by groupKey)

## Studio UI Layout & Controls
- **Catalog panel (`.spec-catalog-panel`)**: Search bar with side-by-side Category and Environment filters, scrollable **Building Library** (`.spec-family-list`, `height: 210px`), expanded **Architectural Presets** (`.spec-preset-grid`, `min-height: 230px; max-height: 310px` with scroll position preservation), compact horizontal **Three-Layer Controls** (`A: Build`, `B: Lot`, `C: Props`), and collapsible accordions (`.spec-side-accordion`) for **Seed & Variation** and **Saved Configurations**. All direct panel sections use `flex: 0 0 auto` so lists never collapse under constrained viewport heights.
- **Viewport (`.spec-stage`)**: Interactive Three.js WebGL canvas (`clamp(500px, 64vh, 660px)`), camera framing presets (`Full Lot`, `Street View`, `Building Focus`, `Roof Plan`), overlay toggles (`Spin`, `Grid`, `1.82m Ref`, `Anchors`, `Wire`, `Silhouette`, `Theatre`, `Fullscreen`), and expandable blueprint metadata readout.
- **Inspector (`.spec-inspector-panel`)**: Context-sensitive 9-tab parameter inspector (`Structure`, `Facade`, `Roof`, `Lot`, `Features`, `Objects`, `Materials`, `Lighting`, `Export`) with per-control lock toggles and dependency diagnostics.

## Keyboard Shortcuts
- `S`: New deterministic seed variant
- `F`: Frame full lot camera view
- `T`: Toggle turntable rotation
- `H`: Toggle 1.82m player reference scale figure
- `P`: Capture PNG preview snapshot
- `E`: Export binary `.glb` model
- `Esc`: Exit Theatre mode

## Build and test
- `npm run build:specialty-building-suite` compiles `assets/js/projects/specialty-building-suite.js`.
- `npm run test:specialty-building-suite` verifies all families, presets, layer toggles, City Object dependencies, collision clearance, blueprint validation, and `.glb` export.
