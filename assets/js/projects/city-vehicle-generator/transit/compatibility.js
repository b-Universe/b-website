import { clamp, roundNum } from '../utils.js';

export const TRANSIT_COMPAT_REVISION = 'b.transit-compat.v1';
export const TRAINSET_SCHEMA_VERSION = 'b.trainset.v1';

export const TRACK_GAUGES = {
  standard_1435: {
    id: 'standard_1435',
    label: 'Standard Gauge (1435mm)',
    gaugeMeters: 1.435,
    railCenterHalfX: 0.75,
    railHeadWidth: 0.072,
    railHeight: 0.155,
    sleeperWidth: 2.55,
    maxVehicleWidth: 3.3,
    loadingGaugeHeight: 4.95
  },
  narrow_1067: {
    id: 'narrow_1067',
    label: 'Narrow Gauge (1067mm)',
    gaugeMeters: 1.067,
    railCenterHalfX: 0.565,
    railHeadWidth: 0.062,
    railHeight: 0.135,
    sleeperWidth: 2.05,
    maxVehicleWidth: 2.85,
    loadingGaugeHeight: 4.35
  },
  street_tram_1435: {
    id: 'street_tram_1435',
    label: 'Street Tramway (1435mm)',
    gaugeMeters: 1.435,
    railCenterHalfX: 0.75,
    railHeadWidth: 0.068,
    railHeight: 0.04,
    sleeperWidth: 2.35,
    maxVehicleWidth: 2.65,
    loadingGaugeHeight: 4.35
  },
  monorail_beam: {
    id: 'monorail_beam',
    label: 'Straddle Concrete Beam (850mm)',
    gaugeMeters: 0.85,
    railCenterHalfX: 0.425,
    railHeadWidth: 0.85,
    railHeight: 1.15,
    sleeperWidth: 1.0,
    maxVehicleWidth: 3.15,
    loadingGaugeHeight: 4.6
  },
  suspended_beam: {
    id: 'suspended_beam',
    label: 'Overhead Suspended Girder',
    gaugeMeters: 0.72,
    railCenterHalfX: 0.36,
    railHeadWidth: 0.72,
    railHeight: 0.65,
    sleeperWidth: 1.2,
    maxVehicleWidth: 3.0,
    loadingGaugeHeight: 5.2
  },
  cableway_rope: {
    id: 'cableway_rope',
    label: 'Aerial Cableway Haul Rope',
    gaugeMeters: 0.12,
    railCenterHalfX: 0.06,
    railHeadWidth: 0.06,
    railHeight: 0.06,
    sleeperWidth: 0.5,
    maxVehicleWidth: 2.5,
    loadingGaugeHeight: 5.4
  }
};

export const COUPLER_SPECS = {
  aar_knuckle: {
    id: 'aar_knuckle',
    label: 'AAR Knuckle Coupler',
    compatibleWith: ['aar_knuckle', 'close_passenger'],
    anchorHeight: 0.88,
    protrusion: 0.44,
    minGap: 0.14,
    maxYawDeg: 24,
    maxPitchDeg: 6
  },
  buffer_chain: {
    id: 'buffer_chain',
    label: 'Buffer & Chain',
    compatibleWith: ['buffer_chain'],
    anchorHeight: 1.02,
    protrusion: 0.52,
    minGap: 0.10,
    maxYawDeg: 20,
    maxPitchDeg: 5
  },
  automatic_schaku: {
    id: 'automatic_schaku',
    label: 'Automatic Scharfenberg',
    compatibleWith: ['automatic_schaku', 'close_passenger'],
    anchorHeight: 0.86,
    protrusion: 0.40,
    minGap: 0.12,
    maxYawDeg: 26,
    maxPitchDeg: 7
  },
  close_passenger: {
    id: 'close_passenger',
    label: 'Close-Coupled Gangway',
    compatibleWith: ['close_passenger', 'automatic_schaku', 'aar_knuckle'],
    anchorHeight: 0.88,
    protrusion: 0.36,
    minGap: 0.08,
    maxYawDeg: 22,
    maxPitchDeg: 6
  },
  monorail_coupler: {
    id: 'monorail_coupler',
    label: 'Monorail Articulated Coupler',
    compatibleWith: ['monorail_coupler'],
    anchorHeight: 1.35,
    protrusion: 0.32,
    minGap: 0.08,
    maxYawDeg: 28,
    maxPitchDeg: 8
  },
  suspended_link: {
    id: 'suspended_link',
    label: 'Suspended Train Linkage',
    compatibleWith: ['suspended_link'],
    anchorHeight: 2.0,
    protrusion: 0.34,
    minGap: 0.12,
    maxYawDeg: 28,
    maxPitchDeg: 8
  },
  cable_grip: {
    id: 'cable_grip',
    label: 'Detachable Cable Grip',
    compatibleWith: ['cable_grip'],
    anchorHeight: 4.85,
    protrusion: 0.15,
    minGap: 4.0,
    maxYawDeg: 45,
    maxPitchDeg: 25
  }
};

