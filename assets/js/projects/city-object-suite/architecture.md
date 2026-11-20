# 3D City Object Suite Architecture

Open `projects/city-object-suite.html` to browse, preview, and export city props or assemblies. Start in `core/registry.js` for catalog search and presets, `generators/` for mesh builders, or `core/blueprints.js` for placement and interaction metadata. Materials and the browser UI live in their own directories.

## Source Modules

- `utils.js` - Deterministic 32-bit seeded pseudo-random generator (`rng32`, `forkRng`), color blending, rounding, slugification, and blueprint string hashing (`hashBlueprintString`).
- `core/categories.js` - Schema constants (`BLUEPRINT_SCHEMA_VERSION = 'b.city-object.v1'`, `ASSEMBLY_SCHEMA_VERSION = 'b.city-assembly.v1'`, `B_UNITS_PER_METER = 16.404199475065617`), `SPACE_GROUPS` (`all`, `exterior`, `trades_utility`, `interior`, `assemblies`), 31 urban, utility, interior, residential, entertainment & holiday object categories (`01_postal`–`20_futuristic`, `office_public_interiors` with 20 subcategories, `22_police_municipal`, `23_clinics_waiting`, `24_labs_research`, `25_malls_libraries`, `26_trades_plumbing_electrical`, `27_sims_everyday_misc`, `arcades_entertainment` (`28`) with 20 subcategories, `29_residential_household`, `30_holidays`, and `assemblies`), 10 attachment profiles, architectural styles, size classes, functional roles, condition levels, variation modes, `LOCATION_CONTEXTS`, and 55 `ENVIRONMENT_TAGS` (including `gym`, `locker_room`, `street`, `highway`, `construction_zone`, `holiday`, `christmas`, `winter`, `thanksgiving`, `autumn`, and `hanukkah`).
- `core/registry.js` handles family and preset lookup (`registerObjectFamily`, `getObjectFamily`, `getObjectPreset`, `searchCatalog`, `getAllEnvironmentTags`), multi-category membership (`categories: [...]`), preset `params` / `values` normalization, preset-level `locationContext` and `subcategory` filtering, `spaceGroup` filtering, parameter validation/sanitization (`sanitiseObjectConfig`), and lock-preserving preset transitions (`applyObjectPresetWithLocks`).
- `core/blueprints.js` measures dimensions in meters and B Game units and derives collision proxies. It also handles `surfaceRelationship` & placement `anchors`, light emitter serialization, Door-style interactive display surface extraction (`displaySurfaces` with `centerPosition`, `normal`, `rotation`, 4 `corners`, `bGameCorners`, and `zoomCamera` framing target, mirrored into `interaction.screens`), player interaction metadata (`interaction`), and `b.city-object.v1` / `b.city-assembly.v1` blueprint validation (`generateObjectBlueprint`, `validateObjectBlueprint`).
- `core/variation.js` applies seeded variation (`applyObjectSeedVariation`), builds six variation cards (`generateVariationCandidates`), and randomizes selected settings (`randomizeObjectSettings`).
- `core/assemblies.js` - Idempotent registry initialization (`ensureCityObjectRegistry`), single-prop builder (`buildSingleObjectGroup`), top-level entry builder (`buildCityObject`), and 56 composite multi-object urban, utility, interior, residential, patio, gym, roadwork, holiday, concession & arcade vignette assemblies (11 outdoor + 23 interior/utility + 15 arcade + 7 residential/patio/gym assemblies).
- `materials/palettes.js` & `materials/materials.js` - Procedural 256x256 canvas surface generation plus exact 32x32 pixel `arcade-carpet.png` integration (`arcade_carpet_original`, `arcade_carpet_seamless`, and `ARCADE_SURFACE_MATERIALS` enforcing `NearestFilter` + `RepeatWrapping` + `userData.bGameMaterial` apartment-builder metadata), 5 arcade palettes, dynamic marquee/side-art textures (`getObjectArcadeMarqueeMaterial`, `getObjectArcadeSideArtMaterial`), 23 procedural screen states (`getObjectScreenMaterial` including 13 arcade CRT and LCD game modes), surface decals, and silhouette clay inspection overrides.
- `geometry/primitives.js` - Batched Three.js `BufferGeometry` builder (`ObjectBatcher`) plus sign plane (`objCreateSignPlane`), backlit screen plane (`objCreateScreenPlane` tagging `screenSurface` dimensions/role/shape), and ground decal (`objCreateGroundDecal`) helpers, and emits `THREE.Mesh` objects for GLB export.
- `generators/*.js` - Thematic modules registering 119 single object families across 30 urban, trades/utility, interior, residential, patio, gym, street, holiday & arcade categories (834 total presets across single families and 56 assemblies, covering urban streets, mailboxes, speed/mileage/railroad signage, heavy construction machines & vehicles, offices, police booking/holding & classic call boxes, courthouses & DMV halls, clinics & waiting rooms, research laboratories & test-tube racks, malls, libraries, electricians/plumbing MEP trades, Sims-inspired recreation, classic/modern arcades & entertainment centers, auto bays, specialty retail displays, strength/cardio/locker-room gym equipment, expanded bathrooms/kitchens/patio grills & fire pits, stick-on Christmas and Hanukkah string lights, trees, wreaths, snowmen, reindeer sleighs, nutcracker collection, Thanksgiving harvest & feast displays, Hanukkah menorahs & dreidels, glass-front snack machines & specialty vending kiosks, cinema & carnival concession counters/warmers, indoor trash cans, everyday clutter, and industrial forklifts/spools/rolls/crates).
- `studio/` - Interactive catalog panel (`catalog-ui.js` with `#catalog-space-tabs` spatial realm bar, grouped category pill headers, location context badges `Exterior` / `Interior` / `Indoor & Outdoor`, `[In]` / `[Out]` preset tags, and scroll-position preservation), schema-driven inspector tabs (`controls-ui.js` displaying surface anchors & location context), stage & debug overlay renderer (`preview.js` with 5 interior stages including `arcade_floor` rendered with the 32x32 `arcade-carpet.png` tile, framing for standalone workstations, and close tabletop camera focus), and binary `.glb` / `.json` blueprint / seed-pack exporter (`export.js`).

