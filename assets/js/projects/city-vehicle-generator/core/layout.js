import { clamp, degToRad, roundNum } from '../utils.js';
import { sanitiseConfig, SILHOUETTE_PROFILES, isRailConfig, isAirConfig } from '../config.js';
import { resolveRailVehicleLayout } from '../transit/rail-layout.js';
import { resolveAirVehicleLayout } from '../air/air-layout.js';

export function resolveVehicleLayout(rawCfg) {
  const cfg = sanitiseConfig(rawCfg);
  if (isRailConfig(cfg)) {
    return resolveRailVehicleLayout(cfg);
  }
  if (isAirConfig(cfg)) {
    return resolveAirVehicleLayout(cfg);
  }
  const warnings = [];
  const profile = SILHOUETTE_PROFILES[cfg.silhouetteFamily] || SILHOUETTE_PROFILES.executive_sedan;

  const length = clamp(cfg.overallLength, 2.6, 15.5);
  const width = clamp(cfg.overallWidth, 1.4, 2.65);
  const height = clamp(cfg.overallHeight, 1.15, 4.25);
  const halfW = width * 0.5;

  // Wheel sizing guardrails against body height & length
  const maxWheelByHeight = (height - 0.46) * 0.48;
  const maxWheelByLength = length * 0.19;
  const wheelRadius = clamp(cfg.wheelRadius, 0.22, Math.min(0.62, maxWheelByHeight, maxWheelByLength));
  if (Math.abs(wheelRadius - cfg.wheelRadius) > 0.005) {
    warnings.push(`Clamped wheelRadius from ${roundNum(cfg.wheelRadius, 2)}m to ${roundNum(wheelRadius, 2)}m to prevent body clipping`);
  }

  const wheelThickness = clamp(cfg.wheelThickness, 0.14, Math.min(0.42, width * 0.22));
  const tireHalfW = wheelThickness * 0.5;
  const isDualRear = Boolean(cfg.dualRearWheels);
  const rearTireSpan = isDualRear ? wheelThickness * 2.08 : wheelThickness;

  // Ground clearance guardrail relative to wheel radius
  const minClearance = Math.max(0.1, wheelRadius * 0.36);
  const maxClearance = Math.min(0.62, wheelRadius * 1.15);
  const groundClearance = clamp(cfg.groundClearance, minClearance, maxClearance);
  if (Math.abs(groundClearance - cfg.groundClearance) > 0.005) {
    warnings.push(`Clamped groundClearance to ${roundNum(groundClearance, 2)}m to stay coherent with wheel radius`);
  }

  // Vertical envelope: groundClearance -> wheelArchTopY -> beltY -> roofTopY
  const minBeltY = Math.max(groundClearance + 0.34, wheelRadius * 2 + 0.07);
  const maxBeltY = Math.max(minBeltY + 0.02, height - 0.32);
  const desiredBeltY = height - cfg.roofHeight;
  const beltY = clamp(desiredBeltY, minBeltY, maxBeltY);
  const greenhouseH = Math.max(0.32, height - beltY);
  const lowerBodyH = Math.max(0.3, beltY - groundClearance);

  const wheelArchTopY = clamp(
    Math.max(groundClearance + cfg.wheelArchHeight, wheelRadius * 2 + 0.03),
    wheelRadius * 2 + 0.025,
    beltY - 0.03
  );
  const wheelArchRadius = clamp(wheelRadius + cfg.wheelArchSize, wheelRadius + 0.035, wheelRadius + 0.22);

  // Track width guardrail so wheels sit inside flares and clear chassis core
  const maxOutHalfW = halfW + cfg.fenderFlare + 0.03;
  const minTrack = Math.max(1.05, width * 0.64);
  const maxTrack = Math.max(minTrack, (maxOutHalfW - tireHalfW) * 2);
  const trackWidth = clamp(cfg.trackWidth, minTrack, maxTrack);
  const wheelCenterX = trackWidth * 0.5;
  const rearWheelCenterX = isDualRear
    ? clamp(wheelCenterX - wheelThickness * 0.42, 0.35 + rearTireSpan * 0.5, maxOutHalfW - rearTireSpan * 0.5)
    : wheelCenterX;

  // Longitudinal section lengths (rear -> cargo/trunk -> [gap] -> cabin -> hood -> front)
  const hasCabCargoGap = cfg.bodyFamily === 'pickup_cab_bed' ||
    cfg.bodyFamily === 'cab_over_box' ||
    cfg.bodyFamily === 'articulated_bus' ||
    cfg.bodyFamily === 'semi_trailer' ||
    cfg.bodyFamily === 'dump_truck' ||
    cfg.bodyFamily === 'cement_mixer' ||
    cfg.bodyFamily === 'flatbed_truck';
  let gapLen = 0;
  if (cfg.bodyFamily === 'articulated_bus') {
    gapLen = clamp(Math.max(cfg.cabCargoSeparation, 0.42), 0.35, 0.65);
  } else if (cfg.bodyFamily === 'semi_trailer') {
    gapLen = clamp(Math.max(cfg.cabCargoSeparation, 0.28), 0.2, 0.55);
  } else if (hasCabCargoGap) {
    gapLen = clamp(cfg.cabCargoSeparation, 0.04, Math.min(0.65, length * 0.07));
  }
  const availableL = Math.max(2.0, length - gapLen);

  const minHood = (cfg.bodyFamily === 'transit_bus' || cfg.bodyFamily === 'articulated_bus' || cfg.bodyFamily === 'double_decker')
    ? 0.12
    : (cfg.bodyFamily === 'cab_over_box' || cfg.bodyFamily === 'dump_truck' || cfg.bodyFamily === 'cement_mixer' || cfg.bodyFamily === 'flatbed_truck')
      ? 0.26
      : 0.42;
  const minCabin = Math.max(0.85, availableL * 0.2);
  const minCargo = (cfg.bodyFamily === 'transit_bus' || cfg.bodyFamily === 'articulated_bus' || cfg.bodyFamily === 'double_decker') ? 0.24 : 0.28;

  let hReq = Math.max(minHood, cfg.hoodLength);
  let cReq = Math.max(minCabin, cfg.cabinLength);
  let rReq = Math.max(minCargo, cfg.cargoLength);
  const reqSum = hReq + cReq + rReq;
  const scaleL = availableL / reqSum;
  let hoodLen = Math.max(minHood, hReq * scaleL);
  let cabinLen = Math.max(minCabin, cReq * scaleL);
  let cargoLen = Math.max(minCargo, rReq * scaleL);

  const excess = (hoodLen + cabinLen + cargoLen) - availableL;
  if (Math.abs(excess) > 0.0001) {
    const adjustable = (hoodLen - minHood) + (cabinLen - minCabin) + (cargoLen - minCargo);
    if (adjustable > 0.001) {
      hoodLen = Math.max(minHood, hoodLen - excess * ((hoodLen - minHood) / adjustable));
      cabinLen = Math.max(minCabin, cabinLen - excess * ((cabinLen - minCabin) / adjustable));
      cargoLen = Math.max(minCargo, availableL - hoodLen - cabinLen);
    } else {
      hoodLen = availableL * 0.2;
      cabinLen = availableL * 0.55;
      cargoLen = availableL * 0.25;
    }
  }

  const rearStartZ = -length * 0.5;
  const rearEndZ = rearStartZ + cargoLen;
  const gapStartZ = rearEndZ;
  const gapEndZ = gapStartZ + gapLen;
  const cabinStartZ = gapEndZ;
  const cabinEndZ = cabinStartZ + cabinLen;
  const hoodStartZ = cabinEndZ;
  const hoodEndZ = length * 0.5;

  // Axle placement & overlap validation
  const axleCount = cfg.axleCount === 3 && length >= 4.4 ? 3 : 2;
  if (cfg.axleCount === 3 && axleCount !== 3) {
    warnings.push('Vehicle length too short for 3 axles; fell back to 2-axle layout');
  }

  const minOverhang = wheelRadius + 0.12;
  const fOverReq = Math.max(minOverhang, cfg.frontOverhang);
  const rOverReq = Math.max(minOverhang, cfg.rearOverhang);
  const wbReq = Math.max(wheelRadius * (axleCount === 3 ? 4.8 : 2.65), cfg.wheelbase);
  const axleSpanScale = length / (fOverReq + wbReq + rOverReq);

  let frontOverhang = Math.max(minOverhang, fOverReq * axleSpanScale);
  let rearOverhang = Math.max(minOverhang, rOverReq * axleSpanScale);
  let wheelbase = length - frontOverhang - rearOverhang;

  const minWb = Math.max(wheelRadius * (axleCount === 3 ? 4.8 : 2.65), length * 0.36);
  if (wheelbase < minWb) {
    const deficit = minWb - wheelbase;
    const fSlack = Math.max(0, frontOverhang - minOverhang);
    const rSlack = Math.max(0, rearOverhang - minOverhang);
    const totalSlack = fSlack + rSlack;
    if (totalSlack > 0.001) {
      const take = Math.min(deficit, totalSlack);
      frontOverhang -= take * (fSlack / totalSlack);
      rearOverhang -= take * (rSlack / totalSlack);
    }
    wheelbase = length - frontOverhang - rearOverhang;
  }

  let frontAxleZ = hoodEndZ - frontOverhang + clamp(cfg.frontAxleOffset, -0.25, 0.25);
  let rearAxleZ = rearStartZ + rearOverhang + clamp(cfg.rearAxleOffset, -0.25, 0.25);
  frontAxleZ = clamp(frontAxleZ, rearStartZ + minOverhang + minWb, hoodEndZ - minOverhang);
  rearAxleZ = clamp(rearAxleZ, rearStartZ + minOverhang, frontAxleZ - minWb);
  wheelbase = frontAxleZ - rearAxleZ;

  const axles = [
    {
      id: 'front',
      role: 'steer',
      z: roundNum(frontAxleZ, 4),
      trackWidth: roundNum(trackWidth, 4),
      wheelCenterX: roundNum(wheelCenterX, 4),
      dual: false
    }
  ];

  if (axleCount === 3) {
    const minMidZ = rearAxleZ + wheelRadius * 2.22;
    const maxMidZ = frontAxleZ - wheelRadius * 2.3;
    const midZ = clamp(rearAxleZ + wheelRadius * 2.38, minMidZ, maxMidZ);
    axles.push({
      id: 'mid',
      role: 'tandem_drive',
      z: roundNum(midZ, 4),
      trackWidth: roundNum(rearWheelCenterX * 2, 4),
      wheelCenterX: roundNum(rearWheelCenterX, 4),
      dual: isDualRear
    });
  }

  axles.push({
    id: 'rear',
    role: 'drive',
    z: roundNum(rearAxleZ, 4),
    trackWidth: roundNum(rearWheelCenterX * 2, 4),
    wheelCenterX: roundNum(rearWheelCenterX, 4),
    dual: isDualRear
  });

  // Cabin greenhouse longitudinal bounds per body family
  const wsRakeMax = Math.min(0.95, cabinLen * 0.42);
  const wsRakeZ = clamp(Math.tan(degToRad(cfg.windshieldAngle)) * greenhouseH * 0.65, 0.08, wsRakeMax);
  const roofFrontZ = cabinEndZ - wsRakeZ;

  let cabinTopStartZ = cabinStartZ;
  let cabinBottomStartZ = cabinStartZ;
  let cargoRoofTopY = beltY;
  let hasContinuousGreenhouseOverCargo = false;

  if (cfg.bodyFamily === 'two_box') {
    hasContinuousGreenhouseOverCargo = true;
    const rwMax = Math.max(0.1, (cabinEndZ - rearStartZ) * 0.34);
    const rwRakeZ = clamp(Math.tan(degToRad(cfg.rearWindowAngle)) * greenhouseH * 0.55, 0.08, rwMax);
    cabinBottomStartZ = rearStartZ + Math.min(0.28, cargoLen * 0.25);
    cabinTopStartZ = clamp(cabinBottomStartZ + rwRakeZ, cabinBottomStartZ + 0.06, roofFrontZ - 0.35);
    cargoRoofTopY = height;
  } else if (cfg.bodyFamily === 'van_monobox' || cfg.bodyFamily === 'transit_bus' || cfg.bodyFamily === 'articulated_bus' || cfg.bodyFamily === 'double_decker') {
    hasContinuousGreenhouseOverCargo = true;
    const rwRakeZ = clamp(Math.tan(degToRad(cfg.rearWindowAngle)) * greenhouseH * 0.3, 0.04, 0.32);
    cabinBottomStartZ = rearStartZ + 0.06;
    cabinTopStartZ = clamp(cabinBottomStartZ + rwRakeZ, cabinBottomStartZ + 0.04, roofFrontZ - 0.45);
    cargoRoofTopY = height;
  } else if (cfg.bodyFamily === 'pickup_cab_bed' || cfg.bodyFamily === 'wheel_loader') {
    cabinBottomStartZ = cabinStartZ;
    cabinTopStartZ = clamp(cabinStartZ + Math.tan(degToRad(cfg.rearWindowAngle)) * greenhouseH * 0.25, cabinStartZ + 0.04, roofFrontZ - 0.25);
    cargoRoofTopY = beltY;
  } else if (
    cfg.bodyFamily === 'cab_over_box' ||
    cfg.bodyFamily === 'semi_trailer' ||
    cfg.bodyFamily === 'dump_truck' ||
    cfg.bodyFamily === 'cement_mixer' ||
    cfg.bodyFamily === 'flatbed_truck'
  ) {
    cabinBottomStartZ = cabinStartZ;
    cabinTopStartZ = clamp(cabinStartZ + 0.08, cabinStartZ + 0.04, roofFrontZ - 0.25);
    cargoRoofTopY = cfg.bodyFamily === 'semi_trailer'
      ? Math.min(height + 0.35, Math.max(height, beltY + greenhouseH + 0.15))
      : cfg.bodyFamily === 'dump_truck'
        ? Math.min(height + 0.12, Math.max(beltY + 0.85, height - 0.08))
        : cfg.bodyFamily === 'cement_mixer'
          ? Math.min(height + 0.42, height + 0.28)
          : cfg.bodyFamily === 'flatbed_truck'
            ? beltY + 0.12
            : Math.min(height + 0.22, Math.max(height, beltY + greenhouseH));
  } else {
    // three_box, fastback, wedge_futuristic
    const trunkDeckReq = clamp(cfg.trunkLength, 0.15, cargoLen * 0.96);
    const tailLen = Math.max(0.18, cargoLen);
    cabinBottomStartZ = rearStartZ + Math.min(trunkDeckReq, tailLen * 0.88);
    const maxRwZ = Math.max(0.12, roofFrontZ - cabinBottomStartZ - 0.25);
    const rwRakeZ = clamp(Math.tan(degToRad(cfg.rearWindowAngle)) * greenhouseH * 0.62, 0.12, maxRwZ);
    cabinTopStartZ = clamp(cabinBottomStartZ + rwRakeZ, cabinBottomStartZ + 0.08, roofFrontZ - 0.22);
    cargoRoofTopY = beltY;
  }

  // Roofline peak & profile
  const roofWidthRatio = clamp(1 - cfg.cabinCurvature * 0.36, 0.56, 0.94);
  const frontWidthRatio = clamp(cfg.frontFaceWidth * (1 - cfg.bodyTaper * 0.25), 0.64, 1.0);
  const rearWidthRatio = clamp(1 - cfg.bodyTaper * 0.2, 0.68, 1.0);

  // Resolve side door and bus door positions avoiding wheel arches
  const doorClearances = [];
  const fClearMin = frontAxleZ - wheelArchRadius - 0.08;
  const fClearMax = frontAxleZ + wheelArchRadius + 0.08;
  const rClearMin = (axles.length === 3 ? axles[1].z : rearAxleZ) - wheelArchRadius - 0.08;
  const rClearMax = (axles.length === 3 ? axles[1].z : rearAxleZ) + wheelArchRadius + 0.08;

  const busDoors = [];
  if (cfg.doorLayout === 'transit_bus' && cfg.busDoorPlacement !== 'none') {
    const doorW = clamp(length * 0.095, 0.72, 1.15);
    if (cfg.busDoorPlacement === 'front_only' || cfg.busDoorPlacement === 'front_and_mid') {
      const fOverSpace = hoodEndZ - fClearMax - 0.14;
      const frontDoorZ = fOverSpace >= doorW + 0.1
        ? fClearMax + 0.1 + doorW * 0.5
        : clamp(fClearMin - doorW * 0.5 - 0.08, rClearMax + doorW * 0.5 + 0.08, fClearMin - doorW * 0.5 - 0.04);
      busDoors.push({ id: 'front_entry', z: roundNum(frontDoorZ, 4), width: roundNum(doorW, 4) });
      doorClearances.push(frontDoorZ);
    }
    if (cfg.busDoorPlacement === 'front_and_mid' || cfg.busDoorPlacement === 'mid_only') {
      const midZ = clamp((rClearMax + fClearMin) * 0.5, rClearMax + doorW * 0.5 + 0.08, fClearMin - doorW * 0.5 - 0.08);
      if (fClearMin - rClearMax >= doorW + 0.12) {
        busDoors.push({ id: 'mid_entry', z: roundNum(midZ, 4), width: roundNum(doorW, 4) });
        doorClearances.push(midZ);
      } else {
        warnings.push('Insufficient wheelbase span for mid bus entry door');
      }
    }
  }

  // Rooftop mount anchor (guaranteed flush on highest roof span)
  const isBoxCargoRoof = cfg.bodyFamily === 'cab_over_box' || cfg.bodyFamily === 'semi_trailer';
  const roofMountSurfaceY = isBoxCargoRoof ? cargoRoofTopY : height;
  const roofMountMinZ = isBoxCargoRoof ? rearStartZ + 0.25 : cabinTopStartZ + 0.12;
  const roofMountMaxZ = isBoxCargoRoof ? rearEndZ - 0.25 : roofFrontZ - 0.12;

  return {
    dimensions: {
      length: roundNum(length, 4),
      width: roundNum(width, 4),
      height: roundNum(height, 4),
      halfWidth: roundNum(halfW, 4),
      groundClearance: roundNum(groundClearance, 4),
      beltY: roundNum(beltY, 4),
      lowerBodyHeight: roundNum(lowerBodyH, 4),
      greenhouseHeight: roundNum(greenhouseH, 4),
      cargoRoofTopY: roundNum(cargoRoofTopY, 4),
      wheelArchTopY: roundNum(wheelArchTopY, 4),
      wheelArchRadius: roundNum(wheelArchRadius, 4),
      wheelRadius: roundNum(wheelRadius, 4),
      wheelThickness: roundNum(wheelThickness, 4),
      trackWidth: roundNum(trackWidth, 4),
      wheelbase: roundNum(wheelbase, 4),
      frontOverhang: roundNum(frontOverhang, 4),
      rearOverhang: roundNum(rearOverhang, 4),
      roofWidthRatio: roundNum(roofWidthRatio, 4),
      frontWidthRatio: roundNum(frontWidthRatio, 4),
      rearWidthRatio: roundNum(rearWidthRatio, 4),
      boxiness: roundNum(clamp((cfg.bodyBoxiness + profile.boxiness) * 0.5, 0.15, 1.0), 4)
    },
    sections: {
      rear: {
        startZ: roundNum(rearStartZ, 4),
        endZ: roundNum(rearEndZ, 4),
        length: roundNum(cargoLen, 4)
      },
      gap: {
        startZ: roundNum(gapStartZ, 4),
        endZ: roundNum(gapEndZ, 4),
        length: roundNum(gapLen, 4),
        enabled: gapLen > 0.01
      },
      cabin: {
        startZ: roundNum(cabinStartZ, 4),
        endZ: roundNum(cabinEndZ, 4),
        length: roundNum(cabinLen, 4),
        greenhouseBottomStartZ: roundNum(cabinBottomStartZ, 4),
        roofStartZ: roundNum(cabinTopStartZ, 4),
        roofEndZ: roundNum(roofFrontZ, 4),
        hasContinuousGreenhouseOverCargo
      },
      hood: {
        startZ: roundNum(hoodStartZ, 4),
        endZ: roundNum(hoodEndZ, 4),
        length: roundNum(hoodLen, 4)
      },
      roofMount: {
        surfaceY: roundNum(roofMountSurfaceY, 4),
        minZ: roundNum(Math.min(roofMountMinZ, roofMountMaxZ - 0.1), 4),
        maxZ: roundNum(Math.max(roofMountMaxZ, roofMountMinZ + 0.1), 4),
        cabRoofY: roundNum(height, 4),
        cabRoofMinZ: roundNum(cabinTopStartZ + 0.08, 4),
        cabRoofMaxZ: roundNum(roofFrontZ - 0.08, 4)
      }
    },
    axles,
    busDoors,
    validation: {
      valid: true,
      warnings
    }
  };
}
