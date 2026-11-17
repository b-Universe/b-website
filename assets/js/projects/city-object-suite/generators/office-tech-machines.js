import { clamp, degToRad } from '../utils.js';
import { registerObjectFamily } from '../core/registry.js';
import { ObjectBatcher, objCreateScreenPlane, objCreateSignPlane } from '../geometry/primitives.js';
import { ofsBuildOfficeDesk } from './office-furniture-seating.js';

function otmBuildMonitorUnit(group, cfg, b, cx, cy, cz, w, h, rotY = 0, screenMode = 'desktop_ui') {
  const sinR = Math.sin(rotY);
  const cosR = Math.cos(rotY);
  // Housing & bezel
  b.addChamferBox(cx, cy, cz, w, h, 0.036, 0.008, { materialRole: 'frame', layer: 'body', rotY });
  // Screen face slightly forward along local +Z
  const faceDist = 0.02;
  objCreateScreenPlane(group, screenMode, w * 0.91, h * 0.86, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
    x: cx + sinR * faceDist,
    y: cy,
    z: cz + cosR * faceDist,
    rotY
  });
  // Thin bottom status indicator led
  b.addBox(
    cx + sinR * 0.019 + cosR * (w * 0.36),
    cy - h * 0.44,
    cz + cosR * 0.019 - sinR * (w * 0.36),
    0.012,
    0.006,
    0.006,
    { materialRole: screenMode === 'off' ? 'darkMetal' : 'signalGreen', layer: 'detail', rotY }
  );
}

function otmBuildKeyboardAndMouse(b, xOffset = 0, zOffset = 0.16, retro = false) {
  const kbMat = retro ? 'secondary' : 'darkMetal';
  const mouseMat = retro ? 'secondary' : 'frame';
  b.addChamferBox(xOffset - 0.04, 0.011, zOffset, 0.38, 0.018, 0.145, 0.004, { materialRole: kbMat, layer: 'detail', rotXDeg: 6 });
  b.addBox(xOffset - 0.04, 0.021, zOffset - 0.004, 0.35, 0.006, 0.11, { materialRole: retro ? 'whiteTrim' : 'frame', layer: 'detail', rotXDeg: 6 });
  // Mouse pad + mouse
  b.addBox(xOffset + 0.24, 0.003, zOffset, 0.19, 0.005, 0.21, { materialRole: 'rubber', layer: 'detail' });
  b.addChamferBox(xOffset + 0.24, 0.018, zOffset, 0.056, 0.026, 0.095, 0.01, { materialRole: mouseMat, layer: 'detail' });
}

function otmBuildPcTower(b, tx, tz, tall = true, modern = true) {
  const tw = tall ? 0.2 : 0.38;
  const th = tall ? 0.44 : 0.13;
  const td = tall ? 0.44 : 0.38;
  b.addChamferBox(tx, th * 0.5, tz, tw, th, td, 0.01, { materialRole: modern ? 'darkMetal' : 'secondary', layer: 'body' });
  b.addBox(tx, th * 0.65, tz + td * 0.5 + 0.006, tw * 0.78, th * 0.14, 0.01, { materialRole: 'frame', layer: 'detail' });
  b.addCylinder(tx - tw * 0.22, th * 0.42, tz + td * 0.5 + 0.007, 0.011, 0.011, 0.008, 6, 'z', 'signalGreen', 'detail');
  if (modern) {
    b.addBox(tx, th * 0.28, tz + td * 0.5 + 0.006, tw * 0.72, th * 0.26, 0.008, { materialRole: 'accent', layer: 'detail' });
  }
}

function otmResolveMountedDeskConfig(cfg, style, monW, showTower) {
  const deskStyle = cfg.deskStyle || 'none';
  if (deskStyle === 'none' || style === 'server_rack') return null;

  const yaw = degToRad(14);
  const span = monW * 0.52 + 0.01;
  const isWideMulti = style === 'dual_monitor' || style === 'security_desk_rig';
  const rightMonEdge = isWideMulti ? (span + monW * 0.5 * Math.cos(yaw)) : (monW * 0.5);
  const towerRightEdge = showTower && style !== 'all_in_one' ? (rightMonEdge + 0.18 + 0.11) : rightMonEdge;
  const minDeskW = clamp(Math.max(1.48, (towerRightEdge + 0.12) * 2), 1.48, 2.4);

  const presets = {
    rectangular: {
      deskStyle: 'rectangular',
      width: Math.max(1.55, minDeskW),
      depth: 0.78,
      height: 0.74,
      pedestalConfig: 'right_single',
      modestyPanel: true,
      cableGrommets: true,
      zOffset: 0
    },
    executive_solid: {
      deskStyle: 'executive_solid',
      width: Math.max(1.95, minDeskW),
      depth: 0.92,
      height: 0.76,
      pedestalConfig: 'dual',
      modestyPanel: true,
      cableGrommets: true,
      zOffset: 0
    },
    l_shaped: {
      deskStyle: 'l_shaped',
      width: Math.max(1.8, minDeskW),
      depth: 0.8,
      height: 0.74,
      returnLength: 1.15,
      pedestalConfig: 'left_single',
      modestyPanel: true,
      cableGrommets: true,
      zOffset: 0
    },
    u_shaped: {
      deskStyle: 'u_shaped',
      width: Math.max(2.1, minDeskW),
      depth: 0.86,
      height: 0.74,
      returnLength: 1.3,
      pedestalConfig: 'dual',
      modestyPanel: true,
      overheadHutch: true,
      cableGrommets: true,
      zOffset: 0.12
    },
    standing_adjustable: {
      deskStyle: 'standing_adjustable',
      width: Math.max(1.6, minDeskW),
      depth: 0.76,
      height: 1.06,
      pedestalConfig: 'none',
      modestyPanel: false,
      cableGrommets: true,
      zOffset: 0
    },
    budget_government: {
      deskStyle: 'rectangular',
      width: Math.max(1.55, minDeskW),
      depth: 0.78,
      height: 0.74,
      pedestalConfig: 'dual',
      modestyPanel: true,
      keyboardTray: true,
      cableGrommets: true,
      zOffset: 0
    },
    drafting_table: {
      deskStyle: 'drafting_table',
      width: Math.max(1.55, minDeskW),
      depth: 0.86,
      height: 0.92,
      pedestalConfig: 'none',
      modestyPanel: false,
      surfaceTiltDeg: 0,
      cableGrommets: false,
      zOffset: 0
    },
    compact_hutch: {
      deskStyle: 'rectangular',
      width: Math.max(1.48, minDeskW),
      depth: 0.84,
      height: 0.74,
      pedestalConfig: 'right_single',
      modestyPanel: true,
      overheadHutch: true,
      cableGrommets: true,
      zOffset: 0.12
    }
  };

  const chosen = presets[deskStyle] || presets.rectangular;
  return {
    ...cfg,
    ...chosen
  };
}

