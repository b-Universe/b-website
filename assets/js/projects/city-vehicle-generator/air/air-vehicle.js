import { clamp, colorHex, degToRad, lerp } from '../utils.js';
import { sanitiseConfig } from '../config.js';
import { resolveAirVehicleLayout } from './air-layout.js';
import { generateVehicleBlueprint } from '../core/blueprints.js';
import { resolveVehicleMaterialBundle } from '../materials/materials.js';
import { VehicleBatcher, vehRoot } from '../geometry/primitives.js';

function airVehMakeBannerPlate(parent, text, w, h, x, y, z, rotY = 0, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  const bg = colorHex(options.bgHex, '#132645');
  const fg = colorHex(options.fgHex, '#f8fafc');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 72);
    ctx.strokeStyle = colorHex(options.borderHex, '#e2352c');
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 64);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = String(text || 'SKYCAM 4').slice(0, 18);
    let fontSize = 34;
    ctx.font = `bold ${fontSize}px Arial`;
    while (fontSize > 15 && ctx.measureText(label).width > 228) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial`;
    }
    ctx.fillText(label, 128, 37);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = options.lit
    ? new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff', emissive: bg, emissiveIntensity: 0.4 })
    : new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.016), mat);
  mesh.position.set(x, y, z);
  if (rotY) mesh.rotation.y = rotY;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData = {
    layer: 'detail',
    materialRole: 'signFace',
    _tex: tex,
    _ownedMat: true
  };
  if (parent) parent.add(mesh);
  return mesh;
}

export function applyAirVehiclePose(airRoot, pose = {}) {
  if (!airRoot || !airRoot.userData?.airParts) return;
  const parts = airRoot.userData.airParts;
  if (Number.isFinite(pose.rotorSpinRad)) {
    if (parts.mainRotor) parts.mainRotor.rotation.y = pose.rotorSpinRad;
    if (parts.tailRotor) parts.tailRotor.rotation.x = pose.rotorSpinRad * 4.2;
  }
  if (Number.isFinite(pose.hoverHeight) && parts.airframe) {
    parts.airframe.position.y = clamp(pose.hoverHeight, 0, 3.5);
  }
  if (Number.isFinite(pose.doorOpenFactor)) {
    const f = clamp(pose.doorOpenFactor, 0, 1);
    for (const dr of parts.doors || []) {
      const base = dr.userData?.basePos || [0, 0, 0];
      const vec = dr.userData?.slideVector || [0, 0, 0];
      dr.position.set(base[0] + vec[0] * f, base[1] + vec[1] * f, base[2] + vec[2] * f);
    }
  }
}

export function createAirVehicle(rawCfg, options = {}) {
  const cfg = sanitiseConfig(rawCfg);
  const layout = resolveAirVehicleLayout(cfg);
  const air = layout.air;
  const root = vehRoot(null, 0, 0, 0);
  root.name = `AirVehicle_${cfg.style}_${cfg.seed}`;

  const materialBundle = resolveVehicleMaterialBundle(cfg, {
    lightingTime: options.lightingTime || cfg.lightingTime
  });

  const airframe = new THREE.Group();
  airframe.name = 'Airframe';
  root.add(airframe);

  const batcher = new VehicleBatcher();
  const cHW = air.cabinHalfW;
  const bellyY = air.bellyY;
  const roofY = air.cabinRoofY;
  const beltY = lerp(bellyY, roofY, 0.44);
  const glassRole = cfg.airInteriorEnabled ? 'railGlass' : 'glass';

  // 1. Sculpted Aerodynamic Fuselage Pod (nose -> cockpit -> passenger/camera cabin -> tail taper)
  batcher.addLoftedSlices([
    { z: air.cabinRearZ - 0.65, bottomY: bellyY + 0.42, beltY: lerp(bellyY, roofY, 0.62), topY: roofY - 0.14, hwBottom: cHW * 0.36, hwBelt: cHW * 0.46, hwTop: cHW * 0.34 },
    { z: air.cabinRearZ, bottomY: bellyY + 0.06, beltY, topY: roofY, hwBottom: cHW * 0.78, hwBelt: cHW, hwTop: cHW * 0.72 },
    { z: air.cabinFrontZ + 0.15, bottomY: bellyY, beltY, topY: roofY, hwBottom: cHW * 0.84, hwBelt: cHW, hwTop: cHW * 0.74 },
    { z: air.noseZ - 0.45, bottomY: bellyY + 0.08, beltY: beltY - 0.06, topY: beltY + 0.34, hwBottom: cHW * 0.64, hwBelt: cHW * 0.74, hwTop: cHW * 0.56 },
    { z: air.noseZ, bottomY: bellyY + 0.24, beltY: bellyY + 0.44, topY: bellyY + 0.58, hwBottom: cHW * 0.26, hwBelt: cHW * 0.32, hwTop: cHW * 0.22 }
  ], 'primary', 'body');

  // Secondary accent belly & broadcast livery stripes
  batcher.addBox(0, bellyY + 0.12, (air.cabinRearZ + air.cabinFrontZ) * 0.5, cHW * 1.66, 0.24, air.cabinFrontZ - air.cabinRearZ + 0.2, {
    materialRole: 'secondary',
    layer: 'body'
  });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (cHW + 0.014), beltY - 0.08, (air.cabinRearZ + air.cabinFrontZ) * 0.5, 0.024, 0.14, air.cabinFrontZ - air.cabinRearZ + 0.15, {
      materialRole: 'livery',
      layer: 'body'
    });
  }

  // Wraparound panoramic bubble cockpit canopy + side cockpit windows
  const wsMidZ = lerp(air.cabinFrontZ, air.noseZ, 0.46);
  const wsMidY = lerp(beltY, roofY, 0.52);
  batcher.addBox(0, wsMidY, wsMidZ, cHW * 1.44, (roofY - beltY) * 0.96, 0.98, {
    rotX: 0.54,
    materialRole: glassRole,
    layer: 'glass'
  });
  for (const side of [-1, 1]) {
    batcher.addBox(side * (cHW * 0.92), wsMidY + 0.02, air.cabinFrontZ - 0.35, 0.08, (roofY - beltY) * 0.76, 1.15, {
      materialRole: glassRole,
      layer: 'glass'
    });
  }

  // Optional cockpit & camera-operator interior seats + instrument console
  if (cfg.airInteriorEnabled) {
    batcher.addBox(0, bellyY + 0.22, (air.cabinRearZ + air.cabinFrontZ) * 0.5, cHW * 1.35, 0.08, air.cabinFrontZ - air.cabinRearZ - 0.2, {
      materialRole: 'interiorDark',
      layer: 'interior'
    });
    batcher.addBox(0, beltY + 0.05, air.cabinFrontZ + 0.28, cHW * 0.92, 0.28, 0.38, { materialRole: 'trim', layer: 'interior' });
    for (const sx of [-0.36, 0.36]) {
      batcher.addBox(sx, bellyY + 0.54, air.cabinFrontZ - 0.35, 0.42, 0.56, 0.42, { materialRole: 'secondary', layer: 'interior' });
    }
  }

  // 2. Top Turbine Engine Cowling & Exhaust Nozzles
  const cowlLen = air.isTwin ? 2.55 : 2.1;
  const cowlH = air.cowlingTopY - roofY;
  batcher.addBox(0, roofY + cowlH * 0.5, air.rotorHubZ - 0.22, air.isTwin ? cHW * 1.18 : cHW * 0.88, cowlH, cowlLen, {
    materialRole: 'secondary',
    layer: 'body'
  });
  const exhaustXs = air.isTwin ? [-0.34, 0.34] : [0];
  for (const ex of exhaustXs) {
    batcher.addCylinder(ex, roofY + cowlH * 0.58, air.rotorHubZ - 0.22 - cowlLen * 0.52, 0.14, 0.11, 0.36, 10, 'z', 'chassisDark', 'detail');
  }
  // Main rotor mast shaft rising from cowling to mastTopY
  const mastH = air.mastTopY - air.cowlingTopY;
  batcher.addCylinder(0, air.cowlingTopY + mastH * 0.5, air.rotorHubZ, 0.095, 0.12, mastH + 0.08, 10, 'y', 'utility', 'detail');

  // 3. Tapered Tail Boom, Horizontal Stabilizers & Vertical Tail Fin
  const boomStartZ = air.cabinRearZ - 0.45;
  const boomEndZ = air.tailEndZ + 0.32;
  const boomLen = Math.max(2.6, boomStartZ - boomEndZ);
  const boomMidZ = (boomStartZ + boomEndZ) * 0.5;
  const boomY = lerp(bellyY, roofY, 0.64);
  batcher.addCylinder(0, boomY, boomMidZ, 0.32, 0.14, boomLen, 10, 'z', 'primary', 'body');
  // Horizontal tailplane stabilizers
  batcher.addBox(0, boomY + 0.04, boomEndZ + 1.15, 1.85, 0.07, 0.44, { materialRole: 'secondary', layer: 'body' });
  for (const side of [-1, 1]) {
    batcher.addBox(side * 0.92, boomY + 0.04, boomEndZ + 1.15, 0.05, 0.36, 0.4, { materialRole: 'livery', layer: 'body' });
  }
  // Swept vertical tail fin (and optional fenestron shroud)
  const finH = air.isTwin ? 1.38 : 1.15;
  batcher.addBox(0, boomY + finH * 0.42, air.tailEndZ + 0.38, 0.12, finH, 0.72, {
    rotX: 0.26,
    materialRole: 'secondary',
    layer: 'body'
  });
  batcher.addBox(0, boomY - 0.28, air.tailEndZ + 0.48, 0.09, 0.48, 0.42, {
    rotX: -0.22,
    materialRole: 'livery',
    layer: 'body'
  });
  if (cfg.airTailStyle === 'fenestron_shroud') {
    batcher.addCylinder(0, air.tailRotorY, air.tailRotorZ, 0.44, 0.44, 0.18, 14, 'x', 'livery', 'body');
    batcher.addCylinder(0, air.tailRotorY, air.tailRotorZ, 0.34, 0.34, 0.2, 14, 'x', 'interiorDark', 'detail');
  }
  // Tail strobe beacon & tail boom callsign plates
  batcher.addCylinder(0, boomY + finH * 0.92, air.tailEndZ + 0.22, 0.055, 0.055, 0.1, 8, 'y', 'redLight', 'detail');
  for (const side of [-1, 1]) {
    airVehMakeBannerPlate(airframe, cfg.airCallsign || 'CH4-SKY', 1.15, 0.22, side * 0.26, boomY, boomMidZ + 0.65, side * Math.PI * 0.5, {
      bgHex: cfg.bodySecondaryColor || '#1b3868',
      fgHex: '#f8fafc',
      borderHex: cfg.liveryStripeColor || '#e2352c',
      lit: false
    });
    airVehMakeBannerPlate(airframe, cfg.signText || 'SKYCAM 4 NEWS', 1.45, 0.26, side * (cHW + 0.022), bellyY + 0.38, (air.cabinRearZ + air.cabinFrontZ) * 0.5, side * Math.PI * 0.5, {
      bgHex: cfg.bodySecondaryColor || '#1b3868',
      fgHex: '#f8fafc',
      borderHex: cfg.liveryStripeColor || '#e2352c',
      lit: Boolean(cfg.emergencyLightsLit)
    });
  }

  // 4. Landing Gear (Tubular Skids or Wheeled Gear sitting cleanly at y = 0!)
  const skidX = air.skidTrackHalfX;
  const skidLen = air.skidMaxZ - air.skidMinZ;
  const skidMidZ = (air.skidMinZ + air.skidMaxZ) * 0.5;
  if (cfg.airLandingGear === 'wheeled_gear') {
    // Nose wheel + twin rear main landing gear wheels resting at y = 0
    const wheelR = 0.22;
    batcher.addCylinder(0, wheelR, air.noseZ - 0.72, wheelR, wheelR, 0.14, 12, 'x', 'tire', 'wheel');
    batcher.addCylinder(0, (wheelR + bellyY) * 0.5, air.noseZ - 0.72, 0.045, 0.05, bellyY - wheelR + 0.12, 8, 'y', 'utility', 'chassis');
    for (const side of [-1, 1]) {
      batcher.addCylinder(side * skidX, wheelR, air.cabinRearZ + 0.35, wheelR, wheelR, 0.18, 12, 'x', 'tire', 'wheel');
      batcher.addCylinder(side * skidX, wheelR, air.cabinRearZ + 0.35, wheelR * 0.52, wheelR * 0.52, 0.2, 10, 'x', 'rim', 'wheel');
      batcher.addBox(side * (skidX * 0.62), (wheelR + bellyY) * 0.52, air.cabinRearZ + 0.35, skidX * 0.9, 0.09, 0.14, {
        rotZ: side * 0.45,
        materialRole: 'utility',
        layer: 'chassis'
      });
    }
  } else {
    const tubeR = 0.045;
    for (const side of [-1, 1]) {
      // Main ground-contact skid rail (bottom at exact y = 0!)
      batcher.addCylinder(side * skidX, tubeR, skidMidZ, tubeR, tubeR, skidLen, 10, 'z', 'utility', 'chassis');
      // Upturned front skid toe tip
      batcher.addCylinder(side * skidX, tubeR + 0.09, air.skidMaxZ + 0.18, tubeR * 0.9, tubeR, 0.42, 8, 'z', 'utility', 'chassis', 0, -0.45);
      // Front & rear angled support struts connecting skid rail up into fuselage belly
      for (const sz of [air.skidMinZ + 0.55, air.skidMaxZ - 0.48]) {
        const dx = -side * (skidX - cHW * 0.56);
        const dy = bellyY + 0.08 - tubeR;
        const sLen = Math.hypot(dx, dy) + 0.06;
        batcher.addBox(side * skidX + dx * 0.5, tubeR + dy * 0.5, sz, 0.068, sLen, 0.085, {
          rotZ: -Math.atan2(dx, dy),
          materialRole: 'chassisDark',
          layer: 'chassis'
        });
      }
    }
  }

  // 5. Under-Nose Stabilized Gyro-Camera Broadcast Gimbal & Searchlight!
  if (cfg.airNoseGimbal && cfg.airNoseGimbal !== 'none') {
    const gimZ = air.noseZ - 0.28;
    const gimY = bellyY - 0.08;
    batcher.addBox(0, gimY + 0.16, gimZ, 0.22, 0.24, 0.24, { materialRole: 'chassisDark', layer: 'detail' });
    batcher.addCylinder(0, gimY - 0.04, gimZ, 0.21, 0.21, 0.28, 12, 'x', 'trim', 'detail');
    batcher.addCylinder(0, gimY - 0.04, gimZ + 0.15, 0.11, 0.13, 0.08, 10, 'z', 'glass', 'detail');
    batcher.addCylinder(0.06, gimY - 0.04, gimZ + 0.19, 0.045, 0.045, 0.04, 8, 'z', 'redLight', 'detail');
    if (cfg.airNoseGimbal === 'dual_flir_light') {
      batcher.addCylinder(-0.34, gimY + 0.02, gimZ - 0.12, 0.12, 0.13, 0.26, 10, 'z', 'chassisDark', 'detail');
      batcher.addCylinder(-0.34, gimY + 0.02, gimZ + 0.02, 0.1, 0.1, 0.04, 10, 'z', 'headlight', 'detail');
    }
  }
  // Landing headlamp & wingtip-style nav strobes
  batcher.addCylinder(0, bellyY + 0.28, air.noseZ + 0.01, 0.08, 0.08, 0.04, 10, 'z', 'headlight', 'detail');
  batcher.addCylinder(-cHW - 0.04, beltY, air.cabinFrontZ - 0.2, 0.045, 0.045, 0.08, 8, 'x', 'redLight', 'detail');
  batcher.addCylinder(cHW + 0.04, beltY, air.cabinFrontZ - 0.2, 0.045, 0.045, 0.08, 8, 'x', 'blueLight', 'detail');

  const bodyMeshes = batcher.finalize(airframe, materialBundle, {
    castShadow: options.castShadow !== false,
    receiveShadow: options.receiveShadow !== false
  });

  // 6. Articulated Sliding Camera-Bay Side Doors (open when airDoorsOpen > 0)
  const doors = [];
  const doorLen = 1.05;
  const doorH = (roofY - bellyY) * 0.72;
  const doorZ = lerp(air.cabinRearZ, air.cabinFrontZ, 0.34);
  for (const side of [-1, 1]) {
    const dGrp = new THREE.Group();
    dGrp.name = `AirDoor_${side < 0 ? 'left' : 'right'}`;
    const dBatch = new VehicleBatcher();
    dBatch.addBox(side * (cHW + 0.02), bellyY + 0.2 + doorH * 0.5, doorZ, 0.06, doorH, doorLen, { materialRole: 'primary', layer: 'body' });
    dBatch.addBox(side * (cHW + 0.032), lerp(beltY, roofY, 0.5), doorZ, 0.04, doorH * 0.45, doorLen * 0.72, { materialRole: glassRole, layer: 'glass' });
    dBatch.finalize(dGrp, materialBundle);
    dGrp.userData = {
      pivotType: 'door',
      basePos: [0, 0, 0],
      slideVector: [side * 0.08, 0, -doorLen * 0.85]
    };
    airframe.add(dGrp);
    doors.push(dGrp);
  }

  // 7. Spinning Main Rotor Assembly (`MainRotor`)
  const mainRotor = new THREE.Group();
  mainRotor.name = 'MainRotor';
  mainRotor.position.set(0, air.mastTopY, air.rotorHubZ);
  const mrBatch = new VehicleBatcher();
  mrBatch.addCylinder(0, 0.04, 0, 0.22, 0.26, 0.16, 12, 'y', 'chassisDark', 'detail');
  mrBatch.addCylinder(0, 0.13, 0, 0.14, 0.18, 0.08, 10, 'y', 'livery', 'detail');
  const bladeLen = air.rotorRadius;
  for (let b = 0; b < air.blades; b++) {
    const ang = (b / air.blades) * Math.PI * 2;
    const midR = bladeLen * 0.52;
    const bx = Math.sin(ang) * midR;
    const bz = Math.cos(ang) * midR;
    mrBatch.addBox(bx, 0.05, bz, 0.22, 0.028, bladeLen - 0.16, {
      rotY: ang,
      materialRole: 'chassisDark',
      layer: 'detail'
    });
    // High-visibility rotor blade warning tip
    const tipR = bladeLen - 0.22;
    mrBatch.addBox(Math.sin(ang) * tipR, 0.052, Math.cos(ang) * tipR, 0.23, 0.032, 0.34, {
      rotY: ang,
      materialRole: 'livery',
      layer: 'detail'
    });
  }
  mrBatch.finalize(mainRotor, materialBundle);
  airframe.add(mainRotor);

  // 8. Spinning Tail Rotor Assembly (`TailRotor`)
  const tailRotor = new THREE.Group();
  tailRotor.name = 'TailRotor';
  const trX = cfg.airTailStyle === 'fenestron_shroud' ? 0 : 0.16;
  tailRotor.position.set(trX, air.tailRotorY, air.tailRotorZ);
  const trBatch = new VehicleBatcher();
  const trSpan = cfg.airTailStyle === 'fenestron_shroud' ? 0.62 : 1.05;
  trBatch.addCylinder(0, 0, 0, 0.07, 0.07, 0.14, 8, 'x', 'utility', 'detail');
  const trCount = cfg.airTailStyle === 'fenestron_shroud' ? 4 : 2;
  for (let i = 0; i < trCount; i++) {
    trBatch.addBox(0, 0, 0, 0.024, trSpan, 0.09, {
      rotX: (i / trCount) * Math.PI,
      materialRole: i === 0 ? 'livery' : 'chassisDark',
      layer: 'detail'
    });
  }
  trBatch.finalize(tailRotor, materialBundle);
  airframe.add(tailRotor);

  let triangles = 0;
  let vertices = 0;
  let drawCalls = 0;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    drawCalls++;
    const geo = obj.geometry;
    if (geo) {
      if (geo.index) triangles += geo.index.count / 3;
      else if (geo.attributes?.position) triangles += geo.attributes.position.count / 3;
      if (geo.attributes?.position) vertices += geo.attributes.position.count;
    }
  });

  const geometryStats = {
    drawCalls,
    batchedBuckets: bodyMeshes.length,
    triangles: Math.round(triangles),
    vertices: Math.round(vertices)
  };

  const blueprint = generateVehicleBlueprint(cfg, { layout, geometryStats });
  root.userData.blueprint = blueprint;
  root.userData.layout = layout;
  root.userData.airParts = {
    airframe,
    mainRotor,
    tailRotor,
    doors
  };

  applyAirVehiclePose(root, {
    rotorSpinRad: degToRad(cfg.airRotorSpinDeg || 0),
    hoverHeight: clamp(cfg.airHoverHeight || 0, 0, 3.5),
    doorOpenFactor: clamp(cfg.airDoorsOpen ?? (cfg.doorsOpen ? 1 : 0), 0, 1)
  });

  return root;
}