## Catalog Categories & Registered Families

| Code | Category | Registered Families |
| --- | --- | --- |
| `01_postal` | Postal & Deliveries | `mailbox_cluster`, `postal_drop_box`, `street_neighborhood_mailboxes` |
| `02_waste` | Waste & Recycling | `commercial_dumpster`, `wheeled_bin`, `indoor_trash_cans` |
| `03_utilities` | Utilities, Pipes & Infrastructure | `exposed_pipes`, `utility_cabinet` |
| `04_street_furniture` | Street Furniture | `street_bench`, `bollard_railing` |
| `05_traffic` | Roads, Parking & Traffic | `parking_meter`, `traffic_sign_signal`, `street_regulatory_signage` |
| `06_transit` | Public Transit | `transit_shelter` |
| `07_vendors` | Food Vendors & Street Commerce | `vendor_cart` |
| `08_advertising` | Newspapers, Advertising & Info | `newspaper_box` |
| `09_commercial` | Storefronts, Restaurants & Cafes | `cafe_storefront`, `bank_atm_machines`, `soda_vending_machines`, `retail_cash_registers`, `specialty_vending_machines`, `concession_food_equipment` |
| `10_residential` | Residential & Apartment Exteriors | `residential_entry` |
| `11_industrial` | Industrial, Alleyway & Loading Areas | `industrial_cargo` |
| `12_construction` | Construction & Roadwork | `construction_site`, `construction_heavy_vehicles` |
| `13_parks` | Parks, Plazas & Civic Grounds | `park_planter` |
| `14_safety` | Public Safety & Emergency | `emergency_safety` |
| `15_lighting` | Lighting & Poles | `streetlight` |
| `16_rooftop` | Rooftop Equipment & Building Attachments | `rooftop_hvac` |
| `17_mobility` | Bikes, Scooters & Micro-Mobility | `bike_rack` |
| `18_waterfront` | Waterfront, Docks & Drainage | `waterfront_drainage` |
| `19_clutter` | Urban Clutter, Damage & Surface Storytelling | `urban_clutter` |
| `20_futuristic` | Modular Sci-Fi / Retro-Futuristic Urban Variants | `futuristic_prop` |
| `office_public_interiors` | Office & Public Interiors (20 Subcategories) | `office_desk`, `office_chair`, `waiting_seating`, `conference_table`, `computer_workstation`, `printer_office_machine`, `desktop_accessories`, `futuristic_office_tech`, `filing_cabinet`, `office_shelving_mailroom`, `cubicle_partition`, `coworking_training_furniture`, `reception_counter`, `breakroom_equipment`, `interior_wayfinding_sign`, `security_access_control`, `interior_building_infrastructure`, `cleaning_maintenance_prop`, `office_decor_prop`, `civic_medical_facility_prop`, `clinic_exam_equipment`, `mall_concourse_fixture`, `library_study_fixture`, `laboratory_science_equipment`, `cubicle_job_workstation_kit`, `restroom_doors_signs`, `books_folders_documents`, `desk_clocks_globes_phones` (+ cross-listed civic, clinic, lab, trades, vending & recreation families) |
| `22_police_municipal` | Police Stations, Courthouses & Civic Halls | `police_station_booking_cell`, `municipal_courthouse_hearing` |
| `23_clinics_waiting` | Clinics, Waiting Rooms & Medical Lobbies | `waiting_room_amenity_prop` (+ `waiting_seating`, `clinic_exam_equipment`) |
| `24_labs_research` | Laboratories, Science & Cleanrooms | `laboratory_apparatus_station` (+ `laboratory_science_equipment`) |
| `25_malls_libraries` | Malls, Libraries & Commercial Interiors | `mall_concourse_fixture`, `library_study_fixture` |
| `26_trades_plumbing_electrical` | Electrician, Plumbing & Building Trades | `electrician_repair_equipment`, `plumbing_hvac_repair_equipment` (+ `exposed_pipes`, `utility_cabinet`, `industrial_cargo`, `construction_site`) |
| `27_sims_everyday_misc` | Everyday, Recreation & Sims-Inspired Misc | `sims_recreation_misc_prop`, `gym_strength_equipment`, `gym_cardio_equipment`, `gym_functional_facilities`, `gym_specialty_machines`, `gym_locker_studio_recovery` |
| `arcades_entertainment` | Arcades & Entertainment (20 Subcategories) | `arcade_control_rig`, `arcade_cabinet`, `specialty_arcade_cabinet`, `racing_driving_machine`, `shooting_action_cabinet`, `rhythm_music_machine`, `pinball_machine`, `skill_redemption_alley`, `claw_prize_machine`, `ticket_redemption_game`, `token_payment_kiosk`, `prize_redemption_counter`, `arcade_seating_fixture`, `arcade_neon_sign_decor`, `arcade_floor_wall_surface`, `arcade_concession_stand`, `vr_interactive_attraction`, `game_store_retro_hardware`, `arcade_operations_maintenance`, `audio_speaker_systems`, `pizza_plates_jukebox_decor` |
| `29_residential_household` | Residential Furniture & Household Props | `residential_chair_seating`, `residential_sofa_lounger`, `residential_dining_side_table`, `residential_bedroom_storage`, `residential_kitchen_appliance`, `residential_bath_laundry`, `residential_household_decor`, `pantry_bar_consumables`, `bathroom_fixtures_accessories`, `kitchen_prep_appliances`, `patio_outdoor_living` |
| `30_holidays` | Holidays & Seasonal Decor | `holiday_string_lights`, `holiday_christmas_trees_wreaths`, `holiday_outdoor_yard_displays`, `holiday_indoor_mantel_gifts`, `holiday_nutcracker_collection`, `holiday_thanksgiving_harvest`, `holiday_thanksgiving_feast`, `holiday_hanukkah_menorahs_lights`, `holiday_hanukkah_traditions_feast` |
| `assemblies` | Composite Environmental Assemblies | 11 Outdoor + 23 Interior & Utility + 15 Arcade + 7 Residential, Patio & Gym Multi-Object Vignette Assemblies |