function otmBuildComputerEquipment(targetGroup, cfg, targetBatch, mats, meta) {
  const style = cfg.workstationStyle || 'single_lcd';
  const monW = clamp(cfg.monitorWidth || 0.56, 0.36, 0.92);
  const monH = clamp(cfg.monitorHeight || 0.34, 0.24, 0.52);
  const screenMode = cfg.screenMode || 'desktop_ui';
  const showTower = cfg.includePcTower !== false;

  if (style === 'retro_crt') {
    if (showTower) {
      otmBuildPcTower(targetBatch, 0, -0.08, false, false);
    }
    const baseY = showTower ? 0.13 : 0;
    targetBatch.addCylinder(0, baseY + 0.022, -0.08, 0.16, 0.19, 0.044, 10, 'y', 'secondary', 'body');
    const crtW = monW * 0.82;
    const crtH = crtW * 0.82;
    targetBatch.addChamferBox(0, baseY + 0.044 + crtH * 0.5, -0.05, crtW, crtH, 0.26, 0.02, { materialRole: 'secondary', layer: 'body' });
    targetBatch.addTrapezoidBox(0, baseY + 0.044 + crtH * 0.5, -0.24, crtW * 0.72, 0.18, crtW * 0.52, 0.18, crtH * 0.76, {
      materialRole: 'secondary',
      layer: 'body',
      rotXDeg: 90
    });
    objCreateScreenPlane(targetGroup, screenMode, crtW * 0.82, crtH * 0.76, cfg.emissiveColor || '#3be882', cfg.condition, cfg.seed, {
      x: 0,
      y: baseY + 0.044 + crtH * 0.5,
      z: 0.086
    });
    otmBuildKeyboardAndMouse(targetBatch, 0, 0.2, true);
  } else if (style === 'laptop_dock') {
    const lapW = clamp(monW * 0.68, 0.3, 0.44);
    const lapD = 0.25;
    targetBatch.addChamferBox(0, 0.012, 0.04, lapW, 0.022, lapD, 0.005, { materialRole: 'chrome', layer: 'body' });
    targetBatch.addBox(0, 0.024, 0.02, lapW * 0.86, 0.006, lapD * 0.45, { materialRole: 'darkMetal', layer: 'detail' });
    targetBatch.addBox(0, 0.024, 0.11, lapW * 0.26, 0.004, lapD * 0.22, { materialRole: 'frame', layer: 'detail' });
    const lidRad = degToRad(-18);
    targetBatch.addChamferBox(0, 0.145, -0.1, lapW, lapD * 0.94, 0.012, 0.004, { materialRole: 'chrome', layer: 'body', rotX: lidRad });
    objCreateScreenPlane(targetGroup, screenMode, lapW * 0.9, lapD * 0.82, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: 0.145,
      z: -0.092,
      rotX: lidRad
    });
    if (cfg.dockExternalDisplay) {
      otmBuildMonitorUnit(targetGroup, cfg, targetBatch, lapW * 0.68, monH * 0.65, -0.16, monW * 0.9, monH * 0.9, degToRad(-14), 'spreadsheet');
      targetBatch.addCylinder(lapW * 0.68, (monH * 0.65) * 0.5, -0.2, 0.02, 0.025, monH * 0.6, 8, 'y', 'frame', 'body');
      targetBatch.addBox(lapW * 0.68, 0.01, -0.18, 0.2, 0.016, 0.16, { materialRole: 'frame', layer: 'body' });
    }
  } else {
    const monCY = 0.16 + monH * 0.5;
    const yaw = degToRad(14);
    const span = monW * 0.52 + 0.01;
    const isMulti = style === 'dual_monitor' || style === 'security_desk_rig';
    if (isMulti) {
      targetBatch.addBox(0, 0.012, -0.16, 0.26, 0.022, 0.2, { materialRole: 'frame', layer: 'body' });
      targetBatch.addCylinder(0, monCY * 0.48, -0.2, 0.024, 0.028, monCY, 8, 'y', 'frame', 'body');
      targetBatch.addBox(0, monCY, -0.19, span * 2, 0.032, 0.032, { materialRole: 'frame', layer: 'body' });
      otmBuildMonitorUnit(targetGroup, cfg, targetBatch, -span, monCY, -0.11, monW, monH, yaw, screenMode);
      const rightMode = style === 'security_desk_rig' ? 'security_cctv' : (screenMode === 'off' ? 'off' : 'spreadsheet');
      otmBuildMonitorUnit(targetGroup, cfg, targetBatch, span, monCY, -0.11, monW, monH, -yaw, rightMode);
      if (style === 'security_desk_rig') {
        targetBatch.addCylinder(0, monCY + monH * 0.5 + 0.03, -0.19, 0.02, 0.022, monH * 0.9, 8, 'y', 'frame', 'body');
        otmBuildMonitorUnit(targetGroup, cfg, targetBatch, 0, monCY + monH + 0.03, -0.14, monW * 0.92, monH * 0.85, 0, 'info_display');
      }
    } else {
      const standMat = style === 'all_in_one' ? 'chrome' : 'frame';
      targetBatch.addBox(0, 0.01, -0.12, 0.24, 0.018, 0.18, { materialRole: standMat, layer: 'body' });
      targetBatch.addBox(0, monCY * 0.48, -0.16, 0.045, monCY, 0.024, { materialRole: standMat, layer: 'body', rotXDeg: 10 });
      otmBuildMonitorUnit(targetGroup, cfg, targetBatch, 0, monCY, -0.11, monW, monH, 0, screenMode);
    }
    if (showTower && style !== 'all_in_one') {
      // Position PC tower strictly past the angled right monitor's outer edge
      const rightMonitorOuterX = isMulti ? (span + monW * 0.5 * Math.cos(yaw)) : (monW * 0.5);
      const towerX = rightMonitorOuterX + 0.18;
      otmBuildPcTower(targetBatch, towerX, -0.08, true, true);
    }
    otmBuildKeyboardAndMouse(targetBatch, -0.04, 0.16, false);
  }
}

function otmBuildComputerWorkstation(group, cfg, b, mats, meta) {
  const style = cfg.workstationStyle || 'single_lcd';
  const monW = clamp(cfg.monitorWidth || 0.56, 0.36, 0.92);
  const screenMode = cfg.screenMode || 'desktop_ui';
  const showTower = cfg.includePcTower !== false;

  if (style === 'server_rack') {
    const rw = clamp(cfg.monitorWidth || 0.65, 0.52, 0.88);
    const rh = clamp(cfg.rackHeight || 1.98, 1.1, 2.25);
    const rd = 0.86;
    b.addCasterWheels(0, 0, rw - 0.12, rd - 0.12, 0.03, 'rubber', 'frame');
    b.addBox(0, 0.06 + (rh - 0.06) * 0.5, 0, rw, rh - 0.06, rd, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, rh * 0.52, rd * 0.5 + 0.012, rw * 0.84, rh * 0.88, 0.018, { materialRole: 'glass', layer: 'detail' });
    const units = 8;
    for (let i = 0; i < units; i++) {
      const uy = 0.22 + (i / (units - 1)) * (rh - 0.36);
      b.addBox(0, uy, rd * 0.45, rw * 0.76, 0.11, 0.04, { materialRole: 'darkMetal', layer: 'detail' });
      const statusRole = i % 4 === 1 ? 'signalAmber' : 'signalGreen';
      b.addBox(-rw * 0.28, uy + 0.015, rd * 0.475, 0.03, 0.014, 0.008, { materialRole: statusRole, layer: 'detail' });
      b.addBox(rw * 0.12, uy, rd * 0.475, rw * 0.34, 0.036, 0.006, { materialRole: 'chrome', layer: 'detail' });
    }
    meta.interaction = { interactable: true, actionType: 'inspect_server_rack', rackUnits: 42 };
    return;
  }

  const mountedDeskCfg = otmResolveMountedDeskConfig(cfg, style, monW, showTower);
  if (mountedDeskCfg) {
    ofsBuildOfficeDesk(group, mountedDeskCfg, b, mats, meta);
    const equipGroup = new THREE.Group();
    equipGroup.name = 'DeskMountedComputer';
    const equipBatch = new ObjectBatcher();
    otmBuildComputerEquipment(equipGroup, cfg, equipBatch, mats, meta);
    equipBatch.finalize(equipGroup, mats, { castShadow: true, receiveShadow: true });
    equipGroup.position.set(0, mountedDeskCfg.height, mountedDeskCfg.zOffset || 0);
    group.add(equipGroup);
  } else {
    otmBuildComputerEquipment(group, cfg, b, mats, meta);
  }

  meta.interaction = {
    interactable: true,
    actionType: 'use_computer',
    screenMode,
    deskStyle: mountedDeskCfg ? (cfg.deskStyle || 'none') : 'none'
  };
}

