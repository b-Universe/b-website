import { INFRA_DEFAULTS } from '../config.js';
import { infraCopy, infraRound, infraVec2Dot, infraVec3Norm } from '../utils.js';

export function infraCreatePort(spec = {}) {
  const pos = Array.isArray(spec.pose?.position) ? spec.pose.position : [0, 0, 0];
  const tan = infraVec3Norm(spec.pose?.tangent || [0, 0, 1], [0, 0, 1]);
  const up = infraVec3Norm(spec.pose?.up || [0, 1, 0], [0, 1, 0]);

  return {
    id: String(spec.id || 'port_0'),
    ownerId: String(spec.ownerId || ''),
    domain: String(spec.domain || 'road'),
    profileId: String(spec.profileId || 'road_custom'),
    role: spec.role || 'bidirectional',
    elevationMode: spec.elevationMode || 'grade',
    pose: {
      position: [infraRound(pos[0], 4), infraRound(pos[1], 4), infraRound(pos[2], 4)],
      tangent: [infraRound(tan[0], 5), infraRound(tan[1], 5), infraRound(tan[2], 5)],
      up: [infraRound(up[0], 5), infraRound(up[1], 5), infraRound(up[2], 5)],
      elevationMeters: infraRound(spec.pose?.elevationMeters !== undefined ? spec.pose.elevationMeters : pos[1], 4)
    },
    widthMeters: infraRound(spec.widthMeters || 0, 4),
    drivableWidthMeters: infraRound(spec.drivableWidthMeters || spec.widthMeters || 0, 4),
    channels: Array.isArray(spec.channels) ? infraCopy(spec.channels) : [],
    clearanceEnvelopeId: spec.clearanceEnvelopeId || 'road_urban_transit',
    hangingClearance: spec.hangingClearance ? infraCopy(spec.hangingClearance) : null,
    compatibility: {
      allowWidthTransition: spec.compatibility?.allowWidthTransition !== false,
      maxElevationDeltaMeters: spec.compatibility?.maxElevationDeltaMeters ?? INFRA_DEFAULTS.portElevationToleranceMeters,
      maxYawMisalignmentDeg: spec.compatibility?.maxYawMisalignmentDeg ?? INFRA_DEFAULTS.portYawToleranceDeg,
      allowedTargetDomains: Array.isArray(spec.compatibility?.allowedTargetDomains)
        ? [...spec.compatibility.allowedTargetDomains]
        : [String(spec.domain || 'road')]
    },
    connectedTo: spec.connectedTo ? infraCopy(spec.connectedTo) : null
  };
}

export function infraBuildEdgePorts(edge, compiledProfile, startFrame, endFrame, nodePortMeta = {}) {
  const startTan = startFrame
    ? [-startFrame.tangent[0], -startFrame.tangent[1], -startFrame.tangent[2]] // Outward away from edge
    : [0, 0, -1];
  const endTan = endFrame
    ? [endFrame.tangent[0], endFrame.tangent[1], endFrame.tangent[2]]
    : [0, 0, 1];

  const buildChannels = (reverseDir) =>
    (compiledProfile?.channels || []).map((ch) => ({
      ...ch,
      offsetFromCenterMeters: reverseDir ? -ch.offsetFromCenterMeters : ch.offsetFromCenterMeters,
      direction: !reverseDir || ch.direction === 'bidirectional'
        ? ch.direction
        : (ch.direction === 'forward' ? 'backward' : 'forward')
    }));

  const startPos = startFrame ? startFrame.position : [0, 0, 0];
  const endPos = endFrame ? endFrame.position : [0, 0, 10];

  const startPort = infraCreatePort({
    id: `${edge.id}:port_start`,
    ownerId: edge.id,
    domain: edge.domain || compiledProfile?.domain || 'road',
    profileId: compiledProfile?.id || 'road_custom',
    role: 'bidirectional',
    elevationMode: edge.elevationMode || 'grade',
    pose: {
      position: startPos,
      tangent: startTan,
      up: startFrame?.up || [0, 1, 0],
      elevationMeters: startPos[1]
    },
    widthMeters: compiledProfile?.totalWidthMeters || 0,
    drivableWidthMeters: compiledProfile?.drivableWidthMeters || 0,
    channels: buildChannels(true),
    clearanceEnvelopeId: compiledProfile?.clearanceEnvelopeId || 'road_urban_transit',
    hangingClearance: compiledProfile?.hangingClearance || null,
    compatibility: {
      allowWidthTransition: true,
      allowedTargetDomains: [edge.domain || compiledProfile?.domain || 'road']
    },
    connectedTo: nodePortMeta.startConnectedTo || null
  });

  const endPort = infraCreatePort({
    id: `${edge.id}:port_end`,
    ownerId: edge.id,
    domain: edge.domain || compiledProfile?.domain || 'road',
    profileId: compiledProfile?.id || 'road_custom',
    role: 'bidirectional',
    elevationMode: edge.elevationMode || 'grade',
    pose: {
      position: endPos,
      tangent: endTan,
      up: endFrame?.up || [0, 1, 0],
      elevationMeters: endPos[1]
    },
    widthMeters: compiledProfile?.totalWidthMeters || 0,
    drivableWidthMeters: compiledProfile?.drivableWidthMeters || 0,
    channels: buildChannels(false),
    clearanceEnvelopeId: compiledProfile?.clearanceEnvelopeId || 'road_urban_transit',
    hangingClearance: compiledProfile?.hangingClearance || null,
    compatibility: {
      allowWidthTransition: true,
      allowedTargetDomains: [edge.domain || compiledProfile?.domain || 'road']
    },
    connectedTo: nodePortMeta.endConnectedTo || null
  });

  return { startPort, endPort };
}