## Attachment Profiles & Origin Conventions

- `ground_standing`: Origin at bottom center (`y = 0`), surface normal `[0, 1, 0]`.
- `wall_mounted`: Origin at back mount plate center (`z = 0`), surface normal `[0, 0, 1]`.
- `roof_mounted`: Origin at roof curb base center (`y = 0`), surface normal `[0, 1, 0]`.
- `ground_embedded`: Flush pavement level (`y = 0`), passable collision proxy.
- `pole_mounted`: Origin at pole clamp base, surface normal `[0, 0, 1]`.
- `hanging`: Top suspension anchor, surface normal `[0, -1, 0]`.
- `surface_decal`: Flush overlay (`y = 0`), passable collision proxy.
- `surface_placed`: Tabletop/desk bottom base center (`y = 0`), default stage `desk_surface`.
- `ceiling_mounted`: Top ceiling canopy origin (`y = 0`), surface normal `[0, -1, 0]`, default stage `office_corner`.
- `furniture_attached`: Partition/desk clamp bracket origin, surface normal `[0, 0, 1]`, default stage `desk_surface`.

## Office and public interiors

- **20 Subcategories** inside `office_public_interiors`: Desks & Workstations, Office Chairs & Seating, Computers & Technology, Printers & Office Machines, Desktop Accessories, Reception & Front Desks, Waiting Rooms & Public Lobbies, Conference & Meeting Rooms, Cubicles & Office Partitions, Filing Storage & Mailrooms, Breakrooms & Employee Amenities, Signs Information & Wayfinding, Security & Access Control, Interior Building Infrastructure, Cleaning & Maintenance, Office Decorations & Miscellaneous Props, Public Service & Civic Facilities, Medical Office & Professional Waiting Areas, Coworking Training & Shared Workspaces, and Futuristic & Superhero Office Technology.
- **10 Procedural Screen Display Modes**: `desktop_ui`, `spreadsheet`, `document`, `terminal`, `login`, `security_cctv`, `info_display`, `error_screen`, `futuristic_hud`, and `off`.
- **Desk-Mounted & Standalone Workstations**: `computer_workstation` supports `Standalone (No Desk Mounted)` as well as 8 desk styles matching `office_desk` (`rectangular`, `executive_solid`, `l_shaped`, `u_shaped`, `standing_adjustable`, `budget_government`, `drafting_table`, `compact_hutch`) with clearance between multi-monitor arms and PC towers.
- **Accessible & Tandem Waiting Seating**: `waiting_seating` supports 2-to-5 seat linked beam rows, 1, 2, or 3 wide bariatric/handicap accessible bays, corner sectional lounge sofas, high-back privacy pods, and mall atrium planter benches.
- **Clinics, Malls, Libraries & Laboratories**: Added `clinic_exam_equipment`, `mall_concourse_fixture`, `library_study_fixture`, and `laboratory_science_equipment` plus expanded clinic seating/sanitizers/wheelchairs/queue boards and fixed outward-converging double-sided A-frame geometry (`a_frame_sandwich_board` and `wet_floor_sign`).
- **4 Interior Preview Stages**: `desk_surface`, `interior_floor`, `office_corner`, and `reception_lobby`, alongside tight camera zoom framing (`minDistance = 0.25`) for small tabletop accessories.
- **22 interior and utility assemblies**: `basic_office_workstation`, `executive_office_suite`, `four_person_cubicle_cluster`, `reception_lobby_ensemble`, `waiting_room_arrangement`, `conference_room_ensemble`, `copy_printing_room`, `employee_breakroom_zone`, `government_service_area`, `security_operations_station`, `corporate_office_corridor`, `records_archive_room`, `public_library_computer_area`, `coworking_desk_cluster`, `medical_exam_clinic_suite`, `mall_concourse_hub`, `public_library_reading_grove`, `science_research_laboratory`, `police_precinct_booking_desk`, `municipal_dmv_service_hall`, `cubicle_call_center_bullpen`, and `building_mechanical_repair_shop`.

