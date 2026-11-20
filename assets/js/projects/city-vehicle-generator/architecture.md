# 3D City Vehicle Generator Architecture

Open `projects/city-vehicle-generator.html` to build low-poly city vehicles for B Remastered. The models take their style from Old School RuneScape. The studio uses the same preset locks, seeded variation, and export conventions as the other generators. Start in `core/layout.js` when changing proportions, axle positions, door bays, or clearances.

## Directory Layout

- `utils.js`: Deterministic 32-bit seeded PRNG (`rng32`), math clamps, interpolation, color mixing, blueprint hashing, and DOM helpers.
- `core/archetypes.js`: Defines 35 curated vehicle archetypes (`ARCHETYPES`), silhouette styling descriptors (`SILHOUETTE_PROFILES`), and preset configurations (`PRESET_DEFINITIONS`), spanning everyday cars, micro city cars, convertibles, postal mail trucks, ice cream vans, transit buses, double-decker buses, school buses, articulated buses, food trucks, tow trucks, sanitation trucks, heavy construction rigs (dump truck, cement mixer, wheel loader, flatbed crane), fire ladder engines, street sweepers, armored bank vans, semi rigs, emergency vehicles, and retro-futuristic models.
- `config.js`: Central configuration defaults (`BASE`), schema version (`b.vehicle.v1`), B Game Units conversion (`B_UNITS_PER_METER = 16.404199475065617`), material and palette registries (including `construction_yellow` and `postal_municipal`), dropdown options, tabbed UI schema (`SCHEMA`), category randomizer groupings (`CATEGORIES`), config sanitization (`sanitiseConfig`), and lock-preserving preset merging (`applyPresetWithLocks`).
- `core/layout.js`: Pure spatial layout solver (`resolveVehicleLayout`) converting user config into section coordinates (`rear`, `gap`, `cabin`, `hood`, `roofMount`), non-overlapping wheel axles (`axleCount` 2 or 3 with optional dual rear tires), transit and double-decker door bay selection, and vertical clearance checks for wheel wells.
- `core/blueprints.js`: Pure blueprint serializer and validator (`generateVehicleBlueprint`, `validateVehicleBlueprint`) producing `b.vehicle.v1` JSON contracts with ground bounds, collision bounding boxes, parking footprint rectangles, axle placements, and B Remastered Z-Up coordinate equivalents.
- `materials/palettes.js`: Generates paint, trim, rim, glass, utility, and stripe color combinations per palette family and vehicle role (`generateCoherentPalette`).
- `materials/materials.js`: Procedural low-poly canvas surface textures (`painted_metal`, `matte_body`, `worn_paint`, `plastic_trim`, `dark_rubber`, `chrome_metal`, `utility_metal`, `reflective_glass`, `tinted_glass`, `dark_glass`, plus taxi checker and construction hazard trim) with seed-indexed surface grain caching, live emergency strobe intensity modulation (`beaconFlash`), wireframe toggle, and silhouette readability override (`reapplyVehicleMaterials`, `SoftwareCanvas`-safe).
- `geometry/primitives.js`: Batched low-poly mesh accumulator (`VehicleBatcher`) with arbitrary XZ yaw and X pitch rotation support on cylinders and boxes, textured roof signboards (`vehSignboard`), and deterministic stamped license plates (`vehLicensePlate`).
- `geometry/chassis.js`: Frame rails, crossmembers, floorpan, wheel-well tubs, 5-segment wheel arch flares, front/rear bumpers, running steps, and mudguards.
- `geometry/wheels.js`: 2-axle and 3-axle tire/rim drums, dual rear tires, front steerable wheel yaw (`steerAngle`), 5 hubcap styles (`steelie`, `hubcap_dish`, `five_spoke`, `heavy_lug`, `aero_disc`), lugs/spokes, and axle shafts.
- `geometry/body.js`: Lofted lower hulls with integrated hexagonal/octagonal wheel arch cutouts including `convertible_open` open-top bodies with roll hoops and folded tonneau stacks, `articulated_bus` split dual hulls joined by ribbed accordion bellows, `double_decker` dual-level bus fascia bands and upper-deck seating, `semi_trailer` fifth-wheel kingpin tractors and landing gear, `dump_truck` tilting dump beds with cab canopies and telescopic pistons (`doorsOpen`), `cement_mixer` coaxial 5-segment tilted drums, `flatbed_truck` strapped cargo decks with folding side stakes (`doorsOpen`), `wheel_loader` counterweight bodies and boom towers, right-hand-drive postal interiors (`roleVariant: 'postal'`), fold-down pickup tailgates, optional visible low-poly cabin interiors (`interiorDetail`), sloped A/C/D pillars, cargo van paneling, and 6 roofline styles.
- `geometry/doors-windows.js`: Sloped windshields and rear glass, dual-deck upper/lower windows on `double_decker` buses, optional wraparound glass, rolled-down convertible side vents, 1 to 4 segmented passenger side windows, repeated transit and articulated bus window bays, van partial panel windows, folding transit doors, open/ajar door pose geometry (`doorsOpen`), sliding van side door tracks, and double-barn or roll-up rear cargo doors.
- `geometry/details.js`: Stylized low-poly trim including 5 front grilles, 5 headlight styles, 4 taillight clusters, seeded stamped front/rear license plates, exhausts, side mirrors, door handles, side body trim/livery/branding/utility bins, `postal_stripe` dual bands, `fire_pump_panel` mid-body gauge racks, `hazard_stripes` warning chevrons, Food Truck curb-side serving hatch with striped awning and roof menu board (`serving_window`), police/fire/postal/construction/armored emblems, bumper guards, bull bars, winches, front `loader_bucket` (lifts when `doorsOpen`), front `sweeper_brushes`, `school_crossing_arm` & extending stop paddle (`doorsOpen`), rear spare tires, hitch points, ladders, `gravel_load` (tilts with dump bed), `knuckle_crane` with extendable outriggers (`doorsOpen`), `mixer_chute`, articulated wrecker tow booms (`tow_boom`), sanitation compactor hoppers (`compactor_hopper`), emergency lightbars, rooftop taxi signs, bus destination boards, roof racks with seeded cargo crates, `ice_cream_cone` rooftop sculpture, elevating `fire_ladder` turntable (`doorsOpen`), aerodynamic delivery pods, transit Ac units, and antennas.
- `geometry/vehicle.js`: Main scene-graph assembler (`createCityVehicle`) invoking pure layout, blueprint generation, material bundling, and every geometry section builder.
- `studio/preview.js`: Viewport staging environments (`street`, `parking_lot`, `city_curb`, `studio`, `none`), camera framing focus modes (`hero`, `profile`, `street`), collision and axle gizmos, PNG snapshot export, Theatre mode, Full-Screen mode, and keyboard hotkey dispatch.
- `studio/controls.js`: Archetype card bar, preset selector, saved custom preset storage, per-control lock toggles, deterministic seed variation (`applySeedVariation`), category-aware randomization (`randomizeSettings`), and live material-vs-geometry routing.
- `studio/export.js`: Blueprint (`*.vehicle.json`), multi-archetype urban traffic pack (`*.fleet.json` via `exportTrafficFleetPack`), settings (`*-settings.json`), binary 3D `*.glb` export via `THREE.GLTFExporter`, and JSON blueprint/settings import with full sanitization.
- `index.js`: Three.js r128 Webgl initialization, lighting time-of-day presets, animation loop with emergency lightbar strobing (`beaconFlash`), event wiring, and `window.BCityVehicleBlueprint` global api exposure.