export function getTrackGaugeSpec(gaugeId) {
  return TRACK_GAUGES[gaugeId] || TRACK_GAUGES.standard_1435;
}

export function getCouplerSpec(couplerId) {
  return COUPLER_SPECS[couplerId] || COUPLER_SPECS.aar_knuckle;
}

export function areCouplersCompatible(couplerTypeA, couplerTypeB) {
  const specA = getCouplerSpec(couplerTypeA);
  const specB = getCouplerSpec(couplerTypeB);
  const aAllowsB = specA.compatibleWith.includes(specB.id);
  const bAllowsA = specB.compatibleWith.includes(specA.id);
  const compatible = aAllowsB && bAllowsA;
  const nominalGap = roundNum(Math.max(specA.minGap, specB.minGap), 3);

  return {
    compatible,
    couplerA: specA.id,
    couplerB: specB.id,
    nominalGap,
    maxYawDeg: Math.min(specA.maxYawDeg, specB.maxYawDeg),
    maxPitchDeg: Math.min(specA.maxPitchDeg, specB.maxPitchDeg),
    reason: compatible
      ? `${specA.label} <-> ${specB.label} compatible`
      : `Incompatible couplers: ${specA.label} cannot couple to ${specB.label}`
  };
}

function trCompatEstimateMinCurveRadius(bogieSpacing, bogieWheelbase, overhang, maxWidth, gaugeSpec) {
  const wheelBasedMin = bogieWheelbase * 8.5;
  const spacingBasedMin = bogieSpacing * 2.25;
  const throwRatio = Math.max(0, maxWidth - gaugeSpec.gaugeMeters) * 8.5;
  const overhangBasedMin = overhang * 5.2;
  return roundNum(clamp(Math.max(22, wheelBasedMin, spacingBasedMin, throwRatio, overhangBasedMin), 20, 120), 1);
}