## Arcades and entertainment

- **20 Subcategories** inside `arcades_entertainment` (`code: '28'`): Classic Arcade Cabinets, Specialty Arcade Cabinets, Fighting & Multiplayer Stations, Racing & Driving Machines, Shooting & Action Machines, Rhythm & Music Games, Pinball Machines, Mechanical & Skill Games, Ticket Redemption Games, Prize & Claw Machines, Tokens, Tickets & Payment, Arcade Furniture & Seating, Signage, Lighting & Decorations, Arcade Carpets, Flooring & Walls, Food, Candy & Refreshments, Game Store & Retail Displays, Modern VR & Interactive Attractions, Retro Electronics & Accessories, Security, Maintenance & Operations, and Arcade Assemblies & Environmental Scenes.
- **Modular Control & Cabinet System (`generators/arcade-controls.js`, `generators/arcade-cabinets.js`)**: Shared hardware builders (`arcAddJoystick`, `arcAddPushbuttons`, `arcAddTrackball`, `arcAddSpinner`, `arcAddSteeringWheel`, `arcAddFootPedals`, `arcAddLightGun`, `arcAddCoinDoor`, `arcAddControlPanel`, `arcAddCRTMonitorAssembly`, `arcAddMarqueeBox`, `arcAddPlushOrToyPrize`) power 11 cabinet silhouettes, sit-down & stand-up racers, shooters, dance/rhythm rigs, pinball playfields, claw cranes, and ticket redemption units.
- **Arcade carpet texture (`assets/img/projects/city-object-suite/arcade-carpet.png`)**: Preserves the original 32x32 pixel-art texture (`D6D2A8E3...6621`) with `NearestFilter` magnification, `generateMipmaps = false`, `RepeatWrapping`, `arcade_floor` viewport stage preview, and `userData.bGameMaterial` (`apartmentBuildable: true`, `bGameTileId: 'arcade-carpet'`, `uvScaleMeters: 1.0`) for future base/apartment builder integration.
- **Interaction & Gameplay Metadata**: Cabinets, pinball machines, racers, rhythm pads, claw machines, skee-ball alleys, prize counters, seats, and VR attractions attach structured `interaction` coordinates (`playerStandingPosition`, `seatPosition`, `flipperButtonPositions`, `joystickPos`, `prizeChutePos`, `employeePosition`) into exported `.blueprint.json` metadata without bundling minigame logic.
- **Material and color controls**: Arcade machines, signage (`objCreateSignPlane` / marquee banners), concession carts, prize racks, VR stations, and `unifyPalette` composite assemblies route customizable structural/trim surfaces through `primary`, `secondary`, `accent`, `frame`, `upholstery`, and `neonGlow` roles so material pickers live-update all major surfaces.
- **Adjustable Semi-Transparent Glass (`glassOpacity`)**: Tempered glass surfaces (`materials/materials.js`, `studio/controls-ui.js`) render with configurable `transparent`, `opacity` (`0.05`–`1.00`, default `0.35`), and `depthWrite: false` when translucent so interior prizes, gumballs, pinball playfields, and showcases remain clearly visible through enclosing glass panes and update across composite assemblies.
- **15 arcade assemblies**: `classic_arcade_cabinet_row`, `arcade_corner_1980s`, `mall_arcade_1990s`, `fighting_game_zone`, `racing_arcade_zone`, `pinball_corner_ensemble`, `prize_redemption_counter_zone`, `claw_machine_corner`, `dance_rhythm_zone`, `modern_arcade_lounge`, `family_entertainment_corner`, `arcade_maintenance_area`, `retro_gaming_store_display`, `home_game_room`, and `superhero_base_arcade`.

