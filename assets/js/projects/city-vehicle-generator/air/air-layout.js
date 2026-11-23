import { clamp, roundNum } from '../utils.js';

export const AVIATION_COMPAT_REVISION = 'b.aviation-compat.v1';

export function resolveAirVehicleLayout(cfg) {
  const isTwin = cfg.bodyFamily === 'air_twin_chopper';
  const length = clamp(Number(cfg.overallLength) || (isTwin ? 12.2 : 10.4), 8.2, 14.5);
  const width = clamp(Number(cfg.overallWidth) || (isTwin ? 2.68 : 2.35), 1.9, 3.1);
  const height = clamp(Number(cfg.overallHeight) || (isTwin ? 3.48 : 3.15), 2.6, 4.1);
  const rotorDiameter = clamp(Number(cfg.airRotorDiameter) || (isTwin ? 11.4 : 9.8), 7.4, 13.5);
  const rotorRadius = rotorDiameter * 0.5;
  const blades = clamp(Math.round(Number(cfg.airRotorBlades) || (isTwin ? 4 : 2)), 2, 5);

  const halfW = width * 0.5;
  const skidTrackHalfX = clamp(halfW * 0.86, 0.78, 1.25);
  const bellyY = isTwin ? 0.74 : 0.66;
  const cabinRoofY = clamp(height - 0.76, bellyY + 1.25, height - 0.58);
  const cowlingTopY = cabinRoofY + (isTwin ? 0.42 : 0.34);
  const mastTopY = height;

  // Longitudinal layout (+Z nose forward, -Z tail boom aft)
  const noseZ = length * 0.34;
  const cabinFrontZ = noseZ - (isTwin ? 1.15 : 1.05);
  const cabinRearZ = -length * 0.12;
  const tailEndZ = -length * 0.66;
  const rotorHubZ = (cabinFrontZ + cabinRearZ) * 0.45 + 0.15;
  const tailRotorZ = tailEndZ + 0.45;
  const tailRotorY = cabinRoofY + 0.12;

  const cabinHalfW = halfW * 0.84;
  const skidMinZ = cabinRearZ - 0.15;
  const skidMaxZ = noseZ - 0.55;

  const aviationCompatibility = {
    profileRevision: AVIATION_COMPAT_REVISION,
    vehicleDomain: 'air',
    aircraftClass: isTwin ? 'twin_turbine_utility' : 'light_utility_rotorcraft',
    role: cfg.roleVariant || 'news_media',
    rotorDiscRadiusMeters: roundNum(rotorRadius, 3),
    rotorBladeCount: blades,
    helipadMinDiameterMeters: roundNum(Math.max(rotorDiameter + 2.5, length + 2.0), 2),
    skidTrackWidthMeters: roundNum(skidTrackHalfX * 2, 3),
    landingGearType: cfg.airLandingGear || 'skids',
    tailStyle: cfg.airTailStyle || 'classic_rotor',
    tailBoomReachMeters: roundNum(Math.abs(tailEndZ), 3),
    hoverDatumY: 0
  };

  return {
    dimensions: {
      length: roundNum(length, 4),
      width: roundNum(width, 4),
      halfWidth: roundNum(halfW, 4),
      height: roundNum(height, 4),
      wheelbase: roundNum(skidMaxZ - skidMinZ, 4),
      frontOverhang: roundNum(noseZ - skidMaxZ, 4),
      rearOverhang: roundNum(skidMinZ - tailEndZ, 4),
      wheelRadius: 0.22,
      wheelThickness: 0.16,
      groundClearance: roundNum(bellyY, 4),
      beltY: roundNum(bellyY + (cabinRoofY - bellyY) * 0.48, 4),
      roofTopY: roundNum(cabinRoofY, 4),
      cargoRoofTopY: roundNum(cowlingTopY, 4),
      lowerBodyH: roundNum((cabinRoofY - bellyY) * 0.48, 4),
      greenhouseH: roundNum((cabinRoofY - bellyY) * 0.52, 4)
    },
    sections: {
      rear: { startZ: roundNum(tailEndZ, 4), endZ: roundNum(cabinRearZ, 4), length: roundNum(cabinRearZ - tailEndZ, 4) },
      gap: { startZ: roundNum(cabinRearZ, 4), endZ: roundNum(cabinRearZ, 4), length: 0 },
      cabin: { startZ: roundNum(cabinRearZ, 4), endZ: roundNum(cabinFrontZ, 4), length: roundNum(cabinFrontZ - cabinRearZ, 4) },
      hood: { startZ: roundNum(cabinFrontZ, 4), endZ: roundNum(noseZ, 4), length: roundNum(noseZ - cabinFrontZ, 4) },
      roofMount: { minZ: roundNum(cabinRearZ, 4), maxZ: roundNum(cabinFrontZ, 4), cabRoofMinZ: roundNum(cabinRearZ, 4), cabRoofMaxZ: roundNum(cabinFrontZ, 4) }
    },
    axles: [
      { id: 'skid_front', z: roundNum(skidMaxZ - 0.35, 4), wheelCenterX: roundNum(skidTrackHalfX, 4), isFront: true },
      { id: 'skid_rear', z: roundNum(skidMinZ + 0.35, 4), wheelCenterX: roundNum(skidTrackHalfX, 4), isFront: false }
    ],
    busDoors: [],
    air: {
      isTwin,
      noseZ: roundNum(noseZ, 4),
      cabinFrontZ: roundNum(cabinFrontZ, 4),
      cabinRearZ: roundNum(cabinRearZ, 4),
      tailEndZ: roundNum(tailEndZ, 4),
      cabinHalfW: roundNum(cabinHalfW, 4),
      bellyY: roundNum(bellyY, 4),
      cabinRoofY: roundNum(cabinRoofY, 4),
      cowlingTopY: roundNum(cowlingTopY, 4),
      mastTopY: roundNum(mastTopY, 4),
      rotorHubZ: roundNum(rotorHubZ, 4),
      rotorRadius: roundNum(rotorRadius, 4),
      rotorDiameter: roundNum(rotorDiameter, 4),
      blades,
      tailRotorZ: roundNum(tailRotorZ, 4),
      tailRotorY: roundNum(tailRotorY, 4),
      skidTrackHalfX: roundNum(skidTrackHalfX, 4),
      skidMinZ: roundNum(skidMinZ, 4),
      skidMaxZ: roundNum(skidMaxZ, 4),
      compatibility: aviationCompatibility
    },
    validation: {
      ok: true,
      warnings: []
    }
  };
}
