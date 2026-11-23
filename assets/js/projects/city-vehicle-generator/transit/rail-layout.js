import { clamp, roundNum } from '../utils.js';
import { sanitiseConfig, SILHOUETTE_PROFILES } from '../config.js';
import {
  getTrackGaugeSpec,
  getCouplerSpec,
  buildTransitCompatibilityProfile
} from './compatibility.js';

function trLayoutComputeEquipmentHeight(cfg) {
  let extra = 0;
  if (cfg.railRoofEquipment === 'diesel_radiator') extra = Math.max(extra, 0.24);
  else if (cfg.railRoofEquipment === 'hvac_twin') extra = Math.max(extra, 0.26);
  else if (cfg.railRoofEquipment === 'tank_catwalk') extra = Math.max(extra, 0.34);
  else if (cfg.railRoofEquipment === 'roofwalk_only') extra = Math.max(extra, 0.12);

  if (cfg.railExhaustCount > 0 && (cfg.bodyFamily === 'rail_diesel_road_switcher' || cfg.bodyFamily === 'rail_diesel_switcher')) {
    extra = Math.max(extra, 0.22);
  }
  if (cfg.bodyFamily === 'rail_electric_loco' || cfg.bodyFamily === 'rail_highspeed_lead' || cfg.bodyFamily === 'rail_articulated_tram') {
    extra = Math.max(extra, 0.45 + (cfg.railPantographHeight || 0.85) * 0.6);
  }
  if (cfg.bodyFamily === 'rail_historic_streetcar' || cfg.bodyFamily === 'rail_open_tram') {
    extra = Math.max(extra, 1.45);
  }
  if (cfg.lightBar && cfg.lightBar !== 'none') {
    extra = Math.max(extra, 0.26);
  }
  return roundNum(extra, 3);
}