export function buildTransitCompatibilityProfile(cfg, railLayout) {
  const d = railLayout.dimensions;
  const gauge = railLayout.gauge;
  const bogies = railLayout.bogies || [];
  const frontBogie = bogies[0];
  const rearBogie = bogies[bogies.length - 1];
  const bogieSpacing = frontBogie && rearBogie ? Math.abs(frontBogie.pivotZ - rearBogie.pivotZ) : 0;
  const bogieAxleCount = frontBogie ? frontBogie.axleCount : 2;
  const bogieAxleSpacing = frontBogie ? frontBogie.axleSpacing : 1.95;
  const coupler = railLayout.couplers;
  const frontOverhang = roundNum(d.length * 0.5 - (frontBogie ? frontBogie.pivotZ : 0), 3);
  const rearOverhang = roundNum(d.length * 0.5 + (rearBogie ? rearBogie.pivotZ : 0), 3);
  const maxOverhang = Math.max(frontOverhang, rearOverhang);
  const minCurveRadius = trCompatEstimateMinCurveRadius(
    bogieSpacing,
    frontBogie ? frontBogie.wheelbase : 2.0,
    maxOverhang,
    d.width,
    gauge
  );
  const centerThrow = bogieSpacing > 0 ? (bogieSpacing * bogieSpacing) / (8 * minCurveRadius) : 0;
  const endThrow = maxOverhang > 0 ? ((maxOverhang * (bogieSpacing + maxOverhang)) / (2 * minCurveRadius)) : 0;
  const dynamicSweptWidth = roundNum(d.width + (centerThrow + endThrow) * 1.15, 3);

  const unitType = railLayout.unitType || 'freight_wagon';
  const powered = Boolean(cfg.railPowered);
  const doors = railLayout.doors || [];
  const bf = cfg.bodyFamily || '';
  const transitMode = bf === 'rail_straddle_monorail'
    ? 'straddle_monorail'
    : bf === 'rail_suspended_monorail'
      ? 'suspended_monorail'
      : bf === 'rail_aerial_gondola'
        ? 'aerial_cableway'
        : (bf === 'rail_historic_streetcar' || bf === 'rail_articulated_tram' || bf === 'rail_open_tram')
          ? 'light_rail_tram'
          : (bf === 'rail_subway_classic' || bf === 'rail_metro_modern' || bf === 'rail_people_mover')
            ? 'metro'
            : (bf === 'rail_highspeed_lead' || bf === 'rail_highspeed_coach')
              ? 'high_speed_rail'
              : 'conventional_rail';

  const isPassengerFriendly = unitType === 'passenger_coach' ||
    transitMode === 'metro' ||
    transitMode === 'light_rail_tram' ||
    transitMode === 'high_speed_rail' ||
    transitMode === 'straddle_monorail' ||
    transitMode === 'suspended_monorail' ||
    transitMode === 'aerial_cableway';

  const platformInterface = isPassengerFriendly
    ? {
        boardingSides: ['left', 'right'],
        doorSillHeight: roundNum(railLayout.zones.deckY, 3),
        doorWidth: doors[0]?.width || 1.1,
        doorPositionsZ: doors.filter((dr) => dr.side === 1).map((dr) => roundNum(dr.z, 3)),
        recommendedPlatformHeight: roundNum(Math.max(0.28, railLayout.zones.deckY - 0.12), 3),
        requiredGapTolerance: 0.14
      }
    : null;

  const hasPantograph = Boolean(railLayout.hasPantograph);
  const hasTrolleyPole = Boolean(railLayout.hasTrolleyPole);
  const thirdRail = transitMode === 'metro';
  const electrical = (hasPantograph || hasTrolleyPole || thirdRail)
    ? {
        overheadPantograph: hasPantograph,
        pantographContactHeightMeters: hasPantograph || hasTrolleyPole ? 5.35 : null,
        trolleyPole: hasTrolleyPole,
        thirdRail
      }
    : null;

  const monorail = transitMode === 'straddle_monorail'
    ? {
        guidewayType: 'straddle_beam',
        beamWidthMeters: 0.85,
        beamTopY: 1.15,
        sideGuideClearanceMeters: 0.06
      }
    : null;

  const suspended = transitMode === 'suspended_monorail'
    ? {
        guidewayType: 'overhead_portal_girder',
        upperRunningRailY: 4.55,
        hangerOffsetMeters: 1.37,
        cabinDeckY: roundNum(railLayout.zones.deckY, 3),
        maxCabinSwingDeg: 8
      }
    : null;

  const cableway = transitMode === 'aerial_cableway'
    ? {
        cableAttachmentType: 'detachable_grip',
        cableHeightY: 4.85,
        cabinDeckY: roundNum(railLayout.zones.deckY, 3),
        maxCabinSwingDeg: 12
      }
    : null;

  const infraFamMap = {
    narrow_1067: 'narrow_gauge_railway',
    street_tram_1435: 'embedded_street_tramway',
    monorail_beam: 'straddle_beam_monorail',
    suspended_beam: 'suspended_monorail_guideway',
    cableway_rope: 'aerial_cableway'
  };

  return {
    profileRevision: TRANSIT_COMPAT_REVISION,
    identity: {
      archetype: cfg.style,
      transitMode,
      unitType,
      powered,
      infrastructureFamily: infraFamMap[gauge.id] || 'standard_gauge_railway'
    },
    geometry: {
      bodyLength: roundNum(d.length, 3),
      totalLengthOverCouplers: roundNum(coupler.frontPullFaceZ - coupler.rearPullFaceZ, 3),
      maxWidth: roundNum(d.width, 3),
      maxHeight: roundNum(railLayout.maxHeightWithEquipment, 3),
      underbodyClearance: roundNum(railLayout.zones.underbodyClearanceY, 3),
      roofEquipmentHeight: roundNum(railLayout.maxHeightWithEquipment - d.height, 3),
      frontOverhang,
      rearOverhang,
      dynamicSweptWidthAtMinRadius: dynamicSweptWidth
    },
    railway: {
      trackGaugeId: gauge.id,
      trackGaugeMeters: gauge.gaugeMeters,
      railCenterHalfX: gauge.railCenterHalfX,
      wheelDiameter: roundNum(d.wheelRadius * 2, 3),
      flangeDepth: 0.028,
      bogieCount: bogies.length,
      bogieCenterSpacing: roundNum(bogieSpacing, 3),
      bogieAxleCount,
      bogieAxleSpacing: roundNum(bogieAxleSpacing, 3),
      minimumCurveRadius: minCurveRadius,
      maximumGradePercent: transitMode === 'aerial_cableway' ? 45 : (transitMode === 'light_rail_tram' ? 8.0 : 4.5)
    },
    platformInterface,
    electrical,
    monorail,
    suspended,
    cableway,
    coupling: {
      frontCouplerType: coupler.frontType,
      rearCouplerType: coupler.rearType,
      frontAnchor: { x: 0, y: roundNum(coupler.y, 3), z: roundNum(coupler.frontPivotZ, 3) },
      rearAnchor: { x: 0, y: roundNum(coupler.y, 3), z: roundNum(coupler.rearPivotZ, 3) },
      pullFaceFrontZ: roundNum(coupler.frontPullFaceZ, 3),
      pullFaceRearZ: roundNum(coupler.rearPullFaceZ, 3),
      allowedYawDeg: getCouplerSpec(coupler.frontType).maxYawDeg,
      allowedPitchDeg: getCouplerSpec(coupler.frontType).maxPitchDeg
    },
    runtimeBoundary: {
      simulationImplemented: false,
      exportedContracts: [
        '3d_vehicle_geometry',
        'moving_part_pivots',
        'bogie_and_wheelset_anchors',
        'coupler_anchors',
        'door_transforms',
        'collision_and_clearance_bounds',
        'transit_compatibility_profile'
      ]
    }
  };
}

