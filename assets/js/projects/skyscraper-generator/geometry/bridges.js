import { clamp, lerp } from '../utils.js';

export function buildSkybridgesAndTrusses(parent, complex, cfg, batcher, materials) {
  const skybridges = complex.skybridges || [];
  const trusses = complex.trusses || [];

  // 1. Enclosed / Open / Trussed Skybridges
  for (let i = 0; i < skybridges.length; i++) {
    const sb = skybridges[i];
    const dx = sb.end.x - sb.start.x;
    const dz = sb.end.z - sb.start.z;
    const span = Math.hypot(dx, dz);
    if (span < 1.2) continue;

    const ux = dx / span;
    const uz = dz / span;
    const px = -uz;
    const pz = ux;
    const yaw = Math.atan2(ux, uz);

    const mx = (sb.start.x + sb.end.x) * 0.5;
    const mz = (sb.start.z + sb.end.z) * 0.5;
    const y0 = sb.elevationY;
    const bh = sb.height;
    const bw = sb.width;
    const halfW = bw * 0.5;

    // Structural floor deck + twin underside girders
    batcher.addBox(mx, y0 + 0.22, mz, bw, 0.44, span, yaw, 'framing', 'bridge');
    // Wall attachment portal collars framing bridge entry into each tower facade
    for (const endPt of [sb.start, sb.end]) {
      batcher.addBox(endPt.x, y0 + bh * 0.5, endPt.z, bw + 0.95, bh + 0.72, 1.35, yaw, 'framing', 'bridge');
      batcher.addBox(endPt.x, y0 + bh + 0.28, endPt.z, bw + 1.2, 0.3, 1.5, yaw, 'trim', 'bridge');
      batcher.addBox(endPt.x, y0 - 0.16, endPt.z, bw + 1.2, 0.32, 1.5, yaw, 'trim', 'bridge');
    }
    batcher.addBox(
      mx + px * (halfW - 0.35),
      y0 - 0.18,
      mz + pz * (halfW - 0.35),
      0.34,
      0.42,
      span,
      yaw,
      'darkMetal',
      'bridge'
    );
    batcher.addBox(
      mx - px * (halfW - 0.35),
      y0 - 0.18,
      mz - pz * (halfW - 0.35),
      0.34,
      0.42,
      span,
      yaw,
      'darkMetal',
      'bridge'
    );

    if (sb.enclosed) {
      // Roof deck
      batcher.addBox(mx, y0 + bh - 0.2, mz, bw + 0.2, 0.4, span, yaw, 'trim', 'bridge');

      const bayCount = clamp(Math.round(span / 2.6), 2, 16);
      const bayLen = span / bayCount;
      const wallRole = sb.glass ? 'glass' : 'secondary';
      const wallY = y0 + bh * 0.5;
      const wallH = bh - 0.85;

      for (const side of [-1, 1]) {
        const lateral = side * (halfW - 0.14);
        const sx0 = sb.start.x + px * lateral;
        const sz0 = sb.start.z + pz * lateral;
        const ex0 = sb.end.x + px * lateral;
        const ez0 = sb.end.z + pz * lateral;

        // Top and bottom spandrel headers
        batcher.addBox(mx + px * lateral, y0 + 0.58, mz + pz * lateral, 0.24, 0.34, span, yaw, 'trim', 'bridge');
        batcher.addBox(mx + px * lateral, y0 + bh - 0.48, mz + pz * lateral, 0.24, 0.34, span, yaw, 'trim', 'bridge');

        for (let b = 0; b < bayCount; b++) {
          const bf = (b + 0.5) / bayCount;
          const bx = lerp(sb.start.x, sb.end.x, bf) + px * lateral;
          const bz = lerp(sb.start.z, sb.end.z, bf) + pz * lateral;
          const paneRole = sb.glass && (b + i) % 3 === 0 ? 'glassWarm' : wallRole;
          batcher.addBox(bx, wallY, bz, 0.16, wallH, bayLen * 0.9, yaw, paneRole, 'bridge');

          // Vertical mullion post at bay boundary
          const pf = b / bayCount;
          const postX = lerp(sx0, ex0, pf);
          const postZ = lerp(sz0, ez0, pf);
          batcher.addBox(postX, wallY, postZ, 0.22, bh - 0.4, 0.2, yaw, 'mullion', 'bridge');
        }
      }
    } else {
      // Open-air pedestrian bridge: safety balustrades + handrail posts
      for (const side of [-1, 1]) {
        const lat = side * (halfW - 0.18);
        batcher.addBox(mx + px * lat, y0 + 1.18, mz + pz * lat, 0.14, 0.14, span, yaw, 'trim', 'bridge');
        const posts = clamp(Math.round(span / 2.2), 2, 16);
        for (let p = 0; p <= posts; p++) {
          const f = p / posts;
          batcher.addBox(
            lerp(sb.start.x, sb.end.x, f) + px * lat,
            y0 + 0.72,
            lerp(sb.start.z, sb.end.z, f) + pz * lat,
            0.14,
            0.95,
            0.14,
            yaw,
            'framing',
            'bridge'
          );
        }
      }
    }

    // Structural Warren / X-brace truss along skybridge flanks
    if (sb.trusses) {
      const trussBays = clamp(Math.round(span / 3.4), 2, 12);
      for (const side of [-1, 1]) {
        const lat = side * (halfW + 0.14);
        const ax = sb.start.x + px * lat;
        const az = sb.start.z + pz * lat;
        const bx = sb.end.x + px * lat;
        const bz = sb.end.z + pz * lat;

        batcher.addBeam([ax, y0 + 0.2, az], [bx, y0 + 0.2, bz], 0.24, 0.26, 'framing', 'bridge');
        batcher.addBeam([ax, y0 + bh - 0.2, az], [bx, y0 + bh - 0.2, bz], 0.24, 0.26, 'framing', 'bridge');

        for (let tb = 0; tb < trussBays; tb++) {
          const f0 = tb / trussBays;
          const f1 = (tb + 1) / trussBays;
          const p0 = [lerp(ax, bx, f0), y0 + 0.2, lerp(az, bz, f0)];
          const p1 = [lerp(ax, bx, f1), y0 + 0.2, lerp(az, bz, f1)];
          const q0 = [lerp(ax, bx, f0), y0 + bh - 0.2, lerp(az, bz, f0)];
          const q1 = [lerp(ax, bx, f1), y0 + bh - 0.2, lerp(az, bz, f1)];
          batcher.addBeam(p0, q1, 0.18, 0.18, 'darkMetal', 'bridge');
          batcher.addBeam(q0, p1, 0.18, 0.18, 'darkMetal', 'bridge');
          batcher.addBeam(p1, q1, 0.2, 0.2, 'framing', 'bridge');
        }
      }

      // Angled knee-braces anchoring underside into tower walls
      const kneeDrop = Math.min(4.2, sb.spanLength * 0.28);
      const kneeOut = Math.min(3.6, sb.spanLength * 0.24);
      for (const side of [-1, 1]) {
        const lat = side * (halfW - 0.2);
        batcher.addBeam(
          [sb.start.x + px * lat, y0 - kneeDrop, sb.start.z + pz * lat],
          [sb.start.x + ux * kneeOut + px * lat, y0, sb.start.z + uz * kneeOut + pz * lat],
          0.26,
          0.26,
          'darkMetal',
          'bridge'
        );
        batcher.addBeam(
          [sb.end.x + px * lat, y0 - kneeDrop, sb.end.z + pz * lat],
          [sb.end.x - ux * kneeOut + px * lat, y0, sb.end.z - uz * kneeOut + pz * lat],
          0.26,
          0.26,
          'darkMetal',
          'bridge'
        );
      }
    }
  }

  // 2. Inter-Tower Multi-Story Open X-Brace Truss Frame
  for (const t of trusses) {
    const dx = t.end.x - t.start.x;
    const dz = t.end.z - t.start.z;
    const span = Math.hypot(dx, dz);
    if (span < 1.5) continue;

    const px = -dz / span;
    const pz = dx / span;
    const halfD = t.depth * 0.5;
    const levels = t.levels;
    const h = t.topY - t.bottomY;

    for (let lv = 0; lv < levels; lv++) {
      const y0 = t.bottomY + (lv / levels) * h;
      const y1 = t.bottomY + ((lv + 1) / levels) * h;

      for (const side of [-1, 1]) {
        const lat = side * halfD;
        const a0 = [t.start.x + px * lat, y0, t.start.z + pz * lat];
        const b0 = [t.end.x + px * lat, y0, t.end.z + pz * lat];
        const a1 = [t.start.x + px * lat, y1, t.start.z + pz * lat];
        const b1 = [t.end.x + px * lat, y1, t.end.z + pz * lat];

        batcher.addBeam(a0, b0, 0.34, 0.36, 'framing', 'bridge');
        if (lv === levels - 1) {
          batcher.addBeam(a1, b1, 0.36, 0.38, 'framing', 'bridge');
        }
        batcher.addBeam(a0, b1, 0.28, 0.28, 'darkMetal', 'bridge');
        batcher.addBeam(b0, a1, 0.28, 0.28, 'darkMetal', 'bridge');
      }

      // Cross-tie struts joining front and back truss faces
      batcher.addBeam(
        [(t.start.x + t.end.x) * 0.5 - px * halfD, y0, (t.start.z + t.end.z) * 0.5 - pz * halfD],
        [(t.start.x + t.end.x) * 0.5 + px * halfD, y0, (t.start.z + t.end.z) * 0.5 + pz * halfD],
        0.26,
        0.26,
        'framing',
        'bridge'
      );
    }

    // Structural truss anchor shoes at tower facades
    const trussYaw = Math.atan2(dx / span, dz / span);
    const trussMidY = (t.bottomY + t.topY) * 0.5;
    for (const endPt of [t.start, t.end]) {
      batcher.addBox(endPt.x, trussMidY, endPt.z, t.depth + 0.9, h + 0.8, 1.15, trussYaw, 'framing', 'bridge');
    }
  }
}
