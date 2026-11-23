import { clamp, colorHex, lerp } from '../utils.js';

function trDetailMakeNumberPlate(parent, text, w, h, x, y, z, rotY = 0, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  const bg = colorHex(options.bgHex, '#181e26');
  const fg = colorHex(options.fgHex, '#f4f7fb');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 80);
    ctx.strokeStyle = colorHex(options.borderHex, fg);
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 72);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = String(text || 'B-4012').slice(0, 18);
    let fontSize = 36;
    ctx.font = `bold ${fontSize}px Arial`;
    while (fontSize > 16 && ctx.measureText(label).width > 228) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial`;
    }
    ctx.fillText(label, 128, 42);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = options.lit
    ? new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff', emissive: bg, emissiveIntensity: 0.45 })
    : new THREE.MeshLambertMaterial({ map: tex, color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.018), mat);
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

export function buildRailDetails(batcher, rootGroup, layout, cfg) {
  const d = layout.dimensions;
  const rz = layout.rail;
  const deckY = rz.zones.deckY;
  const halfW = d.halfWidth;
  const halfL = d.length * 0.5;
  const bf = cfg.bodyFamily;
  const unitNum = String(cfg.railUnitNumber || cfg.signText || 'B-4012').slice(0, 16);
  const routeBullet = String(cfg.railRouteBullet || '').slice(0, 6);

  if (rz.unitType === 'locomotive') {
    const loco = rz.zones.loco;
    const isRearCab = loco ? loco.cabPosition === 'rear' : false;
    const frontEndZ = halfL;
    const rearEndZ = -halfL;

    if (loco) {
      // Headlight & pilot ditch lights on front
      const headBaseY = loco.shortNose ? loco.shortNoseRoofY - 0.25 : deckY + 1.45;
      const headBaseZ = loco.shortNose ? loco.shortNose.endZ + 0.025 : (loco.longHood ? loco.longHood.endZ + 0.025 : frontEndZ - 0.4);
      batcher.addBox(0, headBaseY, headBaseZ, 0.38, 0.2, 0.05, { materialRole: 'chassisDark', layer: 'detail' });
      for (const hx of [-0.09, 0.09]) {
        batcher.addCylinder(hx, headBaseY, headBaseZ + 0.025, 0.068, 0.068, 0.03, 10, 'z', 'headlight', 'detail');
      }
      // Lower front pilot ditch lights
      for (const side of [-1, 1]) {
        batcher.addBox(side * 0.68, deckY + 0.08, frontEndZ - 0.14, 0.14, 0.14, 0.12, { materialRole: 'chassisDark', layer: 'detail' });
        batcher.addCylinder(side * 0.68, deckY + 0.08, frontEndZ - 0.075, 0.052, 0.052, 0.025, 8, 'z', 'headlight', 'detail');
      }

      // Rear headlight & red marker lamps
      const rearHoodZ = loco.longHood && !isRearCab ? loco.longHood.startZ - 0.02 : (loco.cab ? loco.cab.startZ - 0.02 : rearEndZ + 0.4);
      batcher.addBox(0, loco.longHoodRoofY - 0.28, rearHoodZ, 0.34, 0.18, 0.05, { materialRole: 'chassisDark', layer: 'detail' });
      batcher.addCylinder(0, loco.longHoodRoofY - 0.28, rearHoodZ - 0.025, 0.065, 0.065, 0.03, 10, 'z', 'headlight', 'detail');
      for (const side of [-1, 1]) {
        batcher.addCylinder(side * 0.72, deckY + 0.14, rearEndZ + 0.02, 0.052, 0.052, 0.03, 8, 'z', 'taillight', 'detail');
      }

      // Cab roof 3-chime air horn & optional warning beacon
      if (loco.cab) {
        const cabMidZ = (loco.cab.startZ + loco.cab.endZ) * 0.5;
        const cabTopY = loco.cabRoofY;
        for (let h = -1; h <= 1; h++) {
          batcher.addCylinder(h * 0.085, cabTopY + 0.08, cabMidZ - 0.32, 0.038, 0.024, 0.26, 8, 'z', 'utility', 'detail');
        }
        if (cfg.lightBar && cfg.lightBar !== 'none') {
          batcher.addCylinder(0, cabTopY + 0.08, cabMidZ + 0.36, 0.11, 0.12, 0.15, 10, 'y', 'amberLight', 'detail');
        }

        // Cab side number boards (both sides) + illuminated brow number board
        for (const side of [-1, 1]) {
          trDetailMakeNumberPlate(rootGroup, unitNum, 0.92, 0.24, side * (halfW * 0.96 + 0.024), deckY + 0.95, cabMidZ, side * Math.PI * 0.5, {
            bgHex: cfg.bodySecondaryColor || '#1f2731',
            fgHex: cfg.liveryStripeColor || '#eab02e',
            lit: false
          });
        }
        trDetailMakeNumberPlate(rootGroup, unitNum, 0.74, 0.18, 0, cabTopY - 0.22, loco.cab.endZ + 0.025, 0, {
          bgHex: '#151a22',
          fgHex: '#f8fafc',
          lit: Boolean(cfg.headlightsLit)
        });
      }
    } else if (bf === 'rail_electric_loco') {
      const topY = rz.zones.bodyTopY;
      for (const endSign of [-1, 1]) {
        const zFace = endSign * (halfL - 0.12);
        const role = endSign > 0 ? 'headlight' : 'taillight';
        for (const sx of [-0.62, 0.62]) {
          batcher.addCylinder(sx, deckY + 0.56, zFace + endSign * 0.05, 0.08, 0.08, 0.04, 10, 'z', role, 'detail');
        }
        batcher.addCylinder(0, topY - 0.32, zFace - endSign * 0.22, 0.075, 0.075, 0.04, 10, 'z', 'headlight', 'detail');
      }
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.08, 0.24, side * (halfW + 0.026), deckY + 0.56, 0, side * Math.PI * 0.5, {
          bgHex: cfg.bodySecondaryColor || '#1e2736',
          fgHex: '#f8fafc',
          borderHex: cfg.liveryStripeColor || '#eab02e',
          lit: false
        });
      }
    } else if (bf === 'rail_streamlined_diesel') {
      const topY = rz.zones.bodyTopY;
      // Stacked bulldog nose cyclops & lower Gyralite headlamps + rear red markers
      for (const hy of [deckY + 0.92, deckY + 1.24]) {
        batcher.addCylinder(0, hy, frontEndZ - 0.14, 0.105, 0.105, 0.06, 12, 'z', 'headlight', 'detail');
      }
      batcher.addCylinder(0, topY - 0.24, frontEndZ - 1.5, 0.085, 0.085, 0.06, 10, 'z', 'headlight', 'detail');
      for (const sx of [-0.68, 0.68]) {
        batcher.addCylinder(sx, deckY + 0.48, rearEndZ + 0.04, 0.06, 0.06, 0.04, 8, 'z', 'taillight', 'detail');
      }
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.15, 0.25, side * (halfW + 0.026), deckY + 0.98, -1.6, side * Math.PI * 0.5, {
          bgHex: cfg.bodySecondaryColor || '#c92d29',
          fgHex: cfg.liveryStripeColor || '#f2c13a',
          lit: false
        });
      }
    } else if (bf === 'rail_steam_loco' || bf === 'rail_tank_steam' || bf === 'rail_articulated_steam') {
      const boilerR = bf === 'rail_tank_steam'
        ? clamp(halfW * 0.54, 0.68, 0.86)
        : bf === 'rail_articulated_steam'
          ? clamp(halfW * 0.66, 0.86, 1.08)
          : clamp(halfW * 0.62, 0.78, 1.02);
      const boilerCenterY = deckY + boilerR + (bf === 'rail_tank_steam' ? 0.24 : bf === 'rail_articulated_steam' ? 0.42 : 0.38);
      const smokeboxEndZ = halfL - (bf === 'rail_tank_steam' ? 0.65 : 0.85);
      // Classic brass smokebox headlamp & bracket + pilot marker lanterns
      batcher.addBox(0, boilerCenterY + 0.44, smokeboxEndZ - 0.04, 0.28, 0.08, 0.28, { materialRole: 'utility', layer: 'detail' });
      batcher.addCylinder(0, boilerCenterY + 0.6, smokeboxEndZ + 0.04, 0.16, 0.16, 0.22, 12, 'z', 'secondary', 'detail');
      batcher.addCylinder(0, boilerCenterY + 0.6, smokeboxEndZ + 0.16, 0.13, 0.13, 0.03, 12, 'z', 'headlight', 'detail');
      for (const sx of [-0.72, 0.72]) {
        batcher.addCylinder(sx, deckY + 0.28, frontEndZ - 0.22, 0.06, 0.06, 0.1, 8, 'z', 'headlight', 'detail');
      }
      batcher.addCylinder(0, deckY + 1.48, rearEndZ + 0.24, 0.075, 0.075, 0.04, 10, 'z', 'taillight', 'detail');
      const cabZ = bf === 'rail_tank_steam' ? -halfL + 3.05 : (bf === 'rail_articulated_steam' ? -halfL + 9.2 : -halfL + 7.6);
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 0.88, 0.22, side * (halfW * 0.94 + 0.024), deckY + 0.92, cabZ, side * Math.PI * 0.5, {
          bgHex: '#181a1f',
          fgHex: cfg.liveryStripeColor || '#d4a644',
          lit: false
        });
      }
    } else if (bf === 'rail_heavy_diesel') {
      const topY = rz.zones.bodyTopY;
      batcher.addCylinder(0, topY - 0.28, frontEndZ - 2.75, 0.095, 0.095, 0.05, 10, 'z', 'headlight', 'detail');
      for (const sx of [-0.72, 0.72]) {
        batcher.addCylinder(sx, deckY + 0.28, frontEndZ - 0.35, 0.065, 0.065, 0.04, 8, 'z', 'headlight', 'detail');
        batcher.addCylinder(sx, deckY + 0.26, rearEndZ + 0.12, 0.06, 0.06, 0.04, 8, 'z', 'taillight', 'detail');
      }
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.08, 0.24, side * (halfW * 0.96 + 0.025), deckY + 1.02, frontEndZ - 4.1, side * Math.PI * 0.5, {
          bgHex: cfg.bodySecondaryColor || '#2c3138',
          fgHex: cfg.bodyPrimaryColor || '#e2a824',
          lit: false
        });
      }
    } else if (bf === 'rail_box_electric') {
      for (const endSign of [-1, 1]) {
        batcher.addCylinder(0, deckY + 1.25, endSign * (halfL - 0.2), 0.11, 0.11, 0.05, 10, 'z', endSign > 0 ? 'headlight' : 'taillight', 'detail');
      }
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.05, 0.24, side * (halfW * 0.96 + 0.026), deckY + 0.98, 0, side * Math.PI * 0.5, {
          bgHex: '#182420',
          fgHex: cfg.liveryStripeColor || '#e2b542',
          lit: false
        });
      }
    } else {
      // Maintenance crane & rail truck workhead floodlamps + side fleet plate
      for (const endSign of [-1, 1]) {
        for (const sx of [-0.6, 0.6]) {
          batcher.addCylinder(sx, deckY + 0.02, endSign * (halfL - 0.02), 0.06, 0.06, 0.03, 8, 'z', endSign > 0 ? 'headlight' : 'taillight', 'detail');
        }
      }
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.0, 0.2, side * (halfW * 0.95 + 0.024), deckY - 0.06, -halfL * 0.22, side * Math.PI * 0.5, {
          bgHex: '#232830',
          fgHex: cfg.liveryStripeColor || '#f2c13a',
          lit: false
        });
      }
    }
  } else if (rz.unitType === 'passenger_coach') {
    const pax = rz.zones.passenger;
    const endZ = pax.bodyEndZ;
    const labelPlate = routeBullet ? `${routeBullet} · ${unitNum}` : String(cfg.signText || unitNum).slice(0, 18);

    if (bf === 'rail_suspended_monorail' || bf === 'rail_aerial_gondola') {
      const cabinGrp = rootGroup.getObjectByName('CabinSuspension') || rootGroup;
      const relSillY = pax.windowSillY - cabinGrp.position.y;
      if (bf === 'rail_aerial_gondola') {
        for (const endSign of [-1, 1]) {
          trDetailMakeNumberPlate(cabinGrp, routeBullet || unitNum, 0.72, 0.2, 0, relSillY - 0.28, endSign * (halfL * 0.72), endSign < 0 ? Math.PI : 0, {
            bgHex: cfg.bodySecondaryColor || '#2c3947',
            fgHex: '#f8fafc',
            borderHex: cfg.liveryStripeColor || '#f5c438',
            lit: Boolean(cfg.headlightsLit)
          });
        }
      } else {
        for (const side of [-1, 1]) {
          trDetailMakeNumberPlate(cabinGrp, labelPlate, 1.05, 0.22, side * (halfW + 0.024), relSillY - 0.3, 0, side * Math.PI * 0.5, {
            bgHex: cfg.bodySecondaryColor || '#223344',
            fgHex: '#f8fafc',
            borderHex: cfg.liveryStripeColor || '#58c4d9',
            lit: Boolean(cfg.emergencyLightsLit)
          });
        }
      }
    } else if (bf === 'rail_highspeed_lead') {
      for (const sx of [-0.52, 0.52]) {
        batcher.addCylinder(sx, deckY + 0.56, halfL - 0.95, 0.072, 0.072, 0.04, 10, 'z', 'headlight', 'detail');
      }
      for (const side of [-1, 1]) {
        batcher.addCylinder(side * (halfW - 0.34), pax.eavesY - 0.32, -endZ - 0.015, 0.052, 0.052, 0.03, 8, 'z', 'taillight', 'detail');
        trDetailMakeNumberPlate(rootGroup, labelPlate, 1.28, 0.24, side * (halfW + 0.024), pax.windowSillY - 0.34, -1.6, side * Math.PI * 0.5, {
          bgHex: cfg.bodySecondaryColor || '#1e3556',
          fgHex: '#f8fafc',
          borderHex: cfg.liveryStripeColor || '#3899e0',
          lit: false
        });
      }
    } else {
      // Flat/raked transit & rail passenger vehicles
      const isMetroEnd = bf === 'rail_subway_classic' || bf === 'rail_metro_modern' || bf === 'rail_people_mover' || bf === 'rail_straddle_monorail';
      const isStreetcarEnd = bf === 'rail_historic_streetcar' || bf === 'rail_articulated_tram' || bf === 'rail_open_tram';
      const lampHalfX = (bf === 'rail_metro_modern' || bf === 'rail_straddle_monorail') ? halfW * 0.52 : (halfW - 0.32);

      for (const endSign of [-1, 1]) {
        const zPos = endSign * (endZ + 0.016);
        if (isStreetcarEnd) {
          batcher.addCylinder(0, deckY + 0.62, zPos, 0.11, 0.11, 0.04, 10, 'z', endSign > 0 ? 'headlight' : 'taillight', 'detail');
          trDetailMakeNumberPlate(rootGroup, routeBullet || cfg.signText || 'LINE 12', 0.78, 0.18, 0, pax.eavesY - 0.12, zPos + endSign * 0.015, endSign < 0 ? Math.PI : 0, {
            bgHex: '#181e26',
            fgHex: '#fde047',
            lit: true
          });
        } else {
          for (const side of [-1, 1]) {
            const role = isMetroEnd && endSign > 0 ? 'headlight' : 'taillight';
            batcher.addCylinder(side * lampHalfX, isMetroEnd ? deckY + 0.54 : pax.eavesY - 0.28, zPos, 0.055, 0.055, 0.03, 8, 'z', role, 'detail');
          }
          if (isMetroEnd) {
            trDetailMakeNumberPlate(rootGroup, routeBullet || cfg.signText || 'M1', 0.7, 0.2, 0, pax.eavesY - 0.16, zPos + endSign * 0.018, endSign < 0 ? Math.PI : 0, {
              bgHex: '#11161f',
              fgHex: cfg.liveryStripeColor || '#f5c438',
              lit: true
            });
          }
        }
      }

      const sidePlateZ = (bf === 'rail_subway_classic' || bf === 'rail_metro_modern') ? d.length * 0.145 : (bf === 'rail_people_mover' ? -2.2 : 0);
      const sidePlateY = bf === 'rail_bilevel_coach' ? deckY + 1.98 : (bf === 'rail_open_tram' ? deckY + 0.28 : pax.windowSillY - 0.34);
      const sidePlateX = (bf === 'rail_historic_streetcar' ? halfW * 0.94 : halfW) + 0.024;
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, labelPlate, 1.25, 0.24, side * sidePlateX, sidePlateY, sidePlateZ, side * Math.PI * 0.5, {
          bgHex: cfg.bodySecondaryColor || '#253c59',
          fgHex: '#f5f9fc',
          borderHex: cfg.liveryStripeColor || '#25a58d',
          lit: Boolean(cfg.emergencyLightsLit)
        });
      }
    }
  } else {
    // Freight wagon reporting marks & end reflector markers
    for (const endSign of [-1, 1]) {
      for (const side of [-1, 1]) {
        batcher.addBox(side * (halfW - 0.14), deckY - 0.04, endSign * (d.length * 0.5 + 0.008), 0.11, 0.07, 0.02, {
          materialRole: 'taillight',
          layer: 'detail'
        });
      }
    }
    if (bf === 'rail_freight_boxcar') {
      const box = rz.zones.boxcar;
      const markZ = lerp(box.bodyStartZ + 0.85, -box.doorWidth * 0.5 - 0.85, 0.5);
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.15, 0.28, side * (halfW + 0.028), deckY + 1.15, markZ, side * Math.PI * 0.5, {
          bgHex: cfg.bodyPrimaryColor || '#8c3b2e',
          fgHex: cfg.liveryStripeColor || '#dfd5c2',
          lit: false
        });
      }
    } else if (bf === 'rail_freight_tank') {
      const tk = rz.zones.tank;
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.1, 0.26, side * (tk.radius + 0.025), tk.centerY, -2.1, side * Math.PI * 0.5, {
          bgHex: cfg.bodyPrimaryColor || '#272d34',
          fgHex: '#f0f4f8',
          lit: false
        });
      }
    } else if (bf === 'rail_freight_hopper') {
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.12, 0.26, side * (halfW * 0.96 + 0.026), deckY + 1.18, 0, side * Math.PI * 0.5, {
          bgHex: cfg.bodyPrimaryColor || '#4d535c',
          fgHex: cfg.liveryStripeColor || '#e2a336',
          lit: false
        });
      }
    } else if (bf === 'rail_freight_caboose') {
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 0.98, 0.24, side * (halfW * 0.94 + 0.026), deckY + 0.95, -1.1, side * Math.PI * 0.5, {
          bgHex: cfg.bodyPrimaryColor || '#b83227',
          fgHex: cfg.liveryStripeColor || '#f2c13a',
          lit: false
        });
      }
    } else {
      for (const side of [-1, 1]) {
        trDetailMakeNumberPlate(rootGroup, unitNum, 1.05, 0.18, side * (halfW + 0.024), deckY - 0.1, 0, side * Math.PI * 0.5, {
          bgHex: '#1f252c',
          fgHex: cfg.liveryStripeColor || '#e09a2f',
          lit: false
        });
      }
    }
  }
}