export function createInfrastructureAdapter() {
  return {
    contractRevision: TRANSIT_COMPAT_REVISION,
    source: 'city-vehicle-generator-local-adapter',
    validateVehicleAgainstRoute(compatProfile, routeDescriptor) {
      const errors = [];
      const warnings = [];
      if (!compatProfile || !routeDescriptor) {
        return { ok: false, errors: ['Missing compatibility profile or route descriptor'], warnings };
      }

      const routeGauge = routeDescriptor.trackGaugeId || 'standard_1435';
      if (compatProfile.railway?.trackGaugeId && routeGauge !== compatProfile.railway.trackGaugeId) {
        errors.push(`Track gauge mismatch: vehicle uses ${compatProfile.railway.trackGaugeId}, route uses ${routeGauge}`);
      }

      const minR = Number(routeDescriptor.minCurveRadius);
      if (Number.isFinite(minR) && minR > 0 && compatProfile.railway?.minimumCurveRadius > minR) {
        warnings.push(`Route minimum curve ${minR}m is tighter than vehicle nominal ${compatProfile.railway.minimumCurveRadius}m`);
      }

      const maxGrade = Number(routeDescriptor.maxGradePercent);
      if (Number.isFinite(maxGrade) && maxGrade > compatProfile.railway?.maximumGradePercent) {
        warnings.push(`Route grade ${maxGrade}% exceeds nominal ${compatProfile.railway.maximumGradePercent}%`);
      }

      if (compatProfile.platformInterface && Number.isFinite(Number(routeDescriptor.platformHeight))) {
        const diff = Math.abs(Number(routeDescriptor.platformHeight) - compatProfile.platformInterface.recommendedPlatformHeight);
        if (diff > 0.32) {
          warnings.push(`Platform height offset (${roundNum(diff, 2)}m) may require step gap adjustment`);
        }
      }

      return { ok: errors.length === 0, errors, warnings };
    }
  };
}