export function infraCheckPortCompatibility(portA, portB, options = {}) {
  const reasons = [];
  if (!portA || !portB) {
    return { compatible: false, mode: 'invalid', reasons: ['Missing port descriptor'], metrics: {} };
  }

  const allowedA = portA.compatibility?.allowedTargetDomains || [portA.domain];
  const allowedB = portB.compatibility?.allowedTargetDomains || [portB.domain];
  if (portA.domain !== portB.domain && (!allowedA.includes(portB.domain) || !allowedB.includes(portA.domain))) {
    reasons.push(`Incompatible domains: "${portA.domain}" cannot splice directly to "${portB.domain}"`);
  }

  const elevModeA = portA.elevationMode || 'grade';
  const elevModeB = portB.elevationMode || 'grade';
  if (elevModeA !== elevModeB && !options.allowElevationModeTransition) {
    reasons.push(`Elevation mode mismatch: "${elevModeA}" cannot directly join "${elevModeB}" without a transition/ramp`);
  }

  const elevA = Number(portA.pose?.elevationMeters ?? portA.pose?.position?.[1] ?? 0);
  const elevB = Number(portB.pose?.elevationMeters ?? portB.pose?.position?.[1] ?? 0);
  const deltaY = Math.abs(elevA - elevB);
  const maxDeltaY = Math.min(
    portA.compatibility?.maxElevationDeltaMeters ?? INFRA_DEFAULTS.portElevationToleranceMeters,
    portB.compatibility?.maxElevationDeltaMeters ?? INFRA_DEFAULTS.portElevationToleranceMeters
  );
  if (deltaY > maxDeltaY + 1e-6) {
    reasons.push(`Elevation gap ${infraRound(deltaY, 3)}m exceeds port tolerance ${infraRound(maxDeltaY, 3)}m`);
  }

  // Rail gauge compatibility check (prepares railway/tram/monorail domains)
  const railA = (portA.channels || []).filter((c) => c.gaugeMeters !== undefined);
  const railB = (portB.channels || []).filter((c) => c.gaugeMeters !== undefined);
  if (railA.length && railB.length) {
    const gA = railA[0].gaugeMeters;
    const gB = railB[0].gaugeMeters;
    if (Math.abs(gA - gB) > 0.005) {
      reasons.push(`Track gauge mismatch: ${gA}m vs ${gB}m`);
    }
  }

  // Suspended guideway drop clearance compatibility
  if (portA.hangingClearance || portB.hangingClearance) {
    const hA = portA.hangingClearance?.dropHeightMeters;
    const hB = portB.hangingClearance?.dropHeightMeters;
    if (hA !== undefined && hB !== undefined && Math.abs(hA - hB) > 0.5) {
      reasons.push(`Suspended hanging envelope mismatch: ${hA}m vs ${hB}m`);
    }
  }

  // Tangent alignment check for direct splice (opposite outward tangents dot ~ -1)
  let alignmentDeg = 0;
  if (options.requireDirectSpliceAlignment) {
    const tA = [portA.pose.tangent[0], portA.pose.tangent[2]];
    const tB = [portB.pose.tangent[0], portB.pose.tangent[2]];
    const lenA = Math.hypot(tA[0], tA[1]) || 1;
    const lenB = Math.hypot(tB[0], tB[1]) || 1;
    const dot = infraVec2Dot([-tA[0] / lenA, -tA[1] / lenA], [tB[0] / lenB, tB[1] / lenB]);
    const clampedDot = Math.max(-1, Math.min(1, dot));
    alignmentDeg = Math.acos(clampedDot) * (180 / Math.PI);
    const maxYaw = Math.min(
      portA.compatibility?.maxYawMisalignmentDeg ?? INFRA_DEFAULTS.portYawToleranceDeg,
      portB.compatibility?.maxYawMisalignmentDeg ?? INFRA_DEFAULTS.portYawToleranceDeg
    );
    if (alignmentDeg > maxYaw) {
      reasons.push(`Yaw misalignment ${infraRound(alignmentDeg, 1)}deg exceeds direct splice limit ${maxYaw}deg (junction node required)`);
    }
  }

  const widthDiff = Math.abs((portA.widthMeters || 0) - (portB.widthMeters || 0));
  const mode = reasons.length > 0
    ? 'incompatible'
    : (widthDiff > 0.15 ? 'width_transition_needed' : 'exact_compatible');

  return {
    compatible: reasons.length === 0,
    mode,
    reasons,
    metrics: {
      deltaY: infraRound(deltaY, 4),
      widthDiff: infraRound(widthDiff, 4),
      alignmentDeg: infraRound(alignmentDeg, 2)
    }
  };
}
