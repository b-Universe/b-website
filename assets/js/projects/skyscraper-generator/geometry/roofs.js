import { clamp, degToRad, lerp } from '../utils.js';
import { skyBox, skyCylinder } from './primitives.js';
import { computeSliceTransform, transformVertexXZ } from './footprints-mesh.js';

function roofBuildLoftedCap(verts, baseY, topY, topScaleX, topScaleZ, topShiftX, topShiftYSlope, material, materialRole = 'crown') {
    const n = verts.length;
    if (n < 3) return null;

    const cx = verts.reduce((s, v) => s + v.x, 0) / n;
    const cz = verts.reduce((s, v) => s + v.z, 0) / n;
    let maxHalfX = 1;
    for (const v of verts) {
        maxHalfX = Math.max(maxHalfX, Math.abs(v.x - cx));
    }

    const bot = verts.map((v) => ({ x: v.x, y: v.y ?? baseY, z: v.z }));
    const top = verts.map((v) => {
        const lx = v.x - cx;
        const lz = v.z - cz;
        const slopeOffset = topShiftYSlope ? (lx / maxHalfX) * topShiftYSlope : 0;
        return {
            x: cx + topShiftX + lx * topScaleX,
            y: Math.max((v.y ?? baseY) + 0.35, topY + slopeOffset),
            z: cz + lz * topScaleZ
        };
    });

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let off = 0;

    const addTri = (a, b, c, nx, ny, nz, u0 = 0, v0 = 0, u1 = 1, v1 = 0, u2 = 1, v2 = 1) => {
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
        uvs.push(u0, v0, u1, v1, u2, v2);
        indices.push(off, off + 1, off + 2);
        off += 3;
    };

    // Side walls
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const a = bot[i];
        const b = bot[next];
        const c = top[next];
        const d = top[i];

        const ux = b.x - a.x;
        const uy = b.y - a.y;
        const uz = b.z - a.z;
        const vx = c.x - a.x;
        const vy = c.y - a.y;
        const vz = c.z - a.z;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;

        const span = Math.hypot(ux, uz) * 0.14;
        const hSpan = Math.max(0.5, Math.abs(d.y - a.y) * 0.14);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
        normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
        uvs.push(0, 0, span, 0, span, hSpan, 0, hSpan);
        indices.push(off, off + 1, off + 2, off, off + 2, off + 3);
        off += 4;
    }

    // Top cap via ear-clipping / ShapeUtils
    const top2D = top.map((p) => new THREE.Vector2(p.x, -p.z));
    const topTris = THREE.ShapeUtils.triangulateShape(top2D, []);
    for (const [ia, ib, ic] of topTris) {
        const pA = top[ia];
        const pB = top[ib];
        const pC = top[ic];
        const ux = pB.x - pA.x;
        const uy = pB.y - pA.y;
        const uz = pB.z - pA.z;
        const vx = pC.x - pA.x;
        const vy = pC.y - pA.y;
        const vz = pC.z - pA.z;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        if (ny < 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
            addTri(pA, pC, pB, nx, ny, nz);
        } else {
            const len = Math.hypot(nx, ny, nz) || 1;
            addTri(pA, pB, pC, nx / len, ny / len, nz / len);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { layer: 'roof', materialRole };
    return mesh;
}

function roofBuildSpire(parent, batcher, materials, cx, baseY, cz, spireStyle, spireH, spireR) {
    if (!spireStyle || spireStyle === 'none' || spireH <= 1) return baseY;

    const spireGroup = new THREE.Group();
    spireGroup.position.set(cx, baseY, cz);
    parent.add(spireGroup);

    // Structural base collar
    skyCylinder(spireGroup, 0, Math.min(2.2, spireH * 0.08) * 0.5, 0, spireR * 1.15, spireR * 1.45, Math.min(2.4, spireH * 0.1), materials.crown, 8, {
        layer: 'roof',
        materialRole: 'crown'
    });

    if (spireStyle === 'lattice_tower') {
        const latticeH = spireH * 0.58;
        const mastH = spireH - latticeH;
        const legSpread = Math.max(1.8, spireR * 1.5);
        const levels = 5;
        const legs = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1]
        ];

        for (let lv = 0; lv < levels; lv++) {
            const f0 = lv / levels;
            const f1 = (lv + 1) / levels;
            const y0 = baseY + f0 * latticeH;
            const y1 = baseY + f1 * latticeH;
            const s0 = lerp(legSpread, legSpread * 0.22, f0);
            const s1 = lerp(legSpread, legSpread * 0.22, f1);

            for (let i = 0; i < 4; i++) {
                const [lx, lz] = legs[i];
                const [nx, nz] = legs[(i + 1) % 4];
                const p00 = [cx + lx * s0, y0, cz + lz * s0];
                const p01 = [cx + nx * s0, y0, cz + nz * s0];
                const p10 = [cx + lx * s1, y1, cz + lz * s1];
                const p11 = [cx + nx * s1, y1, cz + nz * s1];
                batcher.addBeam(p00, p10, 0.22, 0.22, 'framing', 'roof');
                batcher.addBeam(p10, p11, 0.16, 0.16, 'trim', 'roof');
                batcher.addBeam(p00, p11, 0.12, 0.12, 'framing', 'roof');
                batcher.addBeam(p01, p10, 0.12, 0.12, 'framing', 'roof');
            }
        }

        const mastBase = latticeH;
        skyCylinder(spireGroup, 0, mastBase + mastH * 0.5, 0, 0.08, 0.36, mastH, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
    } else if (spireStyle === 'gothic_needle') {
        const shaftH = spireH * 0.88;
        skyCylinder(spireGroup, 0, shaftH * 0.5, 0, 0.14, spireR * 1.1, shaftH, materials.crown, 8, {
            layer: 'roof',
            materialRole: 'crown'
        });
        // Crocket rings along gothic needle
        for (let i = 1; i <= 3; i++) {
            const f = i * 0.24;
            const ry = shaftH * f;
            const rRing = lerp(spireR * 1.15, 0.22, f) * 1.25;
            skyCylinder(spireGroup, 0, ry, 0, rRing, rRing, 0.32, materials.trim, 8, {
                layer: 'roof',
                materialRole: 'trim'
            });
        }
        // 4 flanking pinnacle needlettes
        const pOff = spireR * 1.35;
        for (const [px, pz] of[[-pOff, 0], [pOff, 0], [0, -pOff], [0, pOff]]) {
            const ph = spireH * 0.34;
            skyCylinder(spireGroup, px, ph * 0.5, pz, 0.06, 0.42, ph, materials.trim, 6, {
                layer: 'roof',
                materialRole: 'trim'
            });
        }
        skyCylinder(spireGroup, 0, spireH * 0.94, 0, 0.04, 0.14, spireH * 0.12, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
    } else if (spireStyle === 'atomic_needle') {
        const shaftH = spireH * 0.85;
        skyCylinder(spireGroup, 0, shaftH * 0.5, 0, 0.12, spireR * 0.72, shaftH, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        // 4 retro-futurist stabilizing fins around base
        for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            const fin = skyBox(
                spireGroup,
                Math.cos(ang) * spireR * 0.95,
                spireH * 0.12,
                Math.sin(ang) * spireR * 0.95,
                spireR * 1.3,
                spireH * 0.24,
                0.28,
                materials.framing, { rotY: -ang, layer: 'roof', materialRole: 'framing' }
            );
            if (fin) fin.userData.materialRole = 'framing';
        }
        // Dual circular atomic saucer discs around spire shaft
        skyCylinder(spireGroup, 0, spireH * 0.32, 0, spireR * 2.2, spireR * 2.0, 0.55, materials.crownLight, 16, {
            layer: 'roof',
            materialRole: 'crownLight'
        });
        skyCylinder(spireGroup, 0, spireH * 0.56, 0, spireR * 1.35, spireR * 1.15, 0.42, materials.trim, 16, {
            layer: 'roof',
            materialRole: 'trim'
        });
        skyCylinder(spireGroup, 0, spireH * 0.92, 0, 0.04, 0.14, spireH * 0.16, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
    } else {
        // slender_mast - classic supertall 3-tier telescoping mast
        const h1 = spireH * 0.4;
        const h2 = spireH * 0.34;
        const h3 = spireH * 0.26;
        skyCylinder(spireGroup, 0, h1 * 0.5, 0, spireR * 0.52, spireR * 0.85, h1, materials.crown, 8, {
            layer: 'roof',
            materialRole: 'crown'
        });
        skyCylinder(spireGroup, 0, h1 + h2 * 0.5, 0, spireR * 0.24, spireR * 0.5, h2, materials.trim, 8, {
            layer: 'roof',
            materialRole: 'trim'
        });
        skyCylinder(spireGroup, 0, h1 + h2 + h3 * 0.5, 0, 0.06, spireR * 0.22, h3, materials.framing, 8, {
            layer: 'roof',
            materialRole: 'framing'
        });
        // Guy collar rings
        skyCylinder(spireGroup, 0, h1, 0, spireR * 0.95, spireR * 0.95, 0.36, materials.crownLight, 8, {
            layer: 'roof',
            materialRole: 'crownLight'
        });
    }

    // Aviation beacon orb at spire apex
    const beaconGeo = new THREE.SphereGeometry(0.45, 10, 8);
    const beacon = new THREE.Mesh(beaconGeo, materials.beaconRed);
    beacon.position.set(0, spireH + 0.25, 0);
    beacon.userData = { layer: 'roof', materialRole: 'beaconRed' };
    spireGroup.add(beacon);

    return baseY + spireH + 0.7;
}

function roofBuildRooftopEquipment(parent, batcher, materials, cx, deckY, cz, deckW, deckD, cfg, hasCenterSpire) {
    const safeW = Math.max(6, deckW);
    const safeD = Math.max(6, deckD);
    const sideShift = hasCenterSpire ? Math.min(safeW * 0.26, 5.0) : 0;

    // Mechanical penthouse
    if (cfg.mechPenthouse) {
        const pw = clamp(safeW * 0.42, 4.2, 13);
        const pd = clamp(safeD * 0.38, 4.0, 11);
        const ph = clamp((cfg.crownHeight || 8) * 0.42, 2.8, 6.2);
        const px = cx - (hasCenterSpire ? Math.min(safeW * 0.24, 4.2) : 0);
        const pz = cz - (hasCenterSpire ? Math.min(safeD * 0.16, 2.6) : 0);
        skyBox(parent, px, deckY + ph * 0.5, pz, pw, ph, pd, materials.secondary, {
            layer: 'roof',
            materialRole: 'secondary'
        });
        skyBox(parent, px, deckY + ph + 0.18, pz, pw + 0.45, 0.36, pd + 0.45, materials.trim, {
            layer: 'roof',
            materialRole: 'trim'
        });
        // Pent-house louvered exhaust grilles
        for (let i = -1; i <= 1; i++) {
            batcher.addBox(px + i * (pw * 0.26), deckY + ph * 0.55, pz + pd * 0.5 + 0.08, pw * 0.18, ph * 0.48, 0.12, 0, 'darkMetal', 'roof');
        }
    }

    // Rooftop water tank on trestle frame
    if (cfg.waterTanks) {
        const tx = cx + sideShift + Math.min(safeW * 0.22, 4.2);
        const tz = cz - Math.min(safeD * 0.22, 3.8);
        const legH = 2.0;
        const r = 1.25;
        for (const [lx, lz] of[[-0.85, -0.85], [0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]]) {
            batcher.addBox(tx + lx, deckY + legH * 0.5, tz + lz, 0.2, legH, 0.2, 0, 'darkMetal', 'roof');
        }
        skyCylinder(parent, tx, deckY + legH + 1.45, tz, r, r, 2.7, materials.framing, 12, {
            layer: 'roof',
            materialRole: 'framing'
        });
        skyCylinder(parent, tx, deckY + legH + 3.25, tz, 0.12, r * 1.1, 0.95, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
    }

    // HVAC banks
    if (cfg.hvacUnits) {
        const hx = cx + Math.min(safeW * 0.22, 4.4);
        const hz = cz + Math.min(safeD * 0.2, 3.6);
        batcher.addBox(hx, deckY + 0.85, hz, 3.4, 1.7, 2.2, 0, 'framing', 'roof');
        batcher.addBox(hx - 2.4, deckY + 0.65, hz + 0.3, 1.8, 1.3, 1.8, 0, 'trim', 'roof');
        skyCylinder(parent, hx - 0.7, deckY + 1.85, hz, 0.58, 0.62, 0.35, materials.darkMetal, 10, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
        skyCylinder(parent, hx + 0.75, deckY + 1.85, hz, 0.58, 0.62, 0.35, materials.darkMetal, 10, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
    }

    // Helipad platform
    if (cfg.helipad && safeW >= 11 && safeD >= 11) {
        const padR = clamp(Math.min(safeW, safeD) * 0.34, 3.8, 7.2);
        const padY = deckY + 0.42;
        skyCylinder(parent, cx, padY, cz, padR, padR * 1.06, 0.48, materials.darkMetal, 8, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
        // Perimeter ring accents + H symbol
        const hScale = padR * 0.46;
        batcher.addBox(cx - hScale * 0.55, padY + 0.28, cz, 0.38, 0.08, hScale * 1.35, 0, 'crownLight', 'roof');
        batcher.addBox(cx + hScale * 0.55, padY + 0.28, cz, 0.38, 0.08, hScale * 1.35, 0, 'crownLight', 'roof');
        batcher.addBox(cx, padY + 0.28, cz, hScale * 1.1, 0.08, 0.38, 0, 'crownLight', 'roof');
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            batcher.addBox(cx + Math.cos(a) * (padR * 0.92), padY + 0.32, cz + Math.sin(a) * (padR * 0.92), 0.24, 0.2, 0.24, 0, 'beaconRed', 'roof');
        }
    }

    // Secondary antenna masts along perimeter corners
    const mastCount = clamp(Math.round(Number(cfg.antennaMasts) || 0), 0, 6);
    if (mastCount > 0) {
        const corners = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
            [0, -1],
            [0, 1]
        ];
        for (let i = 0; i < mastCount; i++) {
            const [kx, kz] = corners[i % corners.length];
            const mx = cx + kx * (safeW * 0.38);
            const mz = cz + kz * (safeD * 0.38);
            const mh = 5.5 + (i % 3) * 2.2;
            skyCylinder(parent, mx, deckY + mh * 0.5, mz, 0.04, 0.14, mh, materials.framing, 6, {
                layer: 'roof',
                materialRole: 'framing'
            });
            batcher.addBox(mx, deckY + mh * 0.65, mz, 0.95, 0.12, 0.12, 0, 'trim', 'roof');
        }
    }

    // Communication microwave dish array
    if (cfg.commArrays) {
        const ax = cx - Math.min(safeW * 0.32, 5.2);
        const az = cz + Math.min(safeD * 0.3, 4.6);
        skyCylinder(parent, ax, deckY + 2.4, az, 0.12, 0.2, 4.8, materials.darkMetal, 8, {
            layer: 'roof',
            materialRole: 'darkMetal'
        });
        const dishA = skyCylinder(parent, ax + 0.55, deckY + 3.8, az, 0.85, 0.12, 0.45, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        if (dishA) dishA.rotation.z = -Math.PI * 0.35;
        const dishB = skyCylinder(parent, ax - 0.55, deckY + 3.1, az + 0.3, 0.68, 0.1, 0.38, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        if (dishB) dishB.rotation.z = Math.PI * 0.38;
    }
}

export function buildTowerCrownAndRoof(parent, topSection, cfg, towerSpec, batcher, materials) {
    const poly = topSection.polygon;
    const h = topSection.height;
    const baseY = topSection.baseElevation;
    const cx = topSection.offsetX || 0;
    const cz = topSection.offsetZ || 0;

    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    const topVerts = poly.vertices.map((v) => {
        const tr = computeSliceTransform(topSection, 1, h, v.x);
        const pt = transformVertexXZ(v, tr.sx, tr.sz, tr.rotRad, cx, cz);
        const vy = baseY + tr.y;
        minY = Math.min(minY, vy);
        maxY = Math.max(maxY, vy);
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minZ = Math.min(minZ, pt.z);
        maxZ = Math.max(maxZ, pt.z);
        return { x: pt.x, y: vy, z: pt.z };
    });

    const topW = Math.max(4, maxX - minX);
    const topD = Math.max(4, maxZ - minZ);
    const midCenterX = (minX + maxX) * 0.5;
    const midCenterZ = (minZ + maxZ) * 0.5;
    const crownBaseY = maxY;
    const crownStyle = cfg.crownStyle || 'art_deco_stepped';
    const crownH = clamp(Number(cfg.crownHeight) || 10, 2, 36);
    const crownSteps = clamp(Math.round(Number(cfg.crownSteps) || 3), 1, 6);
    const curvature = clamp(Number(cfg.crownCurvature) || 0.4, 0, 1);
    const lightRole = cfg.crownLighting ? 'crownLight' : 'trim';

    let summitY = crownBaseY;
    let equipDeckY = crownBaseY;
    let equipDeckW = topW * 0.72;
    let equipDeckD = topD * 0.72;

    if (crownStyle === 'flat') {
        const parapetH = Math.min(2.6, Math.max(0.85, crownH * 0.25));
        for (let i = 0; i < topVerts.length; i++) {
            const a = topVerts[i];
            const b = topVerts[(i + 1) % topVerts.length];
            batcher.addBeam([a.x, a.y + parapetH * 0.45, a.z], [b.x, b.y + parapetH * 0.45, b.z], 0.52, parapetH, 'trim', 'roof');
        }
        summitY = crownBaseY + parapetH;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'art_deco_stepped') {
        let cursorY = crownBaseY;
        const stepH = crownH / crownSteps;
        for (let s = 0; s < crownSteps; s++) {
            const sScale = lerp(0.88, 0.34, s / Math.max(1, crownSteps - 1));
            const tier = roofBuildLoftedCap(
                topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * sScale, y: cursorY, z: midCenterZ + (v.z - midCenterZ) * sScale })),
                cursorY,
                cursorY + stepH,
                lerp(1.0, 0.9, 0.4),
                lerp(1.0, 0.9, 0.4),
                0,
                0,
                materials.crown,
                'crown'
            );
            if (tier) parent.add(tier);

            // Decorative vertical flutes & corner ribs on each stepped tier
            const stepW = topW * sScale;
            const stepD = topD * sScale;
            for (const sx of[-1, 1]) {
                for (const sz of[-1, 1]) {
                    batcher.addBox(
                        midCenterX + sx * stepW * 0.49,
                        cursorY + stepH * 0.55,
                        midCenterZ + sz * stepD * 0.49,
                        0.55,
                        stepH * 1.12,
                        0.55,
                        0,
                        lightRole,
                        'roof'
                    );
                }
            }
            // Illuminated horizontal trim collar around tier
            if (cfg.crownLighting) {
                batcher.addBox(midCenterX, cursorY + stepH - 0.16, midCenterZ + stepD * 0.5 + 0.08, stepW * 0.92, 0.28, 0.14, 0, 'crownLight', 'roof');
                batcher.addBox(midCenterX, cursorY + stepH - 0.16, midCenterZ - stepD * 0.5 - 0.08, stepW * 0.92, 0.28, 0.14, 0, 'crownLight', 'roof');
            }
            cursorY += stepH;
        }
        summitY = cursorY;
        equipDeckY = crownBaseY;
        equipDeckW = topW * 0.42;
        equipDeckD = topD * 0.42;
    } else if (crownStyle === 'pyramid') {
        const plinthH = Math.min(2.4, crownH * 0.18);
        const plinth = roofBuildLoftedCap(topVerts, crownBaseY, crownBaseY + plinthH, 0.94, 0.94, 0, 0, materials.trim, 'trim');
        if (plinth) parent.add(plinth);
        const pyrVerts = topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * 0.9, y: crownBaseY + plinthH, z: midCenterZ + (v.z - midCenterZ) * 0.9 }));
        const pyr = roofBuildLoftedCap(pyrVerts, crownBaseY + plinthH, crownBaseY + crownH, 0.08, 0.08, 0, 0, materials.crown, 'crown');
        if (pyr) parent.add(pyr);

        // Ridge ribs from corners toward apex
        for (let i = 0; i < Math.min(8, pyrVerts.length); i += Math.max(1, Math.floor(pyrVerts.length / 4))) {
            const v = pyrVerts[i];
            batcher.addBeam([v.x, v.y, v.z], [midCenterX, crownBaseY + crownH, midCenterZ], 0.34, 0.34, lightRole, 'roof');
        }
        summitY = crownBaseY + crownH;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'slanted') {
        // Only add an extra sloped crown wedge if section itself doesn't already slope strongly, or seamlessly crown its sloped plane
        const slopeBase = Math.abs(topSection.slantedTopDeg || 0) > 6 ? topVerts : topVerts.map((v) => ({ x: v.x, y: maxY, z: v.z }));
        const wedge = roofBuildLoftedCap(slopeBase, minY, maxY + crownH, 0.96, 0.96, 0, crownH * 0.42, materials.crown, 'crown');
        if (wedge) parent.add(wedge);

        // Sloped perimeter bezel rim
        for (let i = 0; i < slopeBase.length; i++) {
            const a = slopeBase[i];
            const b = slopeBase[(i + 1) % slopeBase.length];
            batcher.addBeam([a.x, a.y + 0.3, a.z], [b.x, b.y + 0.3, b.z], 0.55, 0.55, lightRole, 'roof');
        }
        summitY = maxY + crownH * 1.42;
        equipDeckY = minY + 0.4;
    } else if (crownStyle === 'curved') {
        const segs = 6;
        let cursorY = crownBaseY;
        const archH = crownH * (0.65 + curvature * 0.45);
        for (let s = 0; s < segs; s++) {
            const f0 = s / segs;
            const f1 = (s + 1) / segs;
            const w0 = Math.cos(f0 * Math.PI * 0.44);
            const w1 = Math.cos(f1 * Math.PI * 0.44);
            const sliceY0 = crownBaseY + Math.sin(f0 * Math.PI * 0.5) * archH;
            const sliceY1 = crownBaseY + Math.sin(f1 * Math.PI * 0.5) * archH;
            const ring = roofBuildLoftedCap(
                topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * w0, y: sliceY0, z: midCenterZ + (v.z - midCenterZ) * w0 })),
                sliceY0,
                sliceY1,
                w1 / Math.max(0.15, w0),
                Math.max(0.88, lerp(1, 0.85, f1)),
                0,
                0,
                s % 2 === 0 ? materials.crown : materials.glass,
                s % 2 === 0 ? 'crown' : 'glass'
            );
            if (ring) parent.add(ring);
            cursorY = sliceY1;
        }
        if (cfg.crownLighting) {
            batcher.addBox(midCenterX, cursorY + 0.1, midCenterZ, topW * 0.32, 0.25, topD * 0.82, 0, 'crownLight', 'roof');
        }
        summitY = cursorY;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'domed') {
        const drumH = crownH * 0.32;
        const drumR = Math.min(topW, topD) * 0.38;
        skyCylinder(parent, midCenterX, crownBaseY + drumH * 0.5, midCenterZ, drumR, drumR * 1.04, drumH, materials.crown, 16, {
            layer: 'roof',
            materialRole: 'crown'
        });
        const domeGeo = new THREE.SphereGeometry(drumR * 0.96, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
        const domeMesh = new THREE.Mesh(domeGeo, materials.crown);
        domeMesh.position.set(midCenterX, crownBaseY + drumH, midCenterZ);
        domeMesh.scale.y = clamp((crownH * 0.68) / Math.max(1, drumR), 0.55, 1.85);
        domeMesh.castShadow = true;
        domeMesh.receiveShadow = true;
        domeMesh.userData = { layer: 'roof', materialRole: 'crown' };
        parent.add(domeMesh);

        const domeApex = crownBaseY + drumH + drumR * domeMesh.scale.y;
        skyCylinder(parent, midCenterX, domeApex + 1.1, midCenterZ, drumR * 0.14, drumR * 0.22, 2.2, materials.trim, 12, {
            layer: 'roof',
            materialRole: 'trim'
        });
        summitY = domeApex + 2.2;
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'angular_geometric') {
        // Intersecting cantilevered triangular blades & chamfered crown blocks
        const bladeCount = Math.max(2, Math.min(5, crownSteps + 1));
        for (let i = 0; i < bladeCount; i++) {
            const f = i / bladeCount;
            const bh = crownH * (0.58 + f * 0.55);
            const bw = topW * lerp(0.58, 0.32, f);
            const bd = topD * lerp(0.68, 0.34, f);
            const bx = midCenterX + (i % 2 === 0 ? -1 : 1) * topW * 0.16 * (1 - f * 0.5);
            const bz = midCenterZ + (i % 3 === 0 ? 1 : -1) * topD * 0.12;
            const ang = (i % 2 === 0 ? 1 : -1) * degToRad(14 * (1 + curvature));
            const shard = skyBox(parent, bx, crownBaseY + bh * 0.5, bz, bw, bh, bd, i % 2 === 0 ? materials.crown : materials.glass, {
                rotY: ang,
                layer: 'roof',
                materialRole: i % 2 === 0 ? 'crown' : 'glass'
            });
            if (shard) shard.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.08;
            if (cfg.crownLighting) {
                batcher.addBox(bx, crownBaseY + bh + 0.1, bz, bw * 0.9, 0.24, 0.24, ang, 'crownLight', 'roof');
            }
            summitY = Math.max(summitY, crownBaseY + bh);
        }
        equipDeckY = crownBaseY;
    } else if (crownStyle === 'split_crown') {
        // Twin rising shoulder fins with slotted V-notch and recessed buttresses
        const finW = topW * 0.34;
        const finD = topD * 0.88;
        const shoulderX = topW * 0.3;
        const wingPeak = crownH;
        const innerStepH = crownH * 0.58;

        for (const side of[-1, 1]) {
            const sx = midCenterX + side * shoulderX;
            skyBox(parent, sx, crownBaseY + wingPeak * 0.45, midCenterZ, finW, wingPeak * 0.9, finD, materials.crown, {
                layer: 'roof',
                materialRole: 'crown'
            });
            // Outer stepped corner shoulder + inward bevel cap
            skyBox(parent, sx - side * finW * 0.18, crownBaseY + wingPeak * 0.92, midCenterZ, finW * 0.62, wingPeak * 0.22, finD * 0.92, materials.trim, {
                layer: 'roof',
                materialRole: 'trim'
            });
            // Vertical decorative flutes on split crown face
            batcher.addBox(sx, crownBaseY + wingPeak * 0.45, midCenterZ + finD * 0.5 + 0.15, finW * 0.16, wingPeak * 0.92, 0.35, 0, lightRole, 'roof');
            batcher.addBox(sx, crownBaseY + wingPeak * 0.45, midCenterZ - finD * 0.5 - 0.15, finW * 0.16, wingPeak * 0.92, 0.35, 0, lightRole, 'roof');
        }

        // Center recessed lower bridge connecting split cheeks
        skyBox(parent, midCenterX, crownBaseY + innerStepH * 0.5, midCenterZ, topW * 0.36, innerStepH, topD * 0.66, materials.framing, {
            layer: 'roof',
            materialRole: 'framing'
        });
        // Central V-notch needle accents
        batcher.addBeam([midCenterX - topW * 0.14, crownBaseY + innerStepH, midCenterZ + topD * 0.32], [midCenterX, crownBaseY + wingPeak * 0.88, midCenterZ + topD * 0.32], 0.36, 0.45, 'trim', 'roof');
        batcher.addBeam([midCenterX + topW * 0.14, crownBaseY + innerStepH, midCenterZ + topD * 0.32], [midCenterX, crownBaseY + wingPeak * 0.88, midCenterZ + topD * 0.32], 0.36, 0.45, 'trim', 'roof');

        summitY = crownBaseY + wingPeak;
        equipDeckY = crownBaseY + innerStepH;
    } else if (crownStyle === 'open_structural') {
        // Open Perimeter Steel Diagrid / Portal Cage
        const cageH = crownH;
        const inset = 0.92;
        const botPts = topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * inset, y: crownBaseY, z: midCenterZ + (v.z - midCenterZ) * inset }));
        const topPts = topVerts.map((v) => ({ x: midCenterX + (v.x - midCenterX) * (inset * 0.86), y: crownBaseY + cageH, z: midCenterZ + (v.z - midCenterZ) * (inset * 0.86) }));

        for (let i = 0; i < botPts.length; i++) {
            const next = (i + 1) % botPts.length;
            const b0 = botPts[i];
            const b1 = botPts[next];
            const t0 = topPts[i];
            const t1 = topPts[next];
            batcher.addBeam([b0.x, b0.y, b0.z], [t0.x, t0.y, t0.z], 0.52, 0.52, 'framing', 'roof');
            batcher.addBeam([t0.x, t0.y, t0.z], [t1.x, t1.y, t1.z], 0.58, 0.62, lightRole, 'roof');
            batcher.addBeam([b0.x, b0.y, b0.z], [t1.x, t1.y, t1.z], 0.24, 0.24, 'trim', 'roof');
        }
        // Cross tie beams overhead
        batcher.addBeam([midCenterX - topW * 0.38, crownBaseY + cageH, midCenterZ], [midCenterX + topW * 0.38, crownBaseY + cageH, midCenterZ], 0.45, 0.48, 'framing', 'roof');
        batcher.addBeam([midCenterX, crownBaseY + cageH, midCenterZ - topD * 0.38], [midCenterX, crownBaseY + cageH, midCenterZ + topD * 0.38], 0.45, 0.48, 'framing', 'roof');
        summitY = crownBaseY + cageH;
        equipDeckY = crownBaseY;
    }

    const spireStyle = cfg.spireStyle || 'none';
    const hasSpire = spireStyle !== 'none';
    roofBuildRooftopEquipment(parent, batcher, materials, midCenterX, equipDeckY, midCenterZ, equipDeckW, equipDeckD, cfg, hasSpire);

    let spireTopY = summitY;
    if (hasSpire) {
        const spireH = clamp(Number(cfg.spireHeight) || 24, 4, 80);
        const spireR = clamp(Math.min(topW, topD) * 0.08, 0.65, 2.8);
        spireTopY = roofBuildSpire(parent, batcher, materials, midCenterX, summitY - 0.3, midCenterZ, spireStyle, spireH, spireR);
    }

    return {
        crownBaseY,
        crownTopY: summitY,
        spireTopY,
        topY: Math.max(summitY, spireTopY),
        maxSpan: Math.max(topW, topD)
    };
}