function otmBuildPrinterMachine(group, cfg, b, mats, meta) {
  const type = cfg.machineType || 'commercial_copier';
  const w = clamp(cfg.width || 0.64, 0.24, 1.35);
  const d = clamp(cfg.depth || 0.58, 0.22, 0.78);
  const h = clamp(cfg.height || 1.08, 0.18, 1.35);
  const openRad = degToRad(clamp(cfg.openLidAngle || 0, 0, 55));

  if (type === 'commercial_copier') {
    const baseH = h * 0.84;
    b.addCasterWheels(0, 0, w - 0.12, d - 0.12, 0.025, 'rubber', 'frame');
    b.addChamferBox(0, 0.05 + (baseH - 0.05) * 0.5, 0, w, baseH - 0.05, d, 0.015, { materialRole: 'primary', layer: 'body' });
    // Paper trays on front
    for (let i = 0; i < 3; i++) {
      b.addBox(-w * 0.06, 0.2 + i * 0.15, d * 0.5 + 0.008, w * 0.74, 0.12, 0.016, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(-w * 0.06, 0.2 + i * 0.15, d * 0.5 + 0.02, w * 0.28, 0.018, 0.014, { materialRole: 'frame', layer: 'detail' });
    }
    // Output catch bridge recess + finisher tray on left
    b.addBox(w * 0.5 + 0.1, baseH * 0.72, 0, 0.22, 0.025, d * 0.62, { materialRole: 'darkMetal', layer: 'detail', rotZDeg: 8 });
    b.addBox(w * 0.5 + 0.12, baseH * 0.74, 0, 0.16, 0.018, d * 0.42, { materialRole: 'whiteTrim', layer: 'detail', rotZDeg: 8 });
    // Scanner glass bed + Hinged ADF Lid
    b.addBox(0, baseH + 0.01, 0, w * 0.96, 0.02, d * 0.94, { materialRole: 'glass', layer: 'detail' });
    const lidCY = baseH + 0.055 + Math.sin(openRad) * (d * 0.45);
    const lidCZ = Math.cos(openRad) * 0.02;
    b.addChamferBox(0, lidCY, lidCZ, w * 0.96, 0.075, d * 0.92, 0.012, { materialRole: 'secondary', layer: 'body', rotX: -openRad });
    b.addBox(-w * 0.18, lidCY + 0.055, lidCZ, w * 0.48, 0.055, d * 0.55, { materialRole: 'primary', layer: 'detail', rotX: -openRad });
    // Control UI panel + screen
    b.addChamferBox(w * 0.26, baseH + 0.05, d * 0.5 + 0.05, 0.24, 0.04, 0.12, 0.006, { materialRole: 'darkMetal', layer: 'detail', rotXDeg: 32 });
    objCreateScreenPlane(group, cfg.screenMode || 'info_display', 0.13, 0.07, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: w * 0.22,
      y: baseH + 0.07,
      z: d * 0.5 + 0.05,
      rotX: degToRad(-58)
    });
  } else if (type === 'wide_plotter') {
    const legH = Math.max(0.6, h - 0.24);
    b.addCasterWheels(0, 0, w * 0.88, d * 0.72, 0.026, 'rubber', 'frame');
    b.addBox(-w * 0.44, legH * 0.5 + 0.04, 0, 0.05, legH, 0.06, { materialRole: 'frame', layer: 'body' });
    b.addBox(w * 0.44, legH * 0.5 + 0.04, 0, 0.05, legH, 0.06, { materialRole: 'frame', layer: 'body' });
    b.addBox(0, legH * 0.35, 0, w * 0.88, 0.035, 0.04, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, legH + 0.14, 0, w, 0.24, d * 0.62, 0.02, { materialRole: 'primary', layer: 'body' });
    // Catch basket + hanging architectural blueprint sheet
    b.addBox(0, legH * 0.62, d * 0.24, w * 0.78, 0.02, d * 0.32, { materialRole: 'upholstery', layer: 'detail', rotXDeg: 28 });
    b.addBox(0, legH - 0.04, d * 0.26, w * 0.68, 0.36, 0.008, { materialRole: 'whiteTrim', layer: 'detail', rotXDeg: 10 });
  } else if (type === 'shredder') {
    const sw = clamp(w, 0.28, 0.48);
    const sh = clamp(h, 0.42, 0.76);
    const sd = clamp(d, 0.24, 0.4);
    b.addChamferBox(0, sh * 0.5, 0, sw, sh, sd, 0.014, { materialRole: 'darkMetal', layer: 'body' });
    b.addBox(0, sh * 0.9, 0, sw + 0.01, sh * 0.18, sd + 0.01, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, sh + 0.004, 0.02, sw * 0.72, 0.01, 0.018, { materialRole: 'frame', layer: 'detail' });
    b.addBox(0, sh * 0.45, sd * 0.5 + 0.005, sw * 0.32, sh * 0.36, 0.01, { materialRole: 'glass', layer: 'detail' });
  } else if (type === 'voip_desk_phone') {
    const pw = 0.24;
    const pd = 0.22;
    b.addChamferBox(0, 0.036, 0, pw, 0.06, pd, 0.012, { materialRole: 'darkMetal', layer: 'body', rotXDeg: 18 });
    // Handset cradle on left
    b.addChamferBox(-pw * 0.28, 0.072, 0.01, 0.056, 0.04, pd * 0.94, 0.012, { materialRole: 'frame', layer: 'detail', rotXDeg: 18 });
    // Screen + keypad grid on right
    objCreateScreenPlane(group, 'terminal', 0.1, 0.052, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: pw * 0.18,
      y: 0.088,
      z: -0.028,
      rotX: degToRad(-72)
    });
    b.addBox(pw * 0.18, 0.048, 0.045, 0.095, 0.008, 0.072, { materialRole: 'secondary', layer: 'detail', rotXDeg: 18 });
  } else {
    // desktop_laser_printer or fax_station
    const pw = clamp(w, 0.36, 0.56);
    const ph = clamp(h, 0.22, 0.44);
    const pd = clamp(d, 0.32, 0.48);
    b.addChamferBox(0, ph * 0.5, 0, pw, ph, pd, 0.014, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ph * 0.24, pd * 0.5 + 0.035, pw * 0.72, 0.055, 0.08, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(0, ph * 0.68, pd * 0.5 + 0.03, pw * 0.66, 0.012, 0.075, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addBox(-pw * 0.1, ph + 0.05, -pd * 0.26, pw * 0.62, 0.1, 0.018, { materialRole: 'secondary', layer: 'detail', rotXDeg: -14 });
    b.addBox(-pw * 0.1, ph + 0.06, -pd * 0.22, pw * 0.54, 0.09, 0.006, { materialRole: 'whiteTrim', layer: 'detail', rotXDeg: -14 });
    if (type === 'fax_station') {
      b.addChamferBox(-pw * 0.42, ph * 0.88, 0, 0.056, 0.048, pd * 0.86, 0.01, { materialRole: 'secondary', layer: 'detail' });
    }
  }

  meta.interaction = { interactable: true, actionType: 'use_office_machine', machineType: type };
}

function otmBuildDesktopAccessories(group, cfg, b, mats, meta) {
  const type = cfg.propType || 'desk_organizer_set';

  if (type === 'desk_lamp') {
    b.addCylinder(0, 0.014, 0, 0.088, 0.095, 0.028, 12, 'y', 'primary', 'body');
    b.addPipeSegment(0, 0.028, 0, -0.05, 0.26, -0.06, 0.011, 6, 'chrome', 'body');
    b.addPipeSegment(-0.05, 0.26, -0.06, 0.08, 0.4, 0.04, 0.01, 6, 'chrome', 'body');
    b.addCylinder(0.09, 0.39, 0.045, 0.045, 0.078, 0.085, 10, 'y', 'accent', 'body');
    b.addCylinder(0.09, 0.355, 0.045, 0.036, 0.044, 0.016, 8, 'y', 'lampGlow', 'detail');
  } else if (type === 'desk_fan') {
    b.addCylinder(0, 0.015, 0, 0.095, 0.105, 0.03, 12, 'y', 'frame', 'body');
    b.addCylinder(0, 0.12, -0.02, 0.016, 0.02, 0.19, 8, 'y', 'chrome', 'body');
    b.addCylinder(0, 0.25, -0.03, 0.046, 0.046, 0.09, 8, 'z', 'primary', 'body');
    b.addCylinder(0, 0.25, 0.025, 0.135, 0.135, 0.05, 14, 'z', 'chrome', 'detail');
    b.addCylinder(0, 0.25, 0.025, 0.032, 0.032, 0.055, 8, 'z', 'accent', 'detail');
  } else if (type === 'messy_office_desk_clutter') {
    // Crooked paper piles, binders, twin mugs
    b.addBox(-0.18, 0.025, -0.04, 0.22, 0.048, 0.29, { materialRole: 'whiteTrim', layer: 'detail', rotYDeg: 8 });
    b.addBox(-0.16, 0.062, -0.03, 0.22, 0.028, 0.29, { materialRole: 'whiteTrim', layer: 'detail', rotYDeg: -11 });
    b.addBox(-0.19, 0.086, -0.05, 0.22, 0.022, 0.28, { materialRole: 'warningYellow', layer: 'detail', rotYDeg: 4 });
    b.addBox(0.14, 0.03, 0.06, 0.24, 0.038, 0.18, { materialRole: 'accent', layer: 'detail', rotYDeg: -16 });
    b.addBox(0.15, 0.058, 0.05, 0.23, 0.022, 0.17, { materialRole: 'primary', layer: 'detail', rotYDeg: 14 });
    b.addCylinder(-0.02, 0.052, 0.14, 0.042, 0.04, 0.1, 10, 'y', 'whiteTrim', 'detail');
    b.addCylinder(0.28, 0.052, -0.08, 0.042, 0.04, 0.1, 10, 'y', 'safetyRed', 'detail');
    b.addBox(0.02, 0.008, -0.14, 0.09, 0.012, 0.09, { materialRole: 'warningYellow', layer: 'detail', rotYDeg: 22 });
  } else {
    // Desk organizer tray + pen cup + coffee mug + sticky notes / nameplate
    b.addBox(-0.14, 0.01, -0.04, 0.24, 0.02, 0.3, { materialRole: 'secondary', layer: 'body' });
    b.addBox(-0.14, 0.028, -0.04, 0.21, 0.02, 0.28, { materialRole: 'whiteTrim', layer: 'detail' });
    b.addCylinder(0.12, 0.055, -0.06, 0.038, 0.036, 0.11, 8, 'y', 'primary', 'body');
    b.addCylinder(0.11, 0.125, -0.07, 0.006, 0.006, 0.08, 6, 'y', 'signalAmber', 'detail');
    b.addCylinder(0.13, 0.13, -0.05, 0.006, 0.006, 0.09, 6, 'y', 'accent', 'detail');
    b.addBox(0.05, 0.014, 0.11, 0.085, 0.024, 0.085, { materialRole: 'warningYellow', layer: 'detail', rotYDeg: -8 });
    b.addCylinder(0.22, 0.048, 0.08, 0.042, 0.04, 0.096, 10, 'y', 'accent', 'detail');
    if (cfg.includeNameplate) {
      b.addBox(0.02, 0.032, 0.18, 0.22, 0.055, 0.04, { materialRole: 'wood', layer: 'detail', rotXDeg: -18 });
      objCreateSignPlane(group, cfg.nameplateText || 'Director', 0.19, 0.04, '#c79b42', '#171a1f', {
        x: 0.02,
        y: 0.036,
        z: 0.2,
        rotX: degToRad(-18)
      });
    }
  }

  meta.surfaceRelationship = {
    isSupportSurface: false,
    targetType: 'desk_top',
    attachSurface: 'horizontal_top'
  };
  meta.interaction = { interactable: true, actionType: 'use_desk_prop', propType: type };
}

function otmBuildFuturisticOfficeTech(group, cfg, b, mats, meta) {
  const type = cfg.techType || 'holo_command_desk';
  const w = clamp(cfg.width || 1.8, 0.45, 2.8);
  const h = clamp(cfg.height || 0.96, 0.35, 2.1);

  if (type === 'holo_command_desk') {
    b.addCylinder(0, 0.03, 0, w * 0.44, w * 0.48, 0.06, 12, 'y', 'frame', 'body');
    b.addCylinder(0, h * 0.46, 0, w * 0.24, w * 0.32, h * 0.82, 12, 'y', 'primary', 'body');
    b.addCylinder(0, h - 0.04, 0, w * 0.5, w * 0.46, 0.08, 12, 'y', 'secondary', 'body');
    b.addCylinder(0, h + 0.008, 0, w * 0.43, w * 0.43, 0.014, 12, 'y', 'holoEnergy', 'detail');
    // Holographic projection cityscape
    b.addBox(-0.18, h + 0.18, -0.05, 0.12, 0.32, 0.12, { materialRole: 'holoEnergy', layer: 'detail' });
    b.addBox(0.06, h + 0.24, 0.04, 0.14, 0.44, 0.14, { materialRole: 'holoEnergy', layer: 'detail' });
    b.addBox(0.24, h + 0.14, -0.08, 0.1, 0.24, 0.1, { materialRole: 'holoEnergy', layer: 'detail' });
    objCreateScreenPlane(group, 'futuristic_hud', w * 0.38, 0.26, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: h + 0.28,
      z: w * 0.26,
      rotX: degToRad(-12)
    });
  } else if (type === 'biometric_auth_pedestal') {
    b.addCylinder(0, 0.025, 0, 0.22, 0.24, 0.05, 10, 'y', 'frame', 'body');
    b.addTrapezoidBox(0, h * 0.46, 0, 0.24, 0.22, 0.18, 0.16, h * 0.84, { materialRole: 'primary', layer: 'body' });
    b.addChamferBox(0, h * 0.92, 0.04, 0.26, 0.14, 0.2, 0.014, { materialRole: 'darkMetal', layer: 'body', rotXDeg: 28 });
    objCreateScreenPlane(group, 'futuristic_hud', 0.2, 0.12, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: h * 0.96,
      z: 0.06,
      rotX: degToRad(-62)
    });
  } else if (type === 'transparent_glass_monitor') {
    b.addChamferBox(0, 0.015, 0, w * 0.48, 0.03, 0.2, 0.008, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, h * 0.52, -0.02, w, h * 0.78, 0.014, { materialRole: 'glass', layer: 'body' });
    objCreateScreenPlane(group, 'futuristic_hud', w * 0.92, h * 0.7, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: h * 0.52,
      z: -0.011
    });
  } else {
    // Autonomous office delivery bot or cryo AI core tower
    b.addCasterWheels(0, 0, w * 0.72, w * 0.72, 0.045, 'rubber', 'frame');
    b.addChamferBox(0, h * 0.52, 0, w * 0.78, h * 0.84, w * 0.88, 0.035, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, h * 0.68, w * 0.45, w * 0.58, h * 0.22, 0.02, { materialRole: 'holoEnergy', layer: 'detail' });
    objCreateScreenPlane(group, 'info_display', w * 0.54, h * 0.22, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: h * 0.9,
      z: w * 0.445
    });
  }

  meta.interaction = { interactable: true, actionType: 'use_futuristic_tech', techType: type };
}

