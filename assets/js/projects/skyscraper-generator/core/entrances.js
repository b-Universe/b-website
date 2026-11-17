import { roundNum } from '../utils.js';
import { B_UNITS_PER_METER } from '../config.js';

function entToBUnits(x, y, z) {
  return {
    x: roundNum(x * B_UNITS_PER_METER, 2),
    y: roundNum(-z * B_UNITS_PER_METER, 2),
    z: roundNum(y * B_UNITS_PER_METER, 2)
  };
}

export function computeSkyscraperEntrances(cfg, complex) {
  const entrances = [];
  const labelBase = String(cfg.interactionLabel || 'Enter Building Lobby').slice(0, 48);
  const radius = Number(cfg.interactionDistance) || 3.5;
  const podiumY = complex.podium?.height || 0;

  // Primary entrance per tower along front (+Z) street face
  for (const tower of complex.towers) {
    const b = tower.bounds;
    const baseSec = tower.stack.sections[0];
    const ex = tower.x + (baseSec?.offsetX || 0);
    const ez = b.maxZ + 0.35;
    const ey = Math.max(podiumY, tower.stack.baseElevation || 0);

    const doorWidth = Math.min(8.5, Math.max(3.6, b.width * 0.24));
    const doorHeight = Math.min(5.2, Math.max(3.4, (baseSec?.floorHeight || 4.2) * 0.9));

    entrances.push({
      id: `main_lobby_${tower.index}`,
      role: tower.index === 0 ? 'primary' : 'secondary_lobby',
      towerIndex: tower.index,
      style: cfg.entranceStyle || 'revolving_door',
      side: '+Z',
      interactive: cfg.entranceEnabled !== false,
      label: tower.index === 0 ? labelBase : `${labelBase} (${tower.index + 1})`,
      interactionRadius: radius,
      doorSize: { width: roundNum(doorWidth, 2), height: roundNum(doorHeight, 2) },
      position: { x: roundNum(ex, 3), y: roundNum(ey, 3), z: roundNum(ez, 3) },
      facing: { x: 0, y: 0, z: 1 },
      bGameUnits: {
        position: entToBUnits(ex, ey, ez),
        facing: { x: 0, y: -1, z: 0 }
      }
    });
  }

  // Optional connected central podium portal when dual+ towers share a deck
  if (complex.podium?.connected && complex.towers.length >= 2) {
    const px = complex.podium.centerX;
    const pz = complex.podium.centerZ + complex.podium.depth * 0.5 + 0.3;
    entrances.push({
      id: 'podium_concourse',
      role: 'podium_portal',
      towerIndex: -1,
      style: cfg.entranceStyle || 'glass_curtain_lobby',
      side: '+Z',
      interactive: cfg.entranceEnabled !== false,
      label: 'Enter Plaza Concourse',
      interactionRadius: radius,
      doorSize: { width: 6.4, height: 4.5 },
      position: { x: roundNum(px, 3), y: roundNum(podiumY, 3), z: roundNum(pz, 3) },
      facing: { x: 0, y: 0, z: 1 },
      bGameUnits: {
        position: entToBUnits(px, podiumY, pz),
        facing: { x: 0, y: -1, z: 0 }
      }
    });
  }

  // Service Loading Bay (-X or -Z)
  if (cfg.loadingBay) {
    const fb = complex.footprintBounds;
    const lx = fb.minX - 0.4;
    const lz = fb.centerZ - fb.depth * 0.15;
    entrances.push({
      id: 'service_loading_bay',
      role: 'service',
      towerIndex: 0,
      style: 'loading_dock',
      side: '-X',
      interactive: false,
      label: 'Service Loading Dock',
      interactionRadius: radius,
      doorSize: { width: 5.2, height: 4.0 },
      position: { x: roundNum(lx, 3), y: 0, z: roundNum(lz, 3) },
      facing: { x: -1, y: 0, z: 0 },
      bGameUnits: {
        position: entToBUnits(lx, 0, lz),
        facing: { x: -1, y: 0, z: 0 }
      }
    });
  }

  // Underground Parking Garage Ramp (+X)
  if (cfg.parkingEntrance) {
    const fb = complex.footprintBounds;
    const gx = fb.maxX + 0.4;
    const gz = fb.centerZ - fb.depth * 0.15;
    entrances.push({
      id: 'parking_garage_entry',
      role: 'parking',
      towerIndex: 0,
      style: 'garage_ramp',
      side: '+X',
      interactive: false,
      label: 'Parking Garage Entry',
      interactionRadius: radius,
      doorSize: { width: 6.0, height: 3.4 },
      position: { x: roundNum(gx, 3), y: 0, z: roundNum(gz, 3) },
      facing: { x: 1, y: 0, z: 0 },
      bGameUnits: {
        position: entToBUnits(gx, 0, gz),
        facing: { x: 1, y: 0, z: 0 }
      }
    });
  }

  return entrances;
}
