import { infraRound } from '../utils.js';

function surfRibbonPolygonXZ(frames, xLeft, xRight) {
  if (!frames || frames.length < 2) return [];
  const leftSide = [];
  const rightSide = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    leftSide.push([
      infraRound(f.position[0] + f.right[0] * xLeft, 3),
      infraRound(f.position[2] + f.right[2] * xLeft, 3)
    ]);
    rightSide.push([
      infraRound(f.position[0] + f.right[0] * xRight, 3),
      infraRound(f.position[2] + f.right[2] * xRight, 3)
    ]);
  }
  return [...leftSide, ...rightSide.reverse()];
}

// Produces explicit terrain ownership operations and vegetation exclusion zones
// so future City Generator & terrain integrations never layer asphalt blindly over grass/terrain.
export function infraComputeSurfaceOwnership(doc, sampledEdgesById, profilesByEdgeId, solvedJunctions) {
  const terrainOperations = [];
  const vegetationZones = [];
  const surfaceRecords = [];

  for (const edge of doc.edges || []) {
    const samp = sampledEdgesById.get(edge.id);
    const prof = profilesByEdgeId.get(edge.id);
    if (!samp || !samp.frames || samp.frames.length < 2 || !prof) continue;

    const frames = samp.frames;
    const isElevated = edge.elevationMode === 'elevated' || edge.elevationMode === 'suspended' || edge.elevationMode === 'aerial';
    const isUnderground = edge.elevationMode === 'underground' || edge.familyId === 'tunnels';

    // Aggregate primary corridor footprint
    const minStripX = prof.strips[0]?.xLeft ?? -prof.halfWidthMeters;
    const maxStripX = prof.strips[prof.strips.length - 1]?.xRight ?? prof.halfWidthMeters;
    const avgY = frames.reduce((s, f) => s + f.position[1], 0) / frames.length;

    if (isUnderground) {
      terrainOperations.push({
        id: `top_excav_${edge.id}`,
        ownerId: edge.id,
        op: 'excavate_terrain',
        targetElevationMeters: infraRound(avgY, 3),
        clearHeightMeters: Number(edge.params?.clearHeightMeters) || 5.2,
        polygonXZ: surfRibbonPolygonXZ(frames, minStripX, maxStripX)
      });
      vegetationZones.push({
        id: `vz_tun_${edge.id}`,
        ownerId: edge.id,
        policy: avgY > -2.5 ? 'exclude' : 'inherit_surface',
        seasonPolicy: 'inherit_world',
        polygonXZ: surfRibbonPolygonXZ(frames, minStripX, maxStripX)
      });
    } else if (isElevated) {
      terrainOperations.push({
        id: `top_elev_${edge.id}`,
        ownerId: edge.id,
        op: 'elevated_clearance',
        deckElevationMeters: infraRound(avgY, 3),
        polygonXZ: surfRibbonPolygonXZ(frames, minStripX, maxStripX)
      });
      // Elevated structures allow grass below unless near ground, while excluding tall trees under low clearance
      if (avgY < 6.5) {
        vegetationZones.push({
          id: `vz_elev_${edge.id}`,
          ownerId: edge.id,
          policy: 'exclude_tall_canopy',
          seasonPolicy: 'inherit_world',
          maxHeightMeters: infraRound(Math.max(0.5, avgY - 1.2), 2),
          polygonXZ: surfRibbonPolygonXZ(frames, minStripX, maxStripX)
        });
      }
    } else {
      for (const strip of prof.strips) {
        const polyXZ = surfRibbonPolygonXZ(frames, strip.xLeft, strip.xRight);
        surfaceRecords.push({
          id: `surf_${edge.id}_${strip.id}`,
          ownerId: edge.id,
          stripKind: strip.kind,
          surfaceOwnership: strip.surfaceOwnership,
          elevationOffsetMeters: strip.elevationOffsetMeters
        });

        if (strip.surfaceOwnership === 'replace_terrain' || strip.surfaceOwnership === 'verge_transition' || strip.surfaceOwnership === 'excavate_terrain') {
          const depthOff = strip.surfaceOwnership === 'excavate_terrain' ? -(Number(edge.params?.channelDepthMeters) || 2.4) : strip.elevationOffsetMeters;
          terrainOperations.push({
            id: `top_${edge.id}_${strip.id}`,
            ownerId: edge.id,
            op: strip.surfaceOwnership,
            targetElevationMeters: infraRound(avgY + depthOff, 3),
            blendMarginMeters: strip.surfaceOwnership === 'verge_transition' ? 0.5 : 0.25,
            polygonXZ: polyXZ
          });
        }

        vegetationZones.push({
          id: `vz_${edge.id}_${strip.id}`,
          ownerId: edge.id,
          policy: strip.vegetationPolicy || 'exclude',
          seasonPolicy: 'inherit_world',
          polygonXZ: polyXZ
        });
      }
    }
  }

  for (const junc of solvedJunctions || []) {
    if (!junc.corePolygonXZ || junc.corePolygonXZ.length < 3) continue;
    const isElevated = junc.elevationMode === 'elevated' || junc.elevationMode === 'suspended';
    terrainOperations.push({
      id: `top_${junc.id}`,
      ownerId: junc.id,
      op: isElevated ? 'elevated_clearance' : 'replace_terrain',
      targetElevationMeters: infraRound(junc.position[1], 3),
      blendMarginMeters: 0.3,
      polygonXZ: junc.corePolygonXZ.map((p) => [infraRound(p[0], 3), infraRound(p[1], 3)])
    });
    if (!isElevated) {
      vegetationZones.push({
        id: `vz_${junc.id}`,
        ownerId: junc.id,
        policy: 'exclude',
        seasonPolicy: 'inherit_world',
        polygonXZ: junc.corePolygonXZ.map((p) => [infraRound(p[0], 3), infraRound(p[1], 3)])
      });
    }
  }

  return { terrainOperations, vegetationZones, surfaceRecords };
}