## Studio panels and shortcuts

### UI Panels

- **Studio layout**: Matches the site-wide navigation bar, theme switcher, breadcrumbs, starfield canvas, and fixed-height 3-column studio grid (`height: 740px`, `overflow-anchor: none`) so selecting items in the catalog never shifts page or panel scroll.

- **Left Catalog Panel**: Spatial Realm tabs (`All`, `Exterior`, `Trades & Utility`, `Interior`, `Assemblies`), grouped category filter pills with section headers, location context badges (`Exterior`, `Interior`, `Indoor & Outdoor`), preset `[In]` / `[Out]` tags, subcategory selector, search bar, favorites filter (`localStorage`), collapsible facet drawer (attachment profile, architectural style, size class, functional role, location context, environment tags), and family/preset cards.
- **Catalog gallery (`studio/catalog-thumbnail-view.js`, `#btn-catalog-view`, `#catalog-view-modal`)**: Full-screen searchable & space-filtered gallery displaying every model organized by `OBJECT_CATEGORIES`, using a single shared offscreen `THREE.WebGLRenderer` with `IntersectionObserver` lazy batching and an in-memory PNG thumbnail cache; clicking any thumbnail closes the modal and loads that preset directly into the studio (`objAppLoadPreset`) for editing.
- **Center Viewport & Variation Browser**: Interactive Three.js r128 WebGL orbit canvas, meter & B Game Unit dimension badge bar, time-of-day lighting selector, and deterministic 6-card Variation Browser.
- **Right Inspector Panel**: Dynamic tabs for `Structure`, `Details`, `Materials`, `Placement` (stage presets, reference helpers, blueprint readout), and `Export` (`.glb`, `.blueprint.json`, `.pack.json`, JSON import, and browser `localStorage` custom object library).

