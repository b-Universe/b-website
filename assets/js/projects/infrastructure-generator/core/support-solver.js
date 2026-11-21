import { INFRA_DEFAULTS } from '../config.js';
import { infraRound, infraVec2Dist } from '../utils.js';

function suppIsFootingClearOfLowerEdges(x, z, footingRadius, edgeId, sampledEdgesById, profilesByEdgeId, yTop) {
  for (const [otherId, samp] of sampledEdgesById.entries()) {
    if (otherId === edgeId || !samp?.frames?.length) continue;
    const otherProf = profilesByEdgeId.get(otherId);
    const otherHalfW = (otherProf?.drivableWidthMeters || 6.4) * 0.5 + footingRadius + 0.9;

    for (let i = 0; i < samp.frames.length; i++) {
      const fp = samp.frames[i].position;
      if (fp[1] >= yTop - 1.5) continue;
      if (infraVec2Dist([x, z], [fp[0], fp[2]]) < otherHalfW) {
        return false;
      }
    }
  }
  return true;
}

export function infraSolveSupports(doc, sampledEdgesById, profilesByEdgeId) {
  const supports = [];
  let idx = 1;

  for (const edge of doc.edges || []) {
    const samp = sampledEdgesById.get(edge.id);
    const prof = profilesByEdgeId.get(edge.id);
    if (!samp || !samp.frames || samp.frames.length < 2 || !prof) continue;

    const frames = samp.frames;
    const isSelfSupportedBridge = edge.familyId === 'bridges' && edge.params?.bridgeType && edge.params.bridgeType !== 'box_girder';
    if (
      isSelfSupportedBridge ||
      edge.elevationMode === 'underground' ||
      edge.elevationMode === 'aerial' ||
      edge.familyId === 'tunnels' ||
      edge.familyId === 'utilities' ||
      edge.familyId === 'waterways' ||
      edge.familyId === 'pedestrian'
    ) {
      continue;
    }

    const startY = frames[0].position[1];
    const endY = frames[frames.length - 1].position[1];
    const maxY = Math.max(...frames.map((f) => f.position[1]));
    const isSuspended = edge.elevationMode === 'suspended' || edge.domain === 'suspended_rail';
    const isElevatedOrSloped =
      isSuspended ||
      edge.elevationMode === 'elevated' ||
      maxY > 0.75;

    if (!isElevatedOrSloped) continue;

    const spacing = Math.max(8.0, Number(edge.params?.supportSpacing) || INFRA_DEFAULTS.defaultSupportSpacingMeters);
    const deckThickness = Number(prof.understructure?.deckThicknessMeters) || INFRA_DEFAULTS.deckThicknessMeters;
    const guidewayDepth = Number(edge.params?.guidewayDepth) || 1.75;
    const len = samp.trimmedLengthMeters || samp.lengthMeters;
    const edgeMargin = Math.min(3.5, len * 0.16);
    const hasStation = Boolean(edge.params?.includeStation);

    if (len < 3.0) continue;

    // Place abutment at grade-to-elevated transition ends where y in [0.45 .. 1.6]
    if (!isSuspended) {
      for (const ep of [{ f: frames[0] }, { f: frames[frames.length - 1] }]) {
        if (ep.f.position[1] >= 0.45 && ep.f.position[1] <= 1.75) {
          supports.push({
            id: `supp_${idx++}`,
            edgeId: edge.id,
            kind: 'abutment',
            style: 'abutment_wall',
            position: [infraRound(ep.f.position[0], 3), 0, infraRound(ep.f.position[2], 3)],
            tangent: [...ep.f.tangent],
            right: [...ep.f.right],
            topY: infraRound(Math.max(0.2, ep.f.position[1] - deckThickness * 0.5), 3),
            groundY: 0,
            spanWidthMeters: prof.totalWidthMeters,
            columnRadius: 0.45,
            clearOfCrossings: true,
            grounded: true
          });
        }
      }
    }

    const usableSpan = len - edgeMargin * 2;
    const count = Math.max(1, Math.round(usableSpan / spacing));
    const stepS = usableSpan / Math.max(1, count);

    for (let k = 0; k <= count; k++) {
      const targetS = samp.trimStartMeters + edgeMargin + k * stepS;
      let bestFrame = frames[0];
      let bestDiff = Infinity;
      for (const f of frames) {
        const diff = Math.abs(f.s - targetS);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestFrame = f;
        }
      }

      // Skip station core span since the station assembly provides grounded portal columns
      if (hasStation && bestFrame.u >= 0.30 && bestFrame.u <= 0.70) {
        continue;
      }

      const rawTopY = isSuspended
        ? bestFrame.position[1] + guidewayDepth * 0.65
        : bestFrame.position[1] - deckThickness * 0.85;
      if (!isSuspended && rawTopY <= 0.75) continue;

      const requestedStyle = edge.params?.supportStyle || (isSuspended ? 'a_frame_wuppertal' : 'double_pier');
      let chosenStyle = requestedStyle;
      let chosenFrame = bestFrame;
      let clearOfCrossings = true;
      let customStraddleHalf = null;

      const getOffsets = (style, straddleHalfOverride = null) => {
        if (style === 'single_pier' || style === 't_pylon' || style === 'y_pylon') return [0];
        if (style === 'cantilever_l') return [-Math.max(2.6, prof.totalWidthMeters * 0.46)];
        if (style === 'a_frame_wuppertal' || style === 'steel_lattice_portal' || style === 'straddle_portal') {
          const hw = straddleHalfOverride || Math.max(4.4, prof.totalWidthMeters * 0.58 + 1.4);
          return [-hw, hw];
        }
        const pierOffset = prof.totalWidthMeters * 0.34;
        return [-pierOffset, pierOffset];
      };

      const checkFrame = (fr, offsets) =>
        offsets.every((lat) =>
          suppIsFootingClearOfLowerEdges(
            fr.position[0] + fr.right[0] * lat,
            fr.position[2] + fr.right[2] * lat,
            0.75,
            edge.id,
            sampledEdgesById,
            profilesByEdgeId,
            fr.position[1]
          )
        );

      const initOffsets = getOffsets(chosenStyle);
      if (!checkFrame(chosenFrame, initOffsets)) {
        let shifted = false;
        for (const f of frames) {
          if (Math.abs(f.s - bestFrame.s) > spacing * 0.35) continue;
          if (!isSuspended && f.position[1] - deckThickness * 0.85 <= 0.75) continue;
          if (hasStation && f.u >= 0.30 && f.u <= 0.70) continue;
          if (checkFrame(f, initOffsets)) {
            chosenFrame = f;
            shifted = true;
            break;
          }
        }
        if (!shifted) {
          // Escalate / widen straddle portal outside lower roadway corridor
          const wideHalf = Math.max(prof.totalWidthMeters * 0.5 + 3.4, 7.6);
          if (checkFrame(chosenFrame, [-wideHalf, wideHalf])) {
            customStraddleHalf = wideHalf;
            if (chosenStyle !== 'a_frame_wuppertal' && chosenStyle !== 'steel_lattice_portal') {
              chosenStyle = 'straddle_portal';
            }
          } else {
            clearOfCrossings = false;
          }
        }
      }

      const finalTopY = isSuspended
        ? chosenFrame.position[1] + guidewayDepth * 0.65
        : chosenFrame.position[1] - deckThickness * 0.85;

      const finalSpanW = customStraddleHalf
        ? infraRound(customStraddleHalf * 2.1, 3)
        : (chosenStyle === 'a_frame_wuppertal' || chosenStyle === 'steel_lattice_portal' || chosenStyle === 'straddle_portal')
          ? infraRound(Math.max(prof.totalWidthMeters + 3.4, 9.2), 3)
          : prof.totalWidthMeters;

      supports.push({
        id: `supp_${idx++}`,
        edgeId: edge.id,
        kind: 'pier',
        style: chosenStyle,
        isSuspendedSupport: isSuspended,
        guidewayDepth,
        stationT: chosenFrame.t,
        position: [infraRound(chosenFrame.position[0], 3), 0, infraRound(chosenFrame.position[2], 3)],
        tangent: [...chosenFrame.tangent],
        right: [...chosenFrame.right],
        topY: infraRound(finalTopY, 3),
        guidewayCenterY: infraRound(chosenFrame.position[1], 3),
        groundY: 0,
        spanWidthMeters: finalSpanW,
        columnRadius: chosenStyle === 'single_pier' || chosenStyle === 't_pylon' || chosenStyle === 'y_pylon' ? 0.65 : 0.42,
        clearOfCrossings,
        grounded: true,
        startY: infraRound(startY, 2),
        endY: infraRound(endY, 2)
      });
    }
  }

  return supports;
}