## Blueprint Schema & Coordinate System (`b.vehicle.v1`)

- **Preview Space**: Right-handed `+Y` Up, `+Z` Forward (front bumper faces `+Z`), `+X` passenger right. Measurements are in meters, with the tires touching the ground at `y = 0`.
- **B Remastered Space**: Converted in `bGameUnits` using Z-Up mapping `xGame = x * 16.404199`, `yGame = -z * 16.404199`, `zGame = y * 16.404199` alongside `parkingFootprint` and `collisionBounds` boxes.

## UI Panels & Hotkeys

- **Archetype Strip & Preset List**: Switch between 35 archetypes (Compact Economy Car, Family Sedan, Hatchback, Sporty Coupe, Convertible / Roadster, Micro City Car, Station Wagon, City Taxi, SUV / Crossover, Pickup Truck, Cargo Van, Delivery Van, Postal Mail Truck, Ice Cream Truck, Street Food Truck, Box Truck, Tow Truck / Wrecker, Garbage / Sanitation Truck, Heavy Dump Truck, Concrete Mixer Truck, Construction Wheel Loader, Flatbed Crane Truck, Fire Ladder Engine, Street Sweeper, Armored Bank Truck, Minibus, City Bus, City School Bus, Double-Decker Bus, Articulated Transit Bus, Semi Tractor-Trailer, Utility Service Truck, Police / Security Cruiser, Ambulance / Medical Van, Retro-Futuristic City Car) while preserving locked parameters.
- **Control Tabs**: `Presets`, `Structure`, `Body`, `Doors & Glass`, `Wheels`, `Details`, `Materials`, `Variants`, `Lighting`, `Export`.
- **Keyboard Shortcuts** (ignored while focused inside form inputs):
  - `S`: Toggle Silhouette Readability mode
  - `E`: Toggle Collision, Parking Footprint, and Axle Gizmos
  - `T`: Toggle Theatre mode
  - `F`: Toggle Full-Screen viewport
  - `P`: Capture PNG preview snapshot
  - `Esc`: Exit Full-Screen viewport

## Build and test

Run from `b-website/`:

- Bundle modules to `assets/js/projects/city-vehicle-generator.js`: `npm run build:city-vehicle-generator`
- Execute headless geometry, layout guardrail, blueprint, and Glb export checks: `npm run test:city-vehicle-generator`