### Viewport Hotkeys

| Key | Action |
| --- | --- |
| `S` | Toggle Clay Silhouette Readability Mode |
| `E` | Toggle Placement, Footprint, Light & Collision Debug Gizmos |
| `H` | Toggle 1.75m Human Scale Silhouette Reference |
| `T` | Toggle Theatre Mode (Hides Side Panels) |
| `F` | Toggle Fullscreen Viewport |
| `P` | Capture PNG Viewport Snapshot |

## Extending the catalog

- **Separated Assembly Definitions (`generators/composite-assemblies.js`)**: Declarative composite assemblies (`ASM_COMMON_SCHEMA`, `registerCompositeAssemblies`) are isolated from the core construction/orchestration runtime (`core/assemblies.js`), keeping `buildCityObject` and `buildSingleObjectGroup` independent from assembly data definitions.
- **Registering a generator module (`registerGeneratorModule`)**: New thematic generator modules can call `registerGeneratorModule(moduleId, registerFn)` in `core/registry.js`; `ensureCityObjectRegistry()` invokes `runRegisteredGeneratorModules()` automatically after built-in modules.
- **Reusable Procedural Primitives (`geometry/primitives.js`)**: Shared builders on `ObjectBatcher` (`addDrawerStack`, `addPedestalPost`) and `objCreateFramedMonitor` allow new furniture, terminal, and equipment generators to compose common parts without duplicating low-level box/cylinder/screen math.
- **Catalog search and pagination (`core/registry.js`, `studio/catalog-ui.js`)**: `CATEGORY_MAP` provides O(1) category metadata lookup, `registerObjectFamily()` precomputes `_tagSet`, `_envSet`, `_locSet`, `_subSet`, and `_searchText` haystacks, tag/environment lists are cached on registration, and `#catalog-family-list` renders in batches of `CATALOG_PAGE_SIZE = 36` with scroll-near-bottom auto-append and a manual `Show More Families` trigger.
- **Blueprint validation on import (`core/blueprints.js`, `studio/export.js`)**: `validateObjectBlueprint` validates materials, parameters, lighting, and assembly `components` placement arrays, while `checkBlueprintCompatibility` flags unknown families/presets and extra parameters before import, so an unknown family cannot silently fall back to another one.
- **Performance Benchmarks (`scripts/benchmark-city-object-suite.mjs`)**: Run `npm run benchmark:city-object-suite` inside `b-website/` to measure cold registry startup, `searchCatalog` latency at current scale and synthetic 1,000+ family / 5,000+ preset scale, procedural build throughput, and blueprint compatibility throughput.
| `Esc` | Exit Fullscreen Mode |

## Build and test

- Build Browser Bundle: `npm run build:city-object-suite` (runs `scripts/build-city-object-suite.js` into `assets/js/projects/city-object-suite.js`).
- Run headless test suite: `npm run test:city-object-suite` (runs `tests/verify-city-object-suite.js`).