function otmBuildLaboratoryEquipment(group, cfg, b, mats, meta) {
  const type = cfg.labType || 'fume_hood_cabinet';
  const w = clamp(cfg.width || 1.55, 0.42, 2.8);
  const d = clamp(cfg.depth || 0.86, 0.34, 1.35);
  const h = clamp(cfg.height || 2.24, 0.38, 2.45);

  if (type === 'fume_hood_cabinet') {
    const fw = clamp(w, 1.15, 2.0);
    const fd = clamp(d, 0.72, 0.98);
    const fh = clamp(h, 1.95, 2.42);
    const benchH = 0.88;
    // Lower acid/solvent storage cabinet
    b.addChamferBox(0, benchH * 0.48, 0, fw, benchH * 0.96, fd, 0.014, { materialRole: 'primary', layer: 'body' });
    b.addBox(-fw * 0.23, benchH * 0.48, fd * 0.5 + 0.01, fw * 0.42, benchH * 0.78, 0.018, { materialRole: 'secondary', layer: 'detail' });
    b.addBox(fw * 0.23, benchH * 0.48, fd * 0.5 + 0.01, fw * 0.42, benchH * 0.78, 0.018, { materialRole: 'secondary', layer: 'detail' });
    // Black epoxy workdeck
    b.addBox(0, benchH + 0.015, 0.02, fw + 0.04, 0.03, fd + 0.04, { materialRole: 'darkMetal', layer: 'body' });
    // Upper containment hood + exhaust stack + glowing interior light
    const hoodH = fh - benchH - 0.14;
    b.addBox(-fw * 0.46, benchH + hoodH * 0.5, 0, 0.1, hoodH, fd, { materialRole: 'primary', layer: 'body' });
    b.addBox(fw * 0.46, benchH + hoodH * 0.5, 0, 0.1, hoodH, fd, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, benchH + hoodH * 0.5, -fd * 0.46, fw, hoodH, 0.08, { materialRole: 'secondary', layer: 'body' });
    b.addBox(0, fh - 0.12, 0, fw + 0.02, 0.24, fd + 0.02, { materialRole: 'primary', layer: 'body' });
    b.addCylinder(0, fh + 0.04, -fd * 0.15, 0.16, 0.18, 0.14, 12, 'y', 'chrome', 'body');
    b.addBox(0, benchH + hoodH * 0.72, fd * 0.44, fw - 0.18, hoodH * 0.54, 0.018, { materialRole: 'glass', layer: 'detail' });
    b.addBox(0, benchH + hoodH - 0.1, 0, fw * 0.68, 0.025, 0.12, { materialRole: 'lampGlow', layer: 'detail' });
    // Glass flasks inside work bay
    b.addCylinder(-fw * 0.18, benchH + 0.1, 0.02, 0.055, 0.02, 0.14, 10, 'y', 'glass', 'detail');
    b.addCylinder(fw * 0.14, benchH + 0.09, -0.02, 0.048, 0.048, 0.12, 10, 'y', 'holoEnergy', 'detail');
    meta.lightSources.push({ id: 'fume_hood_worklight', position: [0, benchH + hoodH * 0.82, 0], color: '#e8f9ff', radius: 2.0 });
  } else if (type === 'wet_lab_island_bench') {
    const bw = clamp(w, 1.5, 2.8);
    const bd = clamp(d, 0.92, 1.35);
    const benchH = 0.9;
    b.addBox(0, benchH * 0.46, 0, bw - 0.1, benchH * 0.92, bd - 0.14, { materialRole: 'primary', layer: 'body' });
    for (let i = 0; i < 3; i++) {
      const dx = -bw * 0.3 + i * (bw * 0.3);
      b.addBox(dx, benchH * 0.46, bd * 0.43, bw * 0.26, benchH * 0.74, 0.02, { materialRole: 'secondary', layer: 'detail' });
      b.addBox(dx, benchH * 0.46, -bd * 0.43, bw * 0.26, benchH * 0.74, 0.02, { materialRole: 'secondary', layer: 'detail' });
    }
    b.addChamferBox(0, benchH - 0.02, 0, bw, 0.045, bd, 0.008, { materialRole: 'darkMetal', layer: 'body' });
    // Center reagent gantry shelf + gooseneck faucet
    const rackH = clamp(h - benchH, 0.36, 0.65);
    b.addBox(-bw * 0.42, benchH + rackH * 0.5, 0, 0.045, rackH, 0.06, { materialRole: 'chrome', layer: 'body' });
    b.addBox(bw * 0.42, benchH + rackH * 0.5, 0, 0.045, rackH, 0.06, { materialRole: 'chrome', layer: 'body' });
    b.addBox(0, benchH + rackH, 0, bw * 0.9, 0.032, 0.28, { materialRole: 'secondary', layer: 'body' });
    b.addPipeSegment(-bw * 0.36, benchH, 0.08, -bw * 0.36, benchH + 0.28, 0.18, 0.014, 8, 'chrome', 'detail');
    b.addBox(-bw * 0.36, benchH + 0.005, 0.22, 0.34, 0.012, 0.26, { materialRole: 'chrome', layer: 'detail' });
    for (let r = 0; r < 4; r++) {
      b.addCylinder(-bw * 0.25 + r * (bw * 0.16), benchH + rackH + 0.09, 0, 0.038, 0.038, 0.14, 10, 'y', r % 2 === 0 ? 'glass' : 'accent', 'detail');
    }
    meta.surfaceRelationship = { isSupportSurface: true, surfaceHeightMeters: benchH };
    meta.snapAnchors.push({ id: 'bench_instrument_spot', position: [0.25, benchH, 0.24], normal: [0, 1, 0] });
  } else if (type === 'microscope_centrifuge_set') {
    const sw = clamp(w, 0.42, 0.72);
    // Compound optical microscope (left)
    b.addChamferBox(-sw * 0.24, 0.025, 0, 0.18, 0.05, 0.24, 0.008, { materialRole: 'whiteTrim', layer: 'body' });
    b.addBox(-sw * 0.24, 0.18, -0.07, 0.055, 0.28, 0.07, { materialRole: 'whiteTrim', layer: 'body', rotXDeg: -10 });
    b.addBox(-sw * 0.24, 0.14, 0.02, 0.12, 0.016, 0.12, { materialRole: 'darkMetal', layer: 'detail' });
    b.addCylinder(-sw * 0.24, 0.24, 0.02, 0.026, 0.032, 0.08, 10, 'y', 'chrome', 'detail');
    b.addPipeSegment(-sw * 0.24, 0.3, -0.02, -sw * 0.24, 0.41, 0.08, 0.016, 8, 'darkMetal', 'detail');
    // Microcentrifuge + test-tube rack (right)
    b.addChamferBox(sw * 0.22, 0.085, 0, 0.22, 0.17, 0.24, 0.016, { materialRole: 'primary', layer: 'body' });
    b.addBox(sw * 0.22, 0.175, -0.01, 0.18, 0.022, 0.18, { materialRole: 'accent', layer: 'detail' });
    b.addBox(0, 0.04, 0.1, 0.18, 0.06, 0.06, { materialRole: 'chrome', layer: 'detail' });
    for (let t = 0; t < 4; t++) {
      b.addCylinder(-0.06 + t * 0.04, 0.085, 0.1, 0.01, 0.01, 0.1, 8, 'y', t % 2 === 0 ? 'holoEnergy' : 'signalGreen', 'detail');
    }
  } else if (type === 'cryo_bio_incubator') {
    const cw = clamp(w, 0.58, 0.95);
    const cd = clamp(d, 0.58, 0.88);
    const ch = clamp(h, 1.45, 2.05);
    b.addBox(0, 0.03, 0, cw * 0.94, 0.06, cd * 0.94, { materialRole: 'frame', layer: 'body' });
    b.addChamferBox(0, ch * 0.5, 0, cw, ch - 0.06, cd, 0.02, { materialRole: 'primary', layer: 'body' });
    b.addBox(0, ch * 0.56, cd * 0.5 + 0.01, cw * 0.68, ch * 0.44, 0.02, { materialRole: 'glass', layer: 'detail' });
    b.addCylinder(0, ch * 0.56, 0, cw * 0.2, cw * 0.2, ch * 0.36, 12, 'y', 'holoEnergy', 'detail');
    objCreateScreenPlane(group, 'info_display', cw * 0.42, 0.16, cfg.emissiveColor || '#4de2ff', cfg.condition, cfg.seed, {
      x: 0,
      y: ch * 0.86,
      z: cd * 0.5 + 0.016
    });
    meta.lightSources.push({ id: 'cryo_chamber_core', position: [0, ch * 0.56, cd * 0.2], color: cfg.emissiveColor || '#4de2ff', radius: 2.2 });
  } else if (type === 'emergency_safety_shower') {
    const sh = clamp(h, 2.05, 2.42);
    b.addCylinder(0, 0.02, 0, 0.14, 0.16, 0.04, 10, 'y', 'warningYellow', 'body');
    b.addCylinder(0, sh * 0.5, -0.06, 0.032, 0.032, sh, 10, 'y', 'warningYellow', 'body');
    b.addCylinder(0, sh - 0.06, 0.08, 0.028, 0.028, 0.34, 8, 'z', 'warningYellow', 'body');
    b.addCylinder(0, sh - 0.16, 0.22, 0.03, 0.14, 0.12, 12, 'y', 'chrome', 'detail');
    b.addCylinder(0, 1.04, 0.16, 0.18, 0.12, 0.08, 12, 'y', 'signalGreen', 'detail');
    b.addBox(0.18, sh - 0.48, -0.04, 0.08, 0.24, 0.02, { materialRole: 'safetyRed', layer: 'detail' });
    objCreateSignPlane(group, 'Safety Shower', 0.32, 0.14, '#24754a', '#ffffff', {
      x: 0,
      y: sh * 0.72,
      z: -0.015
    });
  } else {
    // autoclave_sterilizer
    const aw = clamp(w, 0.52, 0.85);
    const ad = clamp(d, 0.56, 0.84);
    const ah = clamp(h, 0.48, 1.38);
    b.addChamferBox(0, ah * 0.5, 0, aw, ah, ad, 0.02, { materialRole: 'secondary', layer: 'body' });
    b.addCylinder(0, ah * 0.58, ad * 0.5 + 0.025, aw * 0.3, aw * 0.32, 0.05, 14, 'z', 'chrome', 'detail');
    b.addCylinder(0, ah * 0.58, ad * 0.5 + 0.058, aw * 0.14, aw * 0.14, 0.03, 10, 'z', 'darkMetal', 'detail');
    objCreateScreenPlane(group, 'info_display', aw * 0.38, 0.1, cfg.emissiveColor || '#3be882', cfg.condition, cfg.seed, {
      x: -aw * 0.2,
      y: ah * 0.88,
      z: ad * 0.5 + 0.016
    });
  }

  meta.interaction = { interactable: true, actionType: 'use_lab_equipment', labType: type };
}