export function resolveRailVehicleLayout(rawCfg) {
  const cfg = sanitiseConfig(rawCfg);
  const warnings = [];
  const bf = cfg.bodyFamily || 'rail_diesel_road_switcher';
  const profile = SILHOUETTE_PROFILES[cfg.silhouetteFamily] || SILHOUETTE_PROFILES.diesel_road_switcher;
  const gauge = getTrackGaugeSpec(cfg.railTrackGauge);
  const couplerSpec = getCouplerSpec(cfg.railCouplerType);

  const length = clamp(cfg.overallLength, 3.2, 24.0);
  const maxWidthByGauge = gauge.maxVehicleWidth + 0.15;
  const width = clamp(cfg.overallWidth, 2.0, Math.min(3.4, maxWidthByGauge));
  if (Math.abs(width - cfg.overallWidth) > 0.01) {
    warnings.push(`Clamped rail carbody width to ${roundNum(width, 2)}m for ${gauge.label}`);
  }
  const halfW = width * 0.5;

  const wheelRadius = clamp(cfg.railWheelRadius, 0.18, 0.66);
  const wheelThickness = 0.135;
  const height = clamp(cfg.overallHeight, 3.1, 5.2);

  const minDeckY = Math.max(0.62, wheelRadius * 2 + 0.12);
  const maxDeckY = Math.min(1.85, height - 1.45);
  const deckY = clamp(cfg.railDeckHeight, minDeckY, Math.max(minDeckY + 0.05, maxDeckY));
  if (Math.abs(deckY - cfg.railDeckHeight) > 0.01) {
    warnings.push(`Adjusted frame deck height to ${roundNum(deckY, 2)}m to clear wheelsets`);
  }

  const bodyTopY = Math.max(deckY + 1.45, height);
  const underbodyClearanceY = clamp(wheelRadius * 0.68, 0.2, deckY - 0.22);

  const bogieAxles = clamp(Math.round(cfg.railBogieAxles), 2, 3);
  const minBogieWb = Math.min(length * 0.34, wheelRadius * 2.15 * (bogieAxles - 1) + 0.12);
  const bogieWheelbase = clamp(cfg.railBogieWheelbase, Math.max(0.45, minBogieWb), Math.min(4.2, length * 0.45));
  const axleSpacing = bogieAxles > 1 ? bogieWheelbase / (bogieAxles - 1) : 0;

  const maxBogieSpacing = Math.max(1.0, length - bogieWheelbase - 0.55);
  const bogieSpacing = clamp(cfg.railBogieSpacing, Math.min(0.8, maxBogieSpacing), maxBogieSpacing);
  if (Math.abs(bogieSpacing - cfg.railBogieSpacing) > 0.05) {
    warnings.push(`Clamped bogie center spacing to ${roundNum(bogieSpacing, 2)}m for body length ${roundNum(length, 1)}m`);
  }

  const frontBogieZ = bogieSpacing * 0.5;
  const rearBogieZ = -bogieSpacing * 0.5;

  const localOffsets = bogieAxles === 3
    ? [bogieWheelbase * 0.5, 0, -bogieWheelbase * 0.5]
    : [bogieWheelbase * 0.5, -bogieWheelbase * 0.5];

  const bogies = [
    {
      id: 'front',
      pivotZ: roundNum(frontBogieZ, 4),
      axleCount: bogieAxles,
      wheelbase: roundNum(bogieWheelbase, 4),
      axleSpacing: roundNum(axleSpacing, 4),
      wheelRadius: roundNum(wheelRadius, 4),
      wheelCenterX: gauge.railCenterHalfX,
      style: cfg.railBogieStyle || 'loco_heavy',
      localAxleZs: localOffsets.map((z) => roundNum(z, 4)),
      worldAxleZs: localOffsets.map((z) => roundNum(frontBogieZ + z, 4))
    },
    {
      id: 'rear',
      pivotZ: roundNum(rearBogieZ, 4),
      axleCount: bogieAxles,
      wheelbase: roundNum(bogieWheelbase, 4),
      axleSpacing: roundNum(axleSpacing, 4),
      wheelRadius: roundNum(wheelRadius, 4),
      wheelCenterX: gauge.railCenterHalfX,
      style: cfg.railBogieStyle || 'loco_heavy',
      localAxleZs: localOffsets.map((z) => roundNum(z, 4)),
      worldAxleZs: localOffsets.map((z) => roundNum(rearBogieZ + z, 4))
    }
  ];

  const axles = [];
  for (const bogie of bogies) {
    bogie.worldAxleZs.forEach((wz, idx) => {
      axles.push({
        id: `${bogie.id}_axle_${idx}`,
        bogieId: bogie.id,
        role: cfg.railPowered ? 'traction' : 'idler',
        z: wz,
        trackWidth: roundNum(gauge.railCenterHalfX * 2, 4),
        wheelCenterX: roundNum(gauge.railCenterHalfX, 4),
        dual: false
      });
    });
  }

  const couplerY = bf === 'rail_aerial_gondola'
    ? 4.85
    : bf === 'rail_suspended_monorail'
      ? roundNum(deckY + 1.25, 3)
      : clamp(couplerSpec.anchorHeight, 0.56, Math.max(0.7, deckY - 0.08));
  const frontPivotZ = length * 0.5 - 0.12;
  const rearPivotZ = -length * 0.5 + 0.12;
  const frontPullFaceZ = length * 0.5 + couplerSpec.protrusion;
  const rearPullFaceZ = -length * 0.5 - couplerSpec.protrusion;

  const couplers = {
    frontType: couplerSpec.id,
    rearType: couplerSpec.id,
    y: roundNum(couplerY, 4),
    protrusion: couplerSpec.protrusion,
    frontPivotZ: roundNum(frontPivotZ, 4),
    rearPivotZ: roundNum(rearPivotZ, 4),
    frontPullFaceZ: roundNum(frontPullFaceZ, 4),
    rearPullFaceZ: roundNum(rearPullFaceZ, 4)
  };

  const isLoco = [
    'rail_diesel_road_switcher',
    'rail_diesel_switcher',
    'rail_electric_loco',
    'rail_streamlined_diesel',
    'rail_steam_loco',
    'rail_tank_steam',
    'rail_articulated_steam',
    'rail_heavy_diesel',
    'rail_box_electric',
    'rail_maintenance'
  ].includes(bf);
  const isFreight = [
    'rail_freight_boxcar',
    'rail_freight_flatcar',
    'rail_freight_tank',
    'rail_freight_hopper',
    'rail_freight_caboose',
    'rail_freight_autorack',
    'rail_freight_wellcar'
  ].includes(bf);

  const unitType = isLoco ? 'locomotive' : (isFreight ? 'freight_wagon' : 'passenger_coach');
  const isHoodDiesel = bf === 'rail_diesel_road_switcher' || bf === 'rail_diesel_switcher';

  const hasPantograph = bf === 'rail_electric_loco' ||
    bf === 'rail_box_electric' ||
    bf === 'rail_highspeed_lead' ||
    bf === 'rail_articulated_tram' ||
    (bf === 'rail_highspeed_coach' && (cfg.railPantographHeight || 0) > 0.05);
  const hasTrolleyPole = bf === 'rail_historic_streetcar' || bf === 'rail_open_tram';
  const customRunningGear = [
    'rail_steam_loco',
    'rail_tank_steam',
    'rail_articulated_steam',
    'rail_articulated_tram',
    'rail_straddle_monorail',
    'rail_suspended_monorail',
    'rail_aerial_gondola'
  ].includes(bf);

  const defaultStageMode = bf === 'rail_straddle_monorail'
    ? 'monorail_straddle'
    : bf === 'rail_suspended_monorail'
      ? 'monorail_suspended'
      : bf === 'rail_aerial_gondola'
        ? 'cableway_aerial'
        : (bf === 'rail_historic_streetcar' || bf === 'rail_articulated_tram' || bf === 'rail_open_tram')
          ? 'tram_street'
          : 'rail_straight';

  const platformLen = 0.55;
  const usableStartZ = -length * 0.5 + platformLen;
  const usableEndZ = length * 0.5 - platformLen;
  const usableLen = Math.max(2.0, usableEndZ - usableStartZ);

  const doors = [];
  const zones = {
    deckY: roundNum(deckY, 4),
    bodyTopY: roundNum(bodyTopY, 4),
    underbodyClearanceY: roundNum(underbodyClearanceY, 4),
    usableStartZ: roundNum(usableStartZ, 4),
    usableEndZ: roundNum(usableEndZ, 4),
    fuelTank: null,
    loco: null,
    boxcar: null,
    flatcar: null,
    tank: null,
    passenger: null
  };

  if (isHoodDiesel) {
    const isSwitcher = cfg.bodyFamily === 'rail_diesel_switcher';
    const cabLen = clamp(isSwitcher ? 2.45 : 2.75, 2.0, Math.min(3.5, usableLen * 0.35));
    const noseMax = Math.max(0.8, usableLen - cabLen - 2.6);
    const shortNoseLen = clamp(cfg.railNoseLength, 0.8, noseMax);
    const cabPos = cfg.railCabPosition || (isSwitcher ? 'rear' : 'forward');

    let shortNoseZone = null;
    let cabZone = null;
    let longHoodZone = null;

    if (cabPos === 'rear') {
      const cabStart = usableStartZ + 0.15;
      const cabEnd = cabStart + cabLen;
      const hoodStart = cabEnd;
      const hoodEnd = usableEndZ - (isSwitcher ? 0.25 : 0.35);
      cabZone = { startZ: roundNum(cabStart, 4), endZ: roundNum(cabEnd, 4), length: roundNum(cabLen, 4) };
      longHoodZone = { startZ: roundNum(hoodStart, 4), endZ: roundNum(hoodEnd, 4), length: roundNum(hoodEnd - hoodStart, 4) };
    } else if (cabPos === 'center') {
      const cabStart = -cabLen * 0.5;
      const cabEnd = cabLen * 0.5;
      shortNoseZone = { startZ: roundNum(cabEnd, 4), endZ: roundNum(usableEndZ - 0.15, 4), length: roundNum(usableEndZ - 0.15 - cabEnd, 4) };
      cabZone = { startZ: roundNum(cabStart, 4), endZ: roundNum(cabEnd, 4), length: roundNum(cabLen, 4) };
      longHoodZone = { startZ: roundNum(usableStartZ + 0.15, 4), endZ: roundNum(cabStart, 4), length: roundNum(cabStart - (usableStartZ + 0.15), 4) };
    } else {
      const noseEnd = usableEndZ;
      const noseStart = noseEnd - shortNoseLen;
      const cabEnd = noseStart;
      const cabStart = cabEnd - cabLen;
      const hoodStart = usableStartZ;
      const hoodEnd = cabStart;
      shortNoseZone = { startZ: roundNum(noseStart, 4), endZ: roundNum(noseEnd, 4), length: roundNum(shortNoseLen, 4) };
      cabZone = { startZ: roundNum(cabStart, 4), endZ: roundNum(cabEnd, 4), length: roundNum(cabLen, 4) };
      longHoodZone = { startZ: roundNum(hoodStart, 4), endZ: roundNum(hoodEnd, 4), length: roundNum(hoodEnd - hoodStart, 4) };
    }

    const tankMaxLen = Math.max(1.2, bogieSpacing - bogieWheelbase - 0.48);
    const fuelTankLen = clamp(cfg.railFuelTankLength, 1.1, tankMaxLen);
    zones.fuelTank = {
      startZ: roundNum(-fuelTankLen * 0.5, 4),
      endZ: roundNum(fuelTankLen * 0.5, 4),
      length: roundNum(fuelTankLen, 4),
      width: roundNum(Math.min(width * 0.72, 2.2), 4),
      bottomY: roundNum(underbodyClearanceY + 0.04, 4),
      topY: roundNum(deckY - 0.14, 4)
    };
    zones.loco = {
      cabPosition: cabPos,
      hoodWidth: roundNum(clamp(width * cfg.railHoodWidthRatio, 1.35, width - 0.68), 4),
      cabRoofY: roundNum(bodyTopY, 4),
      longHoodRoofY: roundNum(bodyTopY - (isSwitcher ? 0.42 : 0.14), 4),
      shortNoseRoofY: roundNum(
        cfg.railNoseSlope === 'high_hood'
          ? bodyTopY - 0.16
          : cfg.railNoseSlope === 'flat_switcher'
            ? deckY + (bodyTopY - deckY) * 0.56
            : deckY + (bodyTopY - deckY) * 0.62,
        4
      ),
      shortNose: shortNoseZone,
      cab: cabZone,
      longHood: longHoodZone
    };
  } else if (cfg.bodyFamily === 'rail_freight_boxcar') {
    const doorW = clamp(length * 0.19, 2.0, 3.2);
    const doorH = Math.max(1.4, bodyTopY - deckY - 0.24);
    for (const side of [-1, 1]) {
      doors.push({
        id: `boxcar_${side < 0 ? 'left' : 'right'}_0`,
        side,
        z: 0,
        width: roundNum(doorW, 3),
        sillY: roundNum(deckY + 0.08, 3),
        height: roundNum(doorH, 3),
        slideDir: 1,
        maxSlide: roundNum(doorW * 0.85, 3)
      });
    }
    zones.boxcar = {
      bodyStartZ: roundNum(-length * 0.5 + 0.26, 4),
      bodyEndZ: roundNum(length * 0.5 - 0.26, 4),
      doorWidth: roundNum(doorW, 3),
      eavesY: roundNum(bodyTopY - 0.14, 4)
    };
  } else if (cfg.bodyFamily === 'rail_freight_flatcar') {
    const cargoMaxW = roundNum(Math.min(width - 0.22, 2.65), 3);
    const cargoMaxL = roundNum(Math.max(4.5, length - 0.85), 3);
    zones.flatcar = {
      deckTopY: roundNum(deckY + 0.06, 4),
      cargoMaxW,
      cargoMaxL,
      cargoMaxTopY: roundNum(Math.min(gauge.loadingGaugeHeight - 0.15, deckY + 2.75), 4)
    };
  } else if (cfg.bodyFamily === 'rail_freight_tank') {
    const maxRadiusByWidth = halfW - 0.08;
    const maxRadiusByHeight = (bodyTopY - deckY - 0.2) * 0.5;
    const tankRadius = clamp(cfg.railTankDiameter * 0.5, 0.82, Math.min(maxRadiusByWidth, maxRadiusByHeight));
    const tankCenterY = deckY + tankRadius + 0.1;
    zones.tank = {
      radius: roundNum(tankRadius, 4),
      centerY: roundNum(tankCenterY, 4),
      barrelStartZ: roundNum(-length * 0.5 + 0.85, 4),
      barrelEndZ: roundNum(length * 0.5 - 0.85, 4),
      barrelLength: roundNum(Math.max(4.5, length - 1.7), 4)
    };
  } else if (unitType === 'passenger_coach') {
    const doorW = (bf === 'rail_subway_classic' || bf === 'rail_metro_modern') ? 1.32
      : bf === 'rail_aerial_gondola' ? 0.92
      : 1.06;
    const cabinRoofLimit = bf === 'rail_suspended_monorail'
      ? Math.min(bodyTopY - 1.55, deckY + 2.45)
      : bf === 'rail_aerial_gondola'
        ? Math.min(bodyTopY - 1.15, deckY + 2.15)
        : bodyTopY;
    const doorH = Math.max(1.45, Math.min(2.12, cabinRoofLimit - deckY - 0.32));

    let doorZs = [];
    if (bf === 'rail_subway_classic' || bf === 'rail_metro_modern') {
      const span = length * 0.29;
      doorZs = [-span, 0, span];
    } else if (bf === 'rail_people_mover' || bf === 'rail_aerial_gondola') {
      doorZs = [0];
    } else if (bf === 'rail_articulated_tram') {
      const span = length * 0.27;
      doorZs = [-span, span];
    } else if (bf === 'rail_highspeed_lead') {
      doorZs = [-(length * 0.5 - 1.45), length * 0.5 - clamp(cfg.railNoseLength || 4.8, 3.0, 5.5) - 0.85];
    } else if (bf === 'rail_open_tram') {
      doorZs = [];
    } else {
      const doorOffsetZ = Math.max(2.2, length * 0.5 - 1.38);
      doorZs = [-doorOffsetZ, doorOffsetZ];
    }

    doorZs.forEach((dz, idx) => {
      const slideDir = dz > 0 ? -1 : 1;
      for (const side of [-1, 1]) {
        doors.push({
          id: `pax_${idx}_${side < 0 ? 'left' : 'right'}`,
          side,
          z: roundNum(dz, 4),
          width: doorW,
          sillY: roundNum(deckY + 0.04, 3),
          height: roundNum(doorH, 3),
          slideDir,
          maxSlide: roundNum(doorW * 0.86, 3)
        });
      }
    });

    const doorOffsetZ = doorZs.length >= 2 ? Math.abs(doorZs[doorZs.length - 1]) : Math.max(1.2, length * 0.38);
    const saloonHalf = Math.max(1.2, doorOffsetZ - doorW * 0.5 - 0.36);
    zones.passenger = {
      bodyStartZ: roundNum(-length * 0.5 + 0.14, 4),
      bodyEndZ: roundNum(length * 0.5 - 0.14, 4),
      saloonStartZ: roundNum(-saloonHalf, 4),
      saloonEndZ: roundNum(saloonHalf, 4),
      windowSillY: roundNum(deckY + 0.84, 4),
      windowTopY: roundNum(Math.min(cabinRoofLimit - 0.34, deckY + 1.86), 4),
      eavesY: roundNum(cabinRoofLimit - 0.18, 4),
      doorOffsetZ: roundNum(doorOffsetZ, 4),
      doorWidth: doorW,
      doorHeight: roundNum(doorH, 3)
    };
  }

  const equipmentExtraH = trLayoutComputeEquipmentHeight(cfg);
  const maxHeightWithEquipment = roundNum(bodyTopY + equipmentExtraH, 3);
  const beltY = roundNum(deckY + (bodyTopY - deckY) * 0.45, 4);

  const rearLen = roundNum(Math.max(1.0, length * 0.25), 4);
  const hoodLen = roundNum(Math.max(1.0, length * 0.25), 4);
  const cabinLen = roundNum(Math.max(1.5, length - rearLen - hoodLen), 4);

  const pivots = {
    carbodyOrigin: { x: 0, y: 0, z: 0 },
    bogies: bogies.map((b) => ({
      id: b.id,
      anchor: { x: 0, y: 0, z: b.pivotZ },
      wheelCenterY: b.wheelRadius
    })),
    couplers: {
      front: { x: 0, y: couplers.y, z: couplers.frontPivotZ, pullFaceZ: couplers.frontPullFaceZ },
      rear: { x: 0, y: couplers.y, z: couplers.rearPivotZ, pullFaceZ: couplers.rearPullFaceZ }
    },
    doors: doors.map((dr) => ({
      id: dr.id,
      side: dr.side < 0 ? 'left' : 'right',
      anchor: { x: roundNum(dr.side * halfW, 3), y: dr.sillY, z: dr.z },
      slideAxis: 'z',
      slideDistance: roundNum(dr.slideDir * dr.maxSlide, 3)
    }))
  };

  const railLayout = {
    unitType,
    gauge,
    bogies,
    couplers,
    doors,
    zones,
    pivots,
    hasPantograph,
    hasTrolleyPole,
    customRunningGear,
    defaultStageMode,
    maxHeightWithEquipment,
    dimensions: {
      length: roundNum(length, 4),
      width: roundNum(width, 4),
      height: roundNum(bodyTopY, 4),
      halfWidth: roundNum(halfW, 4),
      groundClearance: roundNum(underbodyClearanceY, 4),
      beltY,
      lowerBodyHeight: roundNum(beltY - underbodyClearanceY, 4),
      greenhouseHeight: roundNum(bodyTopY - beltY, 4),
      cargoRoofTopY: roundNum(bodyTopY, 4),
      wheelArchTopY: roundNum(deckY, 4),
      wheelArchRadius: roundNum(wheelRadius + 0.08, 4),
      wheelRadius: roundNum(wheelRadius, 4),
      wheelThickness,
      trackWidth: roundNum(gauge.railCenterHalfX * 2, 4),
      wheelbase: roundNum(bogieSpacing, 4),
      frontOverhang: roundNum(length * 0.5 - frontBogieZ, 4),
      rearOverhang: roundNum(length * 0.5 + rearBogieZ, 4),
      roofWidthRatio: 0.94,
      frontWidthRatio: 1.0,
      rearWidthRatio: 1.0,
      boxiness: roundNum(profile.boxiness, 4)
    }
  };

  const compatibility = buildTransitCompatibilityProfile(cfg, railLayout);
  railLayout.compatibility = compatibility;

  return {
    dimensions: railLayout.dimensions,
    sections: {
      rear: {
        startZ: roundNum(-length * 0.5, 4),
        endZ: roundNum(-length * 0.5 + rearLen, 4),
        length: rearLen
      },
      gap: {
        startZ: roundNum(-length * 0.5 + rearLen, 4),
        endZ: roundNum(-length * 0.5 + rearLen, 4),
        length: 0,
        enabled: false
      },
      cabin: {
        startZ: roundNum(-length * 0.5 + rearLen, 4),
        endZ: roundNum(length * 0.5 - hoodLen, 4),
        length: cabinLen,
        greenhouseBottomStartZ: roundNum(-length * 0.5 + rearLen, 4),
        roofStartZ: roundNum(-length * 0.5 + rearLen, 4),
        roofEndZ: roundNum(length * 0.5 - hoodLen, 4),
        hasContinuousGreenhouseOverCargo: unitType === 'passenger_coach'
      },
      hood: {
        startZ: roundNum(length * 0.5 - hoodLen, 4),
        endZ: roundNum(length * 0.5, 4),
        length: hoodLen
      },
      roofMount: {
        surfaceY: roundNum(bodyTopY, 4),
        minZ: roundNum(-length * 0.5 + 1.0, 4),
        maxZ: roundNum(length * 0.5 - 1.0, 4),
        cabRoofY: roundNum(bodyTopY, 4),
        cabRoofMinZ: roundNum(-length * 0.5 + 1.0, 4),
        cabRoofMaxZ: roundNum(length * 0.5 - 1.0, 4)
      }
    },
    axles,
    busDoors: [],
    rail: railLayout,
    validation: {
      valid: true,
      warnings
    }
  };
}
