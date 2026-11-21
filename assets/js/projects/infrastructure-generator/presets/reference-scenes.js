import {
  INFRA_BASE_BRIDGE_PARAMS,
  INFRA_BASE_ELEVATED_PARAMS,
  INFRA_BASE_FACILITY_PARAMS,
  INFRA_BASE_PEDESTRIAN_PARAMS,
  INFRA_BASE_RAIL_PARAMS,
  INFRA_BASE_ROAD_PARAMS,
  INFRA_BASE_TUNNEL_PARAMS,
  INFRA_BASE_UTILITY_PARAMS,
  INFRA_BASE_WATERWAY_PARAMS
} from '../config.js';
import { infraCreateNetworkDocument } from '../core/network-graph.js';
import { infraCopy } from '../utils.js';

export const INFRA_REFERENCE_SCENES = {
  ref_urban_road_network: {
    id: 'ref_urban_road_network',
    label: 'Ref Scene A: Urban Road Network & Overpass',
    description: 'Connected 4-way intersection, straight & curved streets, sloped south ramp, and an elevated overpass crossing without false connection.',
    workspaceMode: 'network',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_urban_road_network',
        name: 'Urban Road Network & Overpass (Reference Scene)',
        seed: 2026,
        eraStyle: 'modern_municipal',
        workspaceMode: 'network',
        nodes: [
          { id: 'n_1', domain: 'road', position: [0, 0, 0], elevationMode: 'grade', params: { cornerRadius: 3.2, includeCrosswalks: true, crosswalkDepth: 2.8 } },
          { id: 'n_2', domain: 'road', position: [-34, 0, 0], elevationMode: 'grade' },
          { id: 'n_3', domain: 'road', position: [32, 0, 0], elevationMode: 'grade' },
          { id: 'n_4', domain: 'road', position: [56, 0, -14], elevationMode: 'grade' },
          { id: 'n_5', domain: 'road', position: [0, 0, -32], elevationMode: 'grade' },
          { id: 'n_6', domain: 'road', position: [0, 0, 32], elevationMode: 'grade' },
          { id: 'n_7', domain: 'road', position: [0, 1.8, 52], elevationMode: 'grade' },
          // Separate elevated overpass network crossing over e_1 near X = -18 without touching ground nodes
          { id: 'n_8', domain: 'road', position: [-18, 5.6, -28], elevationMode: 'elevated' },
          { id: 'n_9', domain: 'road', position: [-18, 5.6, 28], elevationMode: 'elevated' }
        ],
        edges: [
          {
            id: 'e_1',
            domain: 'road',
            familyId: 'roads',
            presetId: 'residential_2lane',
            startNodeId: 'n_2',
            endNodeId: 'n_1',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'residential_2lane', laneCount: 2, laneWidth: 3.2, sidewalkWidth: 2.2, vergeWidth: 0.6 }
          },
          {
            id: 'e_2',
            domain: 'road',
            familyId: 'roads',
            presetId: 'residential_2lane',
            startNodeId: 'n_1',
            endNodeId: 'n_3',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'residential_2lane', laneCount: 2, laneWidth: 3.2, sidewalkWidth: 2.2, vergeWidth: 0.6 }
          },
          {
            id: 'e_3',
            domain: 'road',
            familyId: 'roads',
            presetId: 'residential_2lane',
            startNodeId: 'n_3',
            endNodeId: 'n_4',
            elevationMode: 'grade',
            curveType: 'arc',
            curveBulge: 5.5,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'residential_2lane', laneCount: 2, laneWidth: 3.2, sidewalkWidth: 2.2, vergeWidth: 0.6 }
          },
          {
            id: 'e_4',
            domain: 'road',
            familyId: 'roads',
            presetId: 'urban_4lane_arterial',
            startNodeId: 'n_5',
            endNodeId: 'n_1',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'urban_4lane_arterial', laneCount: 4, laneWidth: 3.2, sidewalkWidth: 2.4, vergeWidth: 0 }
          },
          {
            id: 'e_5',
            domain: 'road',
            familyId: 'roads',
            presetId: 'urban_4lane_arterial',
            startNodeId: 'n_1',
            endNodeId: 'n_6',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'urban_4lane_arterial', laneCount: 4, laneWidth: 3.2, sidewalkWidth: 2.4, vergeWidth: 0 }
          },
          {
            id: 'e_6',
            domain: 'road',
            familyId: 'roads',
            presetId: 'urban_4lane_arterial',
            startNodeId: 'n_6',
            endNodeId: 'n_7',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'urban_4lane_arterial', laneCount: 4, laneWidth: 3.2, sidewalkWidth: 2.4, vergeWidth: 0 }
          },
          {
            id: 'e_7',
            domain: 'road',
            familyId: 'roads',
            presetId: 'elevated_overpass',
            startNodeId: 'n_8',
            endNodeId: 'n_9',
            elevationMode: 'elevated',
            curveType: 'arc',
            curveBulge: -2.4,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'elevated_overpass', laneCount: 2, laneWidth: 3.4, includeSidewalks: false, includeBarriers: true, surfaceMaterial: 'concrete', deckThickness: 0.65, supportSpacing: 16, supportStyle: 'double_pier' }
          }
        ],
        selection: { kind: 'edge', id: 'e_1' }
      })
  },

  ref_t_intersection: {
    id: 'ref_t_intersection',
    label: 'T-Intersection & Sidewalk Continuity',
    description: 'Clean 3-way T-junction with straight back sidewalk and rounded front curb returns.',
    workspaceMode: 'network',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_t_intersection',
        name: 'T-Intersection Reference',
        seed: 3042,
        eraStyle: 'modern_municipal',
        workspaceMode: 'network',
        nodes: [
          { id: 'n_1', domain: 'road', position: [0, 0, 0], elevationMode: 'grade', params: { cornerRadius: 3.4, includeCrosswalks: true, crosswalkDepth: 2.6 } },
          { id: 'n_2', domain: 'road', position: [0, 0, -24], elevationMode: 'grade' },
          { id: 'n_3', domain: 'road', position: [0, 0, 24], elevationMode: 'grade' },
          { id: 'n_4', domain: 'road', position: [26, 0, 0], elevationMode: 'grade' }
        ],
        edges: [
          { id: 'e_1', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_2', endNodeId: 'n_1', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 } },
          { id: 'e_2', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_1', endNodeId: 'n_3', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 } },
          { id: 'e_3', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_1', endNodeId: 'n_4', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 } }
        ],
        selection: { kind: 'node', id: 'n_1' }
      })
  },

  ref_curved_road_segment: {
    id: 'ref_curved_road_segment',
    label: 'Single Curved Boulevard Component',
    description: 'Editable single curved boulevard component for Mode A inspection.',
    workspaceMode: 'component',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_curved_road_segment',
        name: 'Curved Boulevard Component',
        seed: 1080,
        eraStyle: 'contemporary_transit',
        workspaceMode: 'component',
        nodes: [
          { id: 'n_1', domain: 'road', position: [-18, 0, 8], elevationMode: 'grade' },
          { id: 'n_2', domain: 'road', position: [18, 0, -8], elevationMode: 'grade' }
        ],
        edges: [
          {
            id: 'e_1',
            domain: 'road',
            familyId: 'roads',
            presetId: 'divided_boulevard',
            startNodeId: 'n_1',
            endNodeId: 'n_2',
            elevationMode: 'grade',
            curveType: 'arc',
            curveBulge: 6.5,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'divided_boulevard', laneCount: 4, laneWidth: 3.2, sidewalkWidth: 2.8, includeMedian: true, medianWidth: 1.6, medianType: 'planted' }
          }
        ],
        selection: { kind: 'edge', id: 'e_1' }
      })
  },

  ref_single_straight_road: {
    id: 'ref_single_straight_road',
    label: 'Single Straight Street Component',
    description: 'Simple two-lane neighborhood street component for baseline component mode.',
    workspaceMode: 'component',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_single_straight_road',
        name: 'Single Straight Street',
        seed: 1001,
        eraStyle: 'modern_municipal',
        workspaceMode: 'component',
        nodes: [
          { id: 'n_1', domain: 'road', position: [-16, 0, 0], elevationMode: 'grade' },
          { id: 'n_2', domain: 'road', position: [16, 0, 0], elevationMode: 'grade' }
        ],
        edges: [
          {
            id: 'e_1',
            domain: 'road',
            familyId: 'roads',
            presetId: 'residential_2lane',
            startNodeId: 'n_1',
            endNodeId: 'n_2',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'residential_2lane', laneCount: 2, laneWidth: 3.2, sidewalkWidth: 2.2, vergeWidth: 0.6 }
          }
        ],
        selection: { kind: 'edge', id: 'e_1' }
      })
  },

  ref_urban_tram_boulevard: {
    id: 'ref_urban_tram_boulevard',
    label: 'Ref Scene B: Shared Streetcar Boulevard',
    description: '4-lane urban arterial carrying flush center double tram rails across a 4-way street intersection with overhead wires & boarding island.',
    workspaceMode: 'network',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_urban_tram_boulevard',
        name: 'Shared Streetcar & Tram Boulevard (Reference Scene B)',
        seed: 2042,
        eraStyle: 'modern_municipal',
        workspaceMode: 'network',
        nodes: [
          { id: 'n_1', domain: 'road', position: [0, 0, 0], elevationMode: 'grade', params: { cornerRadius: 3.4, includeCrosswalks: true, crosswalkDepth: 2.8 } },
          { id: 'n_2', domain: 'road', position: [0, 0, -44], elevationMode: 'grade' },
          { id: 'n_3', domain: 'road', position: [0, 0, 38], elevationMode: 'grade' },
          { id: 'n_4', domain: 'road', position: [-46, 0, 0], elevationMode: 'grade' },
          { id: 'n_5', domain: 'road', position: [46, 0, 0], elevationMode: 'grade' },
          { id: 'n_6', domain: 'road', position: [16, 0, 72], elevationMode: 'grade' }
        ],
        edges: [
          {
            id: 'e_1',
            domain: 'road',
            familyId: 'railways',
            presetId: 'street_tram_boulevard',
            startNodeId: 'n_2',
            endNodeId: 'n_1',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: {
              ...infraCopy(INFRA_BASE_ROAD_PARAMS),
              presetId: 'street_tram_boulevard',
              laneCount: 4,
              laneWidth: 3.1,
              sidewalkWidth: 2.6,
              embeddedTramMode: 'center_double',
              embeddedTramGauge: 1.435,
              includeTramPoles: true,
              includeTramPlatform: true,
              wear: 0.16
            }
          },
          {
            id: 'e_2',
            domain: 'road',
            familyId: 'railways',
            presetId: 'street_tram_boulevard',
            startNodeId: 'n_1',
            endNodeId: 'n_3',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: {
              ...infraCopy(INFRA_BASE_ROAD_PARAMS),
              presetId: 'street_tram_boulevard',
              laneCount: 4,
              laneWidth: 3.1,
              sidewalkWidth: 2.6,
              embeddedTramMode: 'center_double',
              embeddedTramGauge: 1.435,
              includeTramPoles: true,
              includeTramPlatform: false,
              wear: 0.16
            }
          },
          {
            id: 'e_5',
            domain: 'road',
            familyId: 'railways',
            presetId: 'street_tram_boulevard',
            startNodeId: 'n_3',
            endNodeId: 'n_6',
            elevationMode: 'grade',
            curveType: 'arc',
            curveBulge: 5.5,
            params: {
              ...infraCopy(INFRA_BASE_ROAD_PARAMS),
              presetId: 'street_tram_boulevard',
              laneCount: 4,
              laneWidth: 3.1,
              sidewalkWidth: 2.6,
              embeddedTramMode: 'center_double',
              embeddedTramGauge: 1.435,
              includeTramPoles: true,
              includeTramPlatform: false,
              wear: 0.16
            }
          },
          {
            id: 'e_3',
            domain: 'road',
            familyId: 'roads',
            presetId: 'urban_4lane',
            startNodeId: 'n_4',
            endNodeId: 'n_1',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: {
              ...infraCopy(INFRA_BASE_ROAD_PARAMS),
              presetId: 'urban_4lane',
              laneCount: 4,
              laneWidth: 3.1,
              sidewalkWidth: 2.4,
              markingsStyle: 'standard',
              wear: 0.18
            }
          },
          {
            id: 'e_4',
            domain: 'road',
            familyId: 'roads',
            presetId: 'urban_4lane',
            startNodeId: 'n_1',
            endNodeId: 'n_5',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: {
              ...infraCopy(INFRA_BASE_ROAD_PARAMS),
              presetId: 'urban_4lane',
              laneCount: 4,
              laneWidth: 3.1,
              sidewalkWidth: 2.4,
              markingsStyle: 'standard',
              wear: 0.18
            }
          }
        ],
        selection: { kind: 'edge', id: 'e_1' }
      })
  },

  ref_freight_railway_corridor: {
    id: 'ref_freight_railway_corridor',
    label: 'Ref Scene C: Rail Switch & Level Crossing',
    description: 'Curved mainline with 3-way turnout switch, industrial siding with platform & buffer stop, plus gated road level crossing.',
    workspaceMode: 'network',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_freight_railway_corridor',
        name: 'Freight Rail Switch & Level Crossing (Reference Scene C)',
        seed: 2055,
        eraStyle: 'early_industrial',
        workspaceMode: 'network',
        nodes: [
          { id: 'n_in', domain: 'rail', position: [-46, 0, 12], elevationMode: 'grade' },
          { id: 'n_sw', domain: 'rail', position: [-8, 0, 0], elevationMode: 'grade', params: { switchState: 'normal' } },
          { id: 'n_main', domain: 'rail', position: [46, 0, 0], elevationMode: 'grade' },
          { id: 'n_siding', domain: 'rail', position: [16, 0, -16], elevationMode: 'grade' },
          { id: 'n_rd_n', domain: 'road', position: [24, 0, -28], elevationMode: 'grade' },
          { id: 'n_rd_s', domain: 'road', position: [24, 0, 28], elevationMode: 'grade' }
        ],
        edges: [
          {
            id: 'e_in',
            domain: 'rail',
            familyId: 'railways',
            presetId: 'freight_single_track',
            startNodeId: 'n_in',
            endNodeId: 'n_sw',
            elevationMode: 'grade',
            curveType: 'arc',
            curveBulge: -4.2,
            params: {
              ...infraCopy(INFRA_BASE_RAIL_PARAMS),
              presetId: 'freight_single_track',
              trackCount: 1,
              trackGauge: 1.435,
              ballastMaterial: 'ballast_granite',
              sleeperMaterial: 'wood',
              includeCatenary: true,
              includeSignals: true,
              includeBufferStop: true,
              wear: 0.25
            }
          },
          {
            id: 'e_main',
            domain: 'rail',
            familyId: 'railways',
            presetId: 'freight_single_track',
            startNodeId: 'n_sw',
            endNodeId: 'n_main',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: {
              ...infraCopy(INFRA_BASE_RAIL_PARAMS),
              presetId: 'freight_single_track',
              trackCount: 1,
              trackGauge: 1.435,
              ballastMaterial: 'ballast_granite',
              sleeperMaterial: 'wood',
              includeCatenary: true,
              includeSignals: true,
              includeBufferStop: true,
              wear: 0.22
            }
          },
          {
            id: 'e_siding',
            domain: 'rail',
            familyId: 'railways',
            presetId: 'freight_single_track',
            startNodeId: 'n_sw',
            endNodeId: 'n_siding',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: {
              ...infraCopy(INFRA_BASE_RAIL_PARAMS),
              presetId: 'freight_single_track',
              trackCount: 1,
              trackGauge: 1.435,
              ballastMaterial: 'ballast_slag',
              sleeperMaterial: 'wood',
              includeCatenary: false,
              includeSignals: true,
              includeBufferStop: true,
              includePlatform: 'left',
              isFreightPlatform: true,
              wear: 0.36
            }
          },
          {
            id: 'e_cross_rd',
            domain: 'road',
            familyId: 'roads',
            presetId: 'residential_2lane',
            startNodeId: 'n_rd_n',
            endNodeId: 'n_rd_s',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: {
              ...infraCopy(INFRA_BASE_ROAD_PARAMS),
              presetId: 'residential_2lane',
              laneCount: 2,
              laneWidth: 3.3,
              sidewalkWidth: 2.0,
              wear: 0.2
            }
          }
        ],
        selection: { kind: 'node', id: 'n_sw' }
      })
  },

  ref_suspended_monorail: {
    id: 'ref_suspended_monorail',
    label: 'Ref Scene D: Suspended Monorail & Station',
    description: 'Wuppertal-style suspended double monorail on A-frame arches over an urban intersection with glass-and-steel station & switchback street stairs.',
    workspaceMode: 'network',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_suspended_monorail',
        name: 'Wuppertal Suspended Monorail & Station (Reference Scene D)',
        seed: 2077,
        eraStyle: 'historic_european',
        workspaceMode: 'network',
        nodes: [
          { id: 'n_c', domain: 'road', position: [-14, 0, 0], elevationMode: 'grade', params: { cornerRadius: 3.2, includeCrosswalks: true, crosswalkDepth: 2.8 } },
          { id: 'n_w', domain: 'road', position: [-48, 0, 0], elevationMode: 'grade' },
          { id: 'n_e', domain: 'road', position: [24, 0, 0], elevationMode: 'grade' },
          { id: 'n_n', domain: 'road', position: [-14, 0, -36], elevationMode: 'grade' },
          { id: 'n_s', domain: 'road', position: [-14, 0, 36], elevationMode: 'grade' },
          { id: 'n_m1', domain: 'suspended_rail', position: [-42, 9.4, -18], elevationMode: 'suspended' },
          { id: 'n_m2', domain: 'suspended_rail', position: [-4, 9.4, 14], elevationMode: 'suspended' },
          { id: 'n_m3', domain: 'suspended_rail', position: [44, 9.4, 16], elevationMode: 'suspended' }
        ],
        edges: [
          { id: 'e_w', domain: 'road', familyId: 'roads', presetId: 'urban_4lane', startNodeId: 'n_w', endNodeId: 'n_c', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 4, laneWidth: 3.0, sidewalkWidth: 2.4 } },
          { id: 'e_e', domain: 'road', familyId: 'roads', presetId: 'urban_4lane', startNodeId: 'n_c', endNodeId: 'n_e', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 4, laneWidth: 3.0, sidewalkWidth: 2.4 } },
          { id: 'e_n', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_n', endNodeId: 'n_c', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2, sidewalkWidth: 2.2 } },
          { id: 'e_s', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_c', endNodeId: 'n_s', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2, sidewalkWidth: 2.2 } },
          {
            id: 'e_m1',
            domain: 'suspended_rail',
            familyId: 'elevated_transit',
            presetId: 'wuppertal_steel_double',
            startNodeId: 'n_m1',
            endNodeId: 'n_m2',
            elevationMode: 'suspended',
            curveType: 'arc',
            curveBulge: 4.5,
            params: {
              ...infraCopy(INFRA_BASE_ELEVATED_PARAMS),
              presetId: 'wuppertal_steel_double',
              transitSystem: 'suspended_monorail',
              structuralStyle: 'wuppertal_steel',
              trackCount: 2,
              trackSpacing: 3.6,
              guidewayWidth: 5.4,
              guidewayDepth: 1.75,
              hangingDropMeters: 3.6,
              hangingWidthMeters: 2.55,
              supportStyle: 'a_frame_wuppertal',
              supportSpacing: 28,
              includeMaintenanceWalkway: true,
              includeStation: false,
              wear: 0.2
            }
          },
          {
            id: 'e_m2',
            domain: 'suspended_rail',
            familyId: 'elevated_transit',
            presetId: 'suspended_station_corridor',
            startNodeId: 'n_m2',
            endNodeId: 'n_m3',
            elevationMode: 'suspended',
            curveType: 'arc',
            curveBulge: -3.0,
            params: {
              ...infraCopy(INFRA_BASE_ELEVATED_PARAMS),
              presetId: 'suspended_station_corridor',
              transitSystem: 'suspended_monorail',
              structuralStyle: 'wuppertal_steel',
              trackCount: 2,
              trackSpacing: 3.6,
              guidewayWidth: 5.4,
              guidewayDepth: 1.75,
              hangingDropMeters: 3.6,
              hangingWidthMeters: 2.55,
              supportStyle: 'a_frame_wuppertal',
              supportSpacing: 18,
              includeMaintenanceWalkway: true,
              includeStation: true,
              wear: 0.16
            }
          }
        ],
        selection: { kind: 'edge', id: 'e_m2' }
      })
  },

  ref_bridge_over_canal: {
    id: 'ref_bridge_over_canal',
    label: 'Ref Scene E: Cable-Stayed Bridge Over Canal',
    description: 'Signature cable-stayed bridge spanning cleanly over an excavated masonry canal & waterfront bikeway with external assembly snap ports.',
    workspaceMode: 'assembly',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_bridge_over_canal',
        name: 'Cable-Stayed Bridge & Canal Assembly (Reference Scene E)',
        seed: 2088,
        eraStyle: 'contemporary_transit',
        workspaceMode: 'assembly',
        nodes: [
          { id: 'n_w1', domain: 'waterway', position: [0, 0, -48], elevationMode: 'grade' },
          { id: 'n_w2', domain: 'waterway', position: [0, 0, 48], elevationMode: 'grade' },
          { id: 'n_b1', domain: 'cycle', position: [14, 0, -48], elevationMode: 'grade' },
          { id: 'n_b2', domain: 'cycle', position: [14, 0, 48], elevationMode: 'grade' },
          { id: 'n_br1', domain: 'road', position: [-38, 6.4, 0], elevationMode: 'elevated' },
          { id: 'n_br2', domain: 'road', position: [38, 6.4, 0], elevationMode: 'elevated' }
        ],
        edges: [
          {
            id: 'e_canal',
            domain: 'waterway',
            familyId: 'waterways',
            presetId: 'urban_stone_canal',
            startNodeId: 'n_w1',
            endNodeId: 'n_w2',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_WATERWAY_PARAMS), presetId: 'urban_stone_canal', waterwayType: 'canal', channelWidthMeters: 12.0, wallMaterial: 'stone_masonry', includeTowpaths: true, includeRailings: true, includeBollards: true }
          },
          {
            id: 'e_bike',
            domain: 'cycle',
            familyId: 'facilities',
            presetId: 'protected_bikeway',
            startNodeId: 'n_b1',
            endNodeId: 'n_b2',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_FACILITY_PARAMS), presetId: 'protected_bikeway', facilityType: 'protected_bikeway', corridorWidthMeters: 3.2, includeCurbBuffer: true, includeBollards: true }
          },
          {
            id: 'e_bridge',
            domain: 'road',
            familyId: 'bridges',
            presetId: 'cable_stayed_bridge',
            startNodeId: 'n_br1',
            endNodeId: 'n_br2',
            elevationMode: 'elevated',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_BRIDGE_PARAMS), presetId: 'cable_stayed_bridge', bridgeType: 'cable_stayed', laneCount: 2, towerHeightMeters: 16.5, cableCountPerSide: 6, deckThickness: 0.9 }
          }
        ],
        selection: { kind: 'edge', id: 'e_bridge' }
      })
  },

  ref_tunnel_and_utilities: {
    id: 'ref_tunnel_and_utilities',
    label: 'Ref Scene F: Tunnels, HV Towers & Pipe Rack',
    description: 'Real-volume arch highway & metro tunnels passing beneath grade corridors alongside lattice HV transmission towers, pipe racks & freight dock.',
    workspaceMode: 'network',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_tunnel_and_utilities',
        name: 'Tunnels, Utility Spans & Freight Yard (Reference Scene F)',
        seed: 2099,
        eraStyle: 'modern_municipal',
        workspaceMode: 'network',
        nodes: [
          { id: 'n_t1', domain: 'road', position: [-36, -6.5, 0], elevationMode: 'underground' },
          { id: 'n_t2', domain: 'road', position: [36, -6.5, 0], elevationMode: 'underground' },
          { id: 'n_m1', domain: 'rail', position: [-36, -6.8, -18], elevationMode: 'underground' },
          { id: 'n_m2', domain: 'rail', position: [36, -6.8, -18], elevationMode: 'underground' },
          { id: 'n_r1', domain: 'road', position: [0, 0, -34], elevationMode: 'grade' },
          { id: 'n_r2', domain: 'road', position: [0, 0, 34], elevationMode: 'grade' },
          { id: 'n_p1', domain: 'pipe', position: [-34, 0, 16], elevationMode: 'aerial' },
          { id: 'n_p2', domain: 'pipe', position: [34, 0, 16], elevationMode: 'aerial' },
          { id: 'n_hv1', domain: 'power', position: [-38, 0, 30], elevationMode: 'aerial' },
          { id: 'n_hv2', domain: 'power', position: [38, 0, 30], elevationMode: 'aerial' },
          { id: 'n_y1', domain: 'road', position: [-36, 0, -34], elevationMode: 'grade' },
          { id: 'n_y2', domain: 'road', position: [-10, 0, -34], elevationMode: 'grade' }
        ],
        edges: [
          {
            id: 'e_tun_road',
            domain: 'road',
            familyId: 'tunnels',
            presetId: 'highway_arch_tunnel',
            startNodeId: 'n_t1',
            endNodeId: 'n_t2',
            elevationMode: 'underground',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_TUNNEL_PARAMS), presetId: 'highway_arch_tunnel', tunnelShape: 'arch', interiorMode: 'road', clearWidthMeters: 8.6, clearHeightMeters: 5.2, includeJetFans: true }
          },
          {
            id: 'e_tun_metro',
            domain: 'rail',
            familyId: 'tunnels',
            presetId: 'underground_metro_box',
            startNodeId: 'n_m1',
            endNodeId: 'n_m2',
            elevationMode: 'underground',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_TUNNEL_PARAMS), presetId: 'underground_metro_box', tunnelShape: 'box', interiorMode: 'metro', clearWidthMeters: 8.8, clearHeightMeters: 5.0 }
          },
          {
            id: 'e_surface_rd',
            domain: 'road',
            familyId: 'roads',
            presetId: 'residential_2lane',
            startNodeId: 'n_r1',
            endNodeId: 'n_r2',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 }
          },
          {
            id: 'e_pipe_rack',
            domain: 'pipe',
            familyId: 'utilities',
            presetId: 'pipe_rack_elevated',
            startNodeId: 'n_p1',
            endNodeId: 'n_p2',
            elevationMode: 'aerial',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_UTILITY_PARAMS), presetId: 'pipe_rack_elevated', utilityType: 'pipe_rack_elevated', towerHeightMeters: 8.2, poleSpacingMeters: 12, pipeCount: 3 }
          },
          {
            id: 'e_hv_line',
            domain: 'power',
            familyId: 'utilities',
            presetId: 'hv_transmission_line',
            startNodeId: 'n_hv1',
            endNodeId: 'n_hv2',
            elevationMode: 'aerial',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_UTILITY_PARAMS), presetId: 'hv_transmission_line', utilityType: 'power_transmission', towerHeightMeters: 14.5, poleSpacingMeters: 26 }
          },
          {
            id: 'e_yard',
            domain: 'road',
            familyId: 'facilities',
            presetId: 'freight_loading_yard',
            startNodeId: 'n_y1',
            endNodeId: 'n_y2',
            elevationMode: 'grade',
            curveType: 'line',
            curveBulge: 0,
            params: { ...infraCopy(INFRA_BASE_FACILITY_PARAMS), presetId: 'freight_loading_yard', facilityType: 'freight_loading_yard' }
          }
        ],
        selection: { kind: 'edge', id: 'e_tun_road' }
      })
  },

  ref_pedestrian_and_facilities: {
    id: 'ref_pedestrian_and_facilities',
    label: 'Ref Scene G: Skybridge, Stairs, BRT & Facilities',
    description: 'Enclosed glass skybridge over 4-lane avenue with B-compliant grand staircase, BRT bus shelter bay, protected bikeway, and municipal parking.',
    workspaceMode: 'network',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_pedestrian_and_facilities',
        name: 'Pedestrian Skybridge & Transit Facilities (Reference Scene G)',
        seed: 2112,
        eraStyle: 'contemporary_transit',
        workspaceMode: 'network',
        nodes: [
          { id: 'n_r1', domain: 'road', position: [-38, 0, 0], elevationMode: 'grade' },
          { id: 'n_r2', domain: 'road', position: [38, 0, 0], elevationMode: 'grade' },
          { id: 'n_sb1', domain: 'pedestrian', position: [0, 5.8, -16], elevationMode: 'elevated' },
          { id: 'n_sb2', domain: 'pedestrian', position: [0, 5.8, 18], elevationMode: 'elevated' },
          { id: 'n_sb3', domain: 'pedestrian', position: [0, 0, 42], elevationMode: 'grade' },
          { id: 'n_bk1', domain: 'cycle', position: [-38, 0, 12], elevationMode: 'grade' },
          { id: 'n_bk2', domain: 'cycle', position: [38, 0, 12], elevationMode: 'grade' },
          { id: 'n_brt1', domain: 'road', position: [-36, 0, -28], elevationMode: 'grade' },
          { id: 'n_brt2', domain: 'road', position: [-8, 0, -28], elevationMode: 'grade' },
          { id: 'n_pk1', domain: 'road', position: [-36, 0, 28], elevationMode: 'grade' },
          { id: 'n_pk2', domain: 'road', position: [-10, 0, 28], elevationMode: 'grade' },
          { id: 'n_ada1', domain: 'pedestrian', position: [14, 0, -24], elevationMode: 'grade' },
          { id: 'n_ada2', domain: 'pedestrian', position: [42, 2.2, -24], elevationMode: 'grade' }
        ],
        edges: [
          { id: 'e_ave', domain: 'road', familyId: 'roads', presetId: 'urban_4lane', startNodeId: 'n_r1', endNodeId: 'n_r2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), presetId: 'urban_4lane', laneCount: 4, laneWidth: 3.1 } },
          { id: 'e_sky', domain: 'pedestrian', familyId: 'pedestrian', presetId: 'skybridge_glass', startNodeId: 'n_sb1', endNodeId: 'n_sb2', elevationMode: 'elevated', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_PEDESTRIAN_PARAMS), presetId: 'skybridge_glass', pedestrianType: 'skybridge', walkwayWidth: 3.4 } },
          { id: 'e_stair', domain: 'pedestrian', familyId: 'pedestrian', presetId: 'grand_stairway', startNodeId: 'n_sb2', endNodeId: 'n_sb3', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_PEDESTRIAN_PARAMS), presetId: 'grand_stairway', pedestrianType: 'stairs_corridor', walkwayWidth: 3.4, surfaceMaterial: 'tile_plaza' } },
          { id: 'e_bike', domain: 'cycle', familyId: 'facilities', presetId: 'protected_bikeway', startNodeId: 'n_bk1', endNodeId: 'n_bk2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_FACILITY_PARAMS), presetId: 'protected_bikeway', facilityType: 'protected_bikeway' } },
          { id: 'e_brt', domain: 'road', familyId: 'facilities', presetId: 'bus_rapid_bay', startNodeId: 'n_brt1', endNodeId: 'n_brt2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_FACILITY_PARAMS), presetId: 'bus_rapid_bay', facilityType: 'bus_rapid_bay' } },
          { id: 'e_park', domain: 'road', familyId: 'facilities', presetId: 'surface_parking_bay', startNodeId: 'n_pk1', endNodeId: 'n_pk2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_FACILITY_PARAMS), presetId: 'surface_parking_bay', facilityType: 'surface_parking_bay' } },
          { id: 'e_ada', domain: 'pedestrian', familyId: 'pedestrian', presetId: 'ada_accessible_ramp', startNodeId: 'n_ada1', endNodeId: 'n_ada2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_PEDESTRIAN_PARAMS), presetId: 'ada_accessible_ramp', pedestrianType: 'ada_ramp', walkwayWidth: 2.4 } }
        ],
        selection: { kind: 'edge', id: 'e_sky' }
      })
  },

  ref_urban_district_demo: {
    id: 'ref_urban_district_demo',
    label: 'Ref Scene H: Complete Multi-Domain District',
    description: 'Integrated City Generator showcase uniting streets, gated freight rail, arch bridge over stone canal, skybridge, tunnel, bikeway & power lines.',
    workspaceMode: 'district',
    build: () =>
      infraCreateNetworkDocument({
        id: 'ref_urban_district_demo',
        name: 'Complete Multi-Domain Urban District (Reference Scene H)',
        seed: 2150,
        eraStyle: 'modern_municipal',
        workspaceMode: 'district',
        nodes: [
          { id: 'n_r0', domain: 'road', position: [0, 0, 0], elevationMode: 'grade', params: { cornerRadius: 3.2, includeCrosswalks: true } },
          { id: 'n_rw', domain: 'road', position: [-34, 0, 0], elevationMode: 'grade' },
          { id: 'n_re', domain: 'road', position: [34, 0, 0], elevationMode: 'grade' },
          { id: 'n_rn', domain: 'road', position: [0, 0, -34], elevationMode: 'grade' },
          { id: 'n_rs', domain: 'road', position: [0, 0, 34], elevationMode: 'grade' },
          { id: 'n_rl1', domain: 'rail', position: [-42, 0, -22], elevationMode: 'grade' },
          { id: 'n_rl2', domain: 'rail', position: [42, 0, -22], elevationMode: 'grade' },
          { id: 'n_wat1', domain: 'waterway', position: [58, 0, -44], elevationMode: 'grade' },
          { id: 'n_wat2', domain: 'waterway', position: [58, 0, 44], elevationMode: 'grade' },
          { id: 'n_brg1', domain: 'road', position: [38, 6.2, 0], elevationMode: 'elevated' },
          { id: 'n_brg2', domain: 'road', position: [78, 6.2, 0], elevationMode: 'elevated' },
          { id: 'n_tun1', domain: 'road', position: [-40, -6.6, 22], elevationMode: 'underground' },
          { id: 'n_tun2', domain: 'road', position: [40, -6.6, 22], elevationMode: 'underground' },
          { id: 'n_mon1', domain: 'suspended_rail', position: [-38, 9.4, 16], elevationMode: 'suspended' },
          { id: 'n_mon2', domain: 'suspended_rail', position: [-14, 9.4, -36], elevationMode: 'suspended' },
          { id: 'n_sky1', domain: 'pedestrian', position: [20, 5.8, -14], elevationMode: 'elevated' },
          { id: 'n_sky2', domain: 'pedestrian', position: [20, 5.8, 14], elevationMode: 'elevated' },
          { id: 'n_bk1', domain: 'cycle', position: [12, 0, 14], elevationMode: 'grade' },
          { id: 'n_bk2', domain: 'cycle', position: [44, 0, 14], elevationMode: 'grade' },
          { id: 'n_pwr1', domain: 'power', position: [-42, 0, 28], elevationMode: 'aerial' },
          { id: 'n_pwr2', domain: 'power', position: [42, 0, 28], elevationMode: 'aerial' }
        ],
        edges: [
          { id: 'e_w', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_rw', endNodeId: 'n_r0', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 } },
          { id: 'e_e', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_r0', endNodeId: 'n_re', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 } },
          { id: 'e_n', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_rn', endNodeId: 'n_r0', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 } },
          { id: 'e_s', domain: 'road', familyId: 'roads', presetId: 'residential_2lane', startNodeId: 'n_r0', endNodeId: 'n_rs', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_ROAD_PARAMS), laneCount: 2, laneWidth: 3.2 } },
          { id: 'e_rail', domain: 'rail', familyId: 'railways', presetId: 'freight_single_track', startNodeId: 'n_rl1', endNodeId: 'n_rl2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_RAIL_PARAMS), presetId: 'freight_single_track', trackCount: 1, includeSignals: true, includeBufferStop: true } },
          { id: 'e_canal', domain: 'waterway', familyId: 'waterways', presetId: 'urban_stone_canal', startNodeId: 'n_wat1', endNodeId: 'n_wat2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_WATERWAY_PARAMS), presetId: 'urban_stone_canal', waterwayType: 'canal', channelWidthMeters: 12.0 } },
          { id: 'e_arch_brg', domain: 'road', familyId: 'bridges', presetId: 'arch_deck_bridge', startNodeId: 'n_brg1', endNodeId: 'n_brg2', elevationMode: 'elevated', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_BRIDGE_PARAMS), presetId: 'arch_deck_bridge', bridgeType: 'arch_deck', laneCount: 2 } },
          { id: 'e_tun', domain: 'road', familyId: 'tunnels', presetId: 'highway_arch_tunnel', startNodeId: 'n_tun1', endNodeId: 'n_tun2', elevationMode: 'underground', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_TUNNEL_PARAMS), presetId: 'highway_arch_tunnel', tunnelShape: 'arch', interiorMode: 'road' } },
          { id: 'e_mono', domain: 'suspended_rail', familyId: 'elevated_transit', presetId: 'wuppertal_steel_double', startNodeId: 'n_mon1', endNodeId: 'n_mon2', elevationMode: 'suspended', curveType: 'arc', curveBulge: 3.5, params: { ...infraCopy(INFRA_BASE_ELEVATED_PARAMS), presetId: 'wuppertal_steel_double', transitSystem: 'suspended_monorail', structuralStyle: 'wuppertal_steel', supportStyle: 't_pylon', supportSpacing: 24, includeMaintenanceWalkway: true } },
          { id: 'e_sky', domain: 'pedestrian', familyId: 'pedestrian', presetId: 'skybridge_glass', startNodeId: 'n_sky1', endNodeId: 'n_sky2', elevationMode: 'elevated', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_PEDESTRIAN_PARAMS), presetId: 'skybridge_glass', pedestrianType: 'skybridge', walkwayWidth: 3.2 } },
          { id: 'e_bike', domain: 'cycle', familyId: 'facilities', presetId: 'protected_bikeway', startNodeId: 'n_bk1', endNodeId: 'n_bk2', elevationMode: 'grade', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_FACILITY_PARAMS), presetId: 'protected_bikeway', facilityType: 'protected_bikeway' } },
          { id: 'e_pwr', domain: 'power', familyId: 'utilities', presetId: 'street_power_poles', startNodeId: 'n_pwr1', endNodeId: 'n_pwr2', elevationMode: 'aerial', curveType: 'line', curveBulge: 0, params: { ...infraCopy(INFRA_BASE_UTILITY_PARAMS), presetId: 'street_power_poles', utilityType: 'street_power_poles', towerHeightMeters: 10.5, poleSpacingMeters: 21 } }
        ],
        selection: { kind: 'edge', id: 'e_arch_brg' }
      })
  }
};

export function infraGetReferenceScene(id = 'ref_urban_road_network') {
  const entry = INFRA_REFERENCE_SCENES[id] || INFRA_REFERENCE_SCENES.ref_urban_road_network;
  return entry.build();
}