export function registerOfficeTechAndMachinesFamilies() {
  registerObjectFamily({
    id: 'computer_workstation',
    categoryId: 'office_public_interiors',
    subcategory: 'Computers & Technology',
    subcategories: ['Computers & Technology'],
    label: 'Computers, Monitors & Server Racks',
    description: 'Single/dual Lcd workstations, laptop docks, retro 90s Crt computers, and 42U floor server racks.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed', 'ground_standing'],
    locationContext: 'interior',
    environmentTags: ['office', 'coworking', 'security', 'utility_room', 'library', 'laboratory', 'clinic'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'functional',
    surfaceRelationship: { targetType: 'desk_top', attachSurface: 'horizontal_top' },
    tags: ['computer', 'monitor', 'laptop', 'crt', 'server_rack', 'pc', 'workstation'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Workstation Format' },
      {
        key: 'workstationStyle',
        name: 'System Style',
        type: 'select',
        options: [
          ['single_lcd', 'Single Lcd & Tower'],
          ['dual_monitor', 'Dual-Monitor Engineering Rig'],
          ['laptop_dock', 'Laptop & External Dock'],
          ['retro_crt', 'Retro 90s Crt & Desktop Pc'],
          ['all_in_one', 'Slim All-In-One Display'],
          ['security_desk_rig', 'Triple-Monitor Security Array'],
          ['server_rack', 'Floor-Standing 42U Server Rack']
        ],
        default: 'single_lcd'
      },
      {
        key: 'deskStyle',
        name: 'Mounted Desk Style',
        type: 'select',
        options: [
          ['none', 'Standalone (No Desk Mounted)'],
          ['rectangular', 'Standard Office Desk'],
          ['executive_solid', 'Large Executive Desk'],
          ['l_shaped', 'L-Shaped Corner Desk'],
          ['u_shaped', 'U-Shaped Executive Suite'],
          ['standing_adjustable', 'Height-Adjustable Standing Desk'],
          ['budget_government', 'Budget Metal Government Desk'],
          ['drafting_table', 'Architect Drafting Table'],
          ['compact_hutch', 'Small Writing & Hutch Desk']
        ],
        default: 'none'
      },
      { key: 'monitorWidth', name: 'Display / Rack Width', type: 'number', min: 0.36, max: 0.92, step: 0.02, unit: 'm', default: 0.56 },
      { key: 'monitorHeight', name: 'Display Height', type: 'number', min: 0.24, max: 0.52, step: 0.02, unit: 'm', default: 0.34 },
      { key: 'rackHeight', name: 'Server Rack Height', type: 'number', min: 1.1, max: 2.25, step: 0.05, unit: 'm', default: 1.98 },
      { group: 'Display & Peripherals' },
      {
        key: 'screenMode',
        name: 'Active Screen State',
        type: 'select',
        options: [
          ['desktop_ui', 'Desktop Workspace'],
          ['spreadsheet', 'Spreadsheet Chart'],
          ['document', 'Word Document'],
          ['terminal', 'Green Code Terminal'],
          ['login', 'Corporate Login'],
          ['security_cctv', 'Security Cctv Grid'],
          ['info_display', 'Lobby Queue Status'],
          ['error_screen', 'Blue Error Screen'],
          ['futuristic_hud', 'Futuristic Hud'],
          ['off', 'Powered Off']
        ],
        default: 'desktop_ui'
      },
      { key: 'includePcTower', name: 'Include Desktop Tower', type: 'boolean', default: true },
      { key: 'dockExternalDisplay', name: 'Add Side Monitor (Laptop)', type: 'boolean', default: true }
    ],
    presets: [
      {
        id: 'modern_single_lcd_pc',
        label: 'Standard Corporate Lcd Workstation',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#23282e',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#363d45',
        accentColor: '#3992d6',
        frameColor: '#1b1f24',
        params: { workstationStyle: 'single_lcd', screenMode: 'desktop_ui', includePcTower: true }
      },
      {
        id: 'dual_monitor_developer_rig',
        label: 'Dual-Monitor Engineering Setup',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#20252b',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#98a3ad',
        accentColor: '#29bf8d',
        frameColor: '#181c21',
        params: { workstationStyle: 'dual_monitor', monitorWidth: 0.54, screenMode: 'terminal', includePcTower: true }
      },
      {
        id: 'executive_laptop_dock',
        label: 'Laptop & External Monitor Dock',
        paletteFamily: 'contemporary_tech',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c8d0d8',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#2b3138',
        accentColor: '#489fe6',
        frameColor: '#23282e',
        params: { workstationStyle: 'laptop_dock', screenMode: 'document', dockExternalDisplay: true }
      },
      {
        id: 'retro_90s_beige_crt',
        label: 'Retro 1990s Beige Crt Computer',
        paletteFamily: 'retro_90s_office',
        condition: 'lightly_worn',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#d1cab8',
        secondaryMaterial: 'office_plastic_beige',
        secondaryColor: '#c4bca8',
        accentColor: '#5c6670',
        frameColor: '#a69e8b',
        params: { workstationStyle: 'retro_crt', screenMode: 'spreadsheet', includePcTower: true, emissiveColor: '#48eb91' }
      },
      {
        id: 'slim_all_in_one_station',
        label: 'Slim All-In-One Creative Mac',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#d6dde4',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#aeb7c0',
        accentColor: '#45a3e5',
        frameColor: '#252a30',
        params: { workstationStyle: 'all_in_one', monitorWidth: 0.64, monitorHeight: 0.4, screenMode: 'desktop_ui' }
      },
      {
        id: 'triple_security_cctv_console',
        label: 'Security Guard Triple-Monitor Rig',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#1d2228',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#36404a',
        accentColor: '#38e394',
        frameColor: '#161a1f',
        params: { workstationStyle: 'security_desk_rig', screenMode: 'security_cctv', includePcTower: true }
      },
      {
        id: 'telecom_42u_server_rack',
        label: 'Server Rack Cabinet (42U)',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'industrial_loft_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#24292e',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#181c20',
        accentColor: '#3ad47f',
        frameColor: '#14181c',
        params: { workstationStyle: 'server_rack', deskStyle: 'none', monitorWidth: 0.68, rackHeight: 1.98 }
      },
      {
        id: 'pc_on_standard_desk',
        label: 'Workstation On Standard Desk',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#d5cdc0',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#b9b2a7',
        accentColor: '#3992d6',
        frameColor: '#23282e',
        params: { workstationStyle: 'single_lcd', deskStyle: 'rectangular', screenMode: 'desktop_ui', includePcTower: true }
      },
      {
        id: 'pc_on_executive_desk',
        label: 'Dual-Monitor On Executive Desk',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#59331f',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#4a2919',
        accentColor: '#c79b42',
        frameColor: '#20252b',
        params: { workstationStyle: 'dual_monitor', deskStyle: 'executive_solid', monitorWidth: 0.54, screenMode: 'spreadsheet', includePcTower: true }
      },
      {
        id: 'pc_on_l_shaped_desk',
        label: 'Corner Rig On L-Shaped Desk',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'light_office_wood',
        primaryColor: '#bd9266',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#e0d9ce',
        accentColor: '#29bf8d',
        frameColor: '#21262c',
        params: { workstationStyle: 'dual_monitor', deskStyle: 'l_shaped', monitorWidth: 0.54, screenMode: 'terminal', includePcTower: true }
      },
      {
        id: 'pc_on_u_shaped_desk',
        label: 'Executive Rig On U-Shaped Suite',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#693c23',
        secondaryMaterial: 'dark_executive_wood',
        secondaryColor: '#542f1b',
        accentColor: '#489fe6',
        frameColor: '#252a30',
        params: { workstationStyle: 'laptop_dock', deskStyle: 'u_shaped', screenMode: 'document', dockExternalDisplay: true }
      },
      {
        id: 'pc_on_standing_desk',
        label: 'Developer Rig On Standing Desk',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#eef1f5',
        secondaryMaterial: 'laminate_desktop',
        secondaryColor: '#d9dfe6',
        accentColor: '#3694db',
        frameColor: '#1f242a',
        params: { workstationStyle: 'dual_monitor', deskStyle: 'standing_adjustable', monitorWidth: 0.56, screenMode: 'terminal', includePcTower: true }
      },
      {
        id: 'pc_on_government_desk',
        label: 'Retro Crt On Government Desk',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#c9c4b8',
        secondaryMaterial: 'office_plastic_beige',
        secondaryColor: '#c7bfa8',
        accentColor: '#5c6670',
        frameColor: '#454c54',
        params: { workstationStyle: 'retro_crt', deskStyle: 'budget_government', screenMode: 'spreadsheet', includePcTower: true, emissiveColor: '#48eb91' }
      },
      {
        id: 'security_rig_on_desk',
        label: 'Security Triple-Rig On Desk',
        attachmentProfile: 'ground_standing',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#d2cabf',
        secondaryMaterial: 'painted_steel',
        secondaryColor: '#434c56',
        accentColor: '#38e394',
        frameColor: '#1a1f24',
        params: { workstationStyle: 'security_desk_rig', deskStyle: 'rectangular', screenMode: 'security_cctv', includePcTower: true }
      }
    ],
    buildGeometry: otmBuildComputerWorkstation
  });

  registerObjectFamily({
    id: 'printer_office_machine',
    categoryId: 'office_public_interiors',
    subcategory: 'Printers & Office Machines',
    subcategories: ['Printers & Office Machines'],
    label: 'Printers, Copiers & Office Machines',
    description: 'Commercial multifunction copiers, tabletop printers, plotters, shredders, and Voip phones.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    locationContext: 'interior',
    environmentTags: ['office', 'utility_room', 'reception', 'municipal', 'library'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'small',
    functionalRole: 'functional',
    tags: ['printer', 'copier', 'scanner', 'plotter', 'shredder', 'fax', 'phone'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Machine Profile' },
      {
        key: 'machineType',
        name: 'Machine Type',
        type: 'select',
        options: [
          ['commercial_copier', 'Commercial Floor Copier'],
          ['desktop_laser_printer', 'Tabletop Laser Printer'],
          ['wide_plotter', 'Wide-Format Plotter'],
          ['shredder', 'Office Paper Shredder'],
          ['fax_station', 'Office Fax Machine'],
          ['voip_desk_phone', 'Voip Business Desk Phone']
        ],
        default: 'commercial_copier'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.24, max: 1.35, step: 0.04, unit: 'm', default: 0.64 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.22, max: 0.78, step: 0.04, unit: 'm', default: 0.58 },
      { key: 'height', name: 'Height', type: 'number', min: 0.18, max: 1.35, step: 0.04, unit: 'm', default: 1.08 },
      { group: 'Scanner & Ui' },
      { key: 'openLidAngle', name: 'Scanner Lid Tilt', type: 'number', min: 0, max: 55, step: 5, unit: 'deg', default: 0 },
      {
        key: 'screenMode',
        name: 'Touchscreen Display',
        type: 'select',
        options: [
          ['info_display', 'Copy Status Ui'],
          ['error_screen', 'Paper Jam Alert'],
          ['off', 'Sleep Mode']
        ],
        default: 'info_display'
      }
    ],
    presets: [
      {
        id: 'commercial_multifunction_copier',
        label: 'Multifunction Commercial Copier',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#d9dde2',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#3c454f',
        accentColor: '#3782c4',
        frameColor: '#24292e',
        params: { machineType: 'commercial_copier', width: 0.68, depth: 0.62, height: 1.1 }
      },
      {
        id: 'open_lid_copy_station',
        label: 'Copier With Open Adf Scanner',
        paletteFamily: 'budget_office',
        condition: 'lightly_worn',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#cfd3d8',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#48515c',
        accentColor: '#e08b36',
        frameColor: '#2a3036',
        params: { machineType: 'commercial_copier', openLidAngle: 35, screenMode: 'error_screen' }
      },
      {
        id: 'desktop_laser_printer',
        label: 'Desktop Workgroup Laser Printer',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#e4e7eb',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#363d45',
        accentColor: '#3684c9',
        frameColor: '#252a30',
        params: { machineType: 'desktop_laser_printer', width: 0.44, depth: 0.4, height: 0.3 }
      },
      {
        id: 'architect_wide_plotter',
        label: 'Architectural Blueprint Plotter',
        paletteFamily: 'industrial_loft_office',
        condition: 'clean',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#cbd2d9',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#2d343b',
        accentColor: '#3e8acc',
        frameColor: '#23282e',
        params: { machineType: 'wide_plotter', width: 1.25, depth: 0.62, height: 1.08 }
      },
      {
        id: 'office_paper_shredder',
        label: 'Cross-Cut Office Shredder',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#2a3036',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#76828f',
        accentColor: '#40a868',
        frameColor: '#1f2328',
        params: { machineType: 'shredder', width: 0.38, depth: 0.28, height: 0.64 }
      },
      {
        id: 'retro_office_fax_machine',
        label: '90s Thermal Fax & Handset',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'retro_90s_office',
        condition: 'lightly_worn',
        primaryMaterial: 'office_plastic_beige',
        primaryColor: '#cbc4b2',
        secondaryMaterial: 'office_plastic_beige',
        secondaryColor: '#9e9788',
        accentColor: '#487099',
        frameColor: '#666055',
        params: { machineType: 'fax_station', width: 0.42, depth: 0.36, height: 0.24 }
      },
      {
        id: 'voip_enterprise_desk_phone',
        label: 'Voip Conference Desk Phone',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'modern_corporate',
        condition: 'new',
        primaryMaterial: 'office_plastic_black',
        primaryColor: '#23272c',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#99a3ad',
        accentColor: '#3aa8e6',
        frameColor: '#181c20',
        params: { machineType: 'voip_desk_phone', width: 0.24, depth: 0.22, height: 0.18 }
      }
    ],
    buildGeometry: otmBuildPrinterMachine
  });

  registerObjectFamily({
    id: 'desktop_accessories',
    categoryId: 'office_public_interiors',
    subcategory: 'Desktop Accessories',
    subcategories: ['Desktop Accessories'],
    label: 'Desktop Organizers, Lamps & Clutter',
    description: 'Tabletop accessories meant to snap directly onto desks, counters, and conference tables.',
    attachmentProfile: 'surface_placed',
    supportedAttachments: ['surface_placed'],
    locationContext: 'interior',
    environmentTags: ['office', 'coworking', 'reception', 'library', 'residential_interior'],
    architecturalStyle: 'modern_corporate',
    sizeClass: 'tiny',
    functionalRole: 'clutter',
    surfaceRelationship: { targetType: 'desk_top', attachSurface: 'horizontal_top' },
    tags: ['desktop', 'lamp', 'mug', 'clutter', 'organizer', 'fan', 'nameplate'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Desktop Prop Type' },
      {
        key: 'propType',
        name: 'Accessory Set',
        type: 'select',
        options: [
          ['desk_organizer_set', 'Organizer Tray, Mug & Pen Cup'],
          ['desk_lamp', 'Swing-Arm Desk Lamp'],
          ['desk_fan', 'Oscillating Desk Fan'],
          ['messy_office_desk_clutter', 'Messy Paper Stacks & Mugs']
        ],
        default: 'desk_organizer_set'
      },
      { key: 'includeNameplate', name: 'Add Engraved Nameplate', type: 'boolean', default: false },
      { key: 'nameplateText', name: 'Nameplate Label', type: 'text', maxLength: 20, default: 'Director' }
    ],
    presets: [
      {
        id: 'tidy_desk_organizer_kit',
        label: 'Tidy Inbox Tray & Coffee Mug',
        paletteFamily: 'modern_corporate',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#3a4652',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#293038',
        accentColor: '#d98932',
        frameColor: '#23282e',
        params: { propType: 'desk_organizer_set', includeNameplate: false }
      },
      {
        id: 'executive_nameplate_kit',
        label: 'Executive Brass Nameplate & Tray',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'dark_executive_wood',
        primaryColor: '#5c341f',
        secondaryMaterial: 'faux_leather',
        secondaryColor: '#36261d',
        accentColor: '#c4963c',
        frameColor: '#2c231c',
        params: { propType: 'desk_organizer_set', includeNameplate: true, nameplateText: 'Director' }
      },
      {
        id: 'architect_swing_desk_lamp',
        label: 'Articulated Swing-Arm Desk Lamp',
        paletteFamily: 'industrial_loft_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#2f3842',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#c4cdd6',
        accentColor: '#d96b30',
        frameColor: '#23282e',
        params: { propType: 'desk_lamp' }
      },
      {
        id: 'bankers_green_desk_lamp',
        label: 'Classic Bankers Brass Desk Lamp',
        paletteFamily: 'classic_executive',
        condition: 'clean',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#c99b3b',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#c99b3b',
        accentColor: '#23784d',
        frameColor: '#8c6922',
        params: { propType: 'desk_lamp' }
      },
      {
        id: 'oscillating_tabletop_fan',
        label: 'Retro Wire Desk Fan',
        paletteFamily: 'retro_80s_office',
        condition: 'lightly_worn',
        primaryMaterial: 'painted_steel',
        primaryColor: '#6d827a',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#b8c2cc',
        accentColor: '#c9883a',
        frameColor: '#364045',
        params: { propType: 'desk_fan' }
      },
      {
        id: 'messy_office_desk_clutter',
        label: 'Overloaded Paper Clutter Pile',
        paletteFamily: 'neglected_office',
        condition: 'lightly_worn',
        primaryMaterial: 'laminate_desktop',
        primaryColor: '#4b6580',
        secondaryMaterial: 'office_plastic_beige',
        secondaryColor: '#c9c2b2',
        accentColor: '#d97836',
        frameColor: '#363d45',
        params: { propType: 'messy_office_desk_clutter' }
      }
    ],
    buildGeometry: otmBuildDesktopAccessories
  });

  registerObjectFamily({
    id: 'futuristic_office_tech',
    categoryId: 'office_public_interiors',
    subcategory: 'Futuristic & Superhero Office Technology',
    subcategories: ['Futuristic & Superhero Office Technology', 'Computers & Technology'],
    label: 'Futuristic & Ops Center Tech',
    description: 'Holographic command tables, biometric scanner kiosks, glass monitors, and autonomous mail bots.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed'],
    locationContext: 'interior',
    environmentTags: ['office', 'security', 'commercial', 'lobby', 'laboratory'],
    architecturalStyle: 'futuristic_ops',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['futuristic', 'hologram', 'biometric', 'robot', 'superhero', 'hud'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Tech Configuration' },
      {
        key: 'techType',
        name: 'System Class',
        type: 'select',
        options: [
          ['holo_command_desk', 'Holographic Briefing Table'],
          ['biometric_auth_pedestal', 'Biometric Access Column'],
          ['transparent_glass_monitor', 'Transparent Glass Terminal'],
          ['autonomous_mail_cart', 'Autonomous Office Courier Bot']
        ],
        default: 'holo_command_desk'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.45, max: 2.8, step: 0.05, unit: 'm', default: 1.8 },
      { key: 'height', name: 'Height', type: 'number', min: 0.35, max: 2.1, step: 0.05, unit: 'm', default: 0.96 }
    ],
    presets: [
      {
        id: 'hero_holo_briefing_table',
        label: 'Holographic City Command Table',
        paletteFamily: 'futuristic_ops_center',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#263442',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#cfd9e3',
        accentColor: '#36c9ff',
        frameColor: '#161f29',
        emissiveColor: '#4ae3ff',
        params: { techType: 'holo_command_desk', width: 1.9, height: 0.94 }
      },
      {
        id: 'biometric_security_pedestal',
        label: 'Biometric Palm Scanner Pedestal',
        paletteFamily: 'futuristic_ops_center',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#293542',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#dce4ec',
        accentColor: '#2ee699',
        frameColor: '#192129',
        emissiveColor: '#3ef0b4',
        params: { techType: 'biometric_auth_pedestal', width: 0.5, height: 1.15 }
      },
      {
        id: 'transparent_hud_glass_display',
        label: 'Transparent Glass Ops Monitor',
        attachmentProfile: 'surface_placed',
        paletteFamily: 'futuristic_ops_center',
        condition: 'new',
        primaryMaterial: 'chrome_metal',
        primaryColor: '#d0d9e3',
        secondaryMaterial: 'glass',
        secondaryColor: '#66b5d9',
        accentColor: '#48d6ff',
        frameColor: '#26323d',
        emissiveColor: '#54e0ff',
        params: { techType: 'transparent_glass_monitor', width: 0.72, height: 0.48 }
      },
      {
        id: 'autonomous_office_mail_bot',
        label: 'Autonomous Mail Delivery Bot',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#e4eaf0',
        secondaryMaterial: 'office_plastic_black',
        secondaryColor: '#2e3842',
        accentColor: '#33b8ff',
        frameColor: '#1e252c',
        emissiveColor: '#38c7ff',
        params: { techType: 'autonomous_mail_cart', width: 0.62, height: 0.96 }
      },
      {
        id: 'amber_crisis_command_table',
        label: 'Crisis Response Holo Console',
        paletteFamily: 'futuristic_ops_center',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#252930',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#47525e',
        accentColor: '#ff9636',
        frameColor: '#171b21',
        emissiveColor: '#ffa142',
        params: { techType: 'holo_command_desk', width: 2.2, height: 0.96 }
      }
    ],
    buildGeometry: otmBuildFuturisticOfficeTech
  });

  registerObjectFamily({
    id: 'laboratory_science_equipment',
    categoryId: 'office_public_interiors',
    categories: ['office_public_interiors', '24_labs_research', '23_clinics_waiting'],
    subcategory: 'Futuristic & Superhero Office Technology',
    subcategories: [
      'Futuristic & Superhero Office Technology',
      'Computers & Technology',
      'Medical Office & Professional Waiting Areas',
      'Wet Labs & Fume Hoods',
      'Scientific Analyzers & Glassware',
      'Cleanroom & Safety Stations'
    ],
    label: 'Laboratory Benches, Fume Hoods & Analyzers',
    description: 'Chemical fume hoods, wet-lab epoxy island benches, microscope & centrifuge stations, cryo incubators, safety showers, and autoclaves.',
    attachmentProfile: 'ground_standing',
    supportedAttachments: ['ground_standing', 'surface_placed', 'wall_mounted'],
    locationContext: 'interior',
    environmentTags: ['laboratory', 'medical', 'clinic', 'office', 'industrial_interior'],
    architecturalStyle: 'clean_medical',
    sizeClass: 'medium',
    functionalRole: 'functional',
    tags: ['laboratory', 'science', 'fume_hood', 'microscope', 'centrifuge', 'cryo', 'eyewash', 'autoclave'],
    materialSlots: ['primary', 'secondary', 'accent', 'frame'],
    schema: [
      { group: 'Laboratory Equipment' },
      {
        key: 'labType',
        name: 'Lab Unit',
        type: 'select',
        options: [
          ['fume_hood_cabinet', 'Chemical Biosafety Fume Hood'],
          ['wet_lab_island_bench', 'Wet-Lab Reagent Island Bench'],
          ['microscope_centrifuge_set', 'Microscope & Centrifuge Kit'],
          ['cryo_bio_incubator', 'Cryo Specimen Bio-Incubator'],
          ['emergency_safety_shower', 'Emergency Shower & Eyewash'],
          ['autoclave_sterilizer', 'Steam Autoclave Sterilizer']
        ],
        default: 'fume_hood_cabinet'
      },
      { key: 'width', name: 'Width', type: 'number', min: 0.42, max: 2.8, step: 0.04, unit: 'm', default: 1.55 },
      { key: 'depth', name: 'Depth', type: 'number', min: 0.34, max: 1.35, step: 0.04, unit: 'm', default: 0.86 },
      { key: 'height', name: 'Height', type: 'number', min: 0.38, max: 2.45, step: 0.04, unit: 'm', default: 2.24 }
    ],
    presets: [
      {
        id: 'lab_chemical_fume_hood',
        label: 'Chemical Biosafety Fume Hood',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'new',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e4e9ee',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#cfd7df',
        accentColor: '#3692c9',
        frameColor: '#252c33',
        emissiveColor: '#54e0ff',
        params: { labType: 'fume_hood_cabinet', width: 1.56, depth: 0.86, height: 2.24 }
      },
      {
        id: 'wet_lab_epoxy_island_bench',
        label: 'Wet-Lab Reagent Island Bench',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#dce3ea',
        secondaryMaterial: 'painted_aluminum',
        secondaryColor: '#b9c3cc',
        accentColor: '#2f82b8',
        frameColor: '#20262b',
        params: { labType: 'wet_lab_island_bench', width: 2.2, depth: 1.15, height: 1.38 }
      },
      {
        id: 'tabletop_microscope_centrifuge_kit',
        label: 'Microscope, Centrifuge & Test Tubes',
        attachmentProfile: 'surface_placed',
        subcategory: 'Computers & Technology',
        paletteFamily: 'contemporary_tech',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#cfd8e0',
        secondaryMaterial: 'office_plastic_beige',
        secondaryColor: '#eef2f5',
        accentColor: '#29b88a',
        frameColor: '#22282e',
        emissiveColor: '#36e3b0',
        params: { labType: 'microscope_centrifuge_set', width: 0.56, depth: 0.38, height: 0.44 }
      },
      {
        id: 'cryo_specimen_incubator_chamber',
        label: 'Cryo Specimen & Bio-Incubator',
        subcategory: 'Futuristic & Superhero Office Technology',
        paletteFamily: 'futuristic_ops_center',
        condition: 'new',
        primaryMaterial: 'painted_aluminum',
        primaryColor: '#dce4ec',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#b9c4cf',
        accentColor: '#3ec7ff',
        frameColor: '#1d2630',
        emissiveColor: '#4ee6ff',
        params: { labType: 'cryo_bio_incubator', width: 0.74, depth: 0.72, height: 1.88 }
      },
      {
        id: 'lab_emergency_eyewash_shower',
        label: 'Emergency Safety Shower & Eyewash',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'municipal_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e8b228',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#cfd7e0',
        accentColor: '#2fb869',
        frameColor: '#252a30',
        params: { labType: 'emergency_safety_shower', width: 0.62, depth: 0.56, height: 2.28 }
      },
      {
        id: 'clinical_steam_autoclave_unit',
        label: 'Medical Steam Autoclave Sterilizer',
        subcategory: 'Medical Office & Professional Waiting Areas',
        paletteFamily: 'clean_medical_office',
        condition: 'clean',
        primaryMaterial: 'painted_steel',
        primaryColor: '#e2e8ee',
        secondaryMaterial: 'chrome_metal',
        secondaryColor: '#bcc5ce',
        accentColor: '#36b87a',
        frameColor: '#2a3036',
        emissiveColor: '#3be882',
        params: { labType: 'autoclave_sterilizer', width: 0.64, depth: 0.68, height: 1.26 }
      }
    ],
    buildGeometry: otmBuildLaboratoryEquipment
  });
}
