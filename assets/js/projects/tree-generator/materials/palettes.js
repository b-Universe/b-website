import { treeDarkenHex, treeLightenHex, treeMixHex, treeRandBetween, treeRng32 } from '../utils.js';

export const TREE_SEASON_PALETTES = {
  spring: {
    label: 'Spring',
    leaf1: '#4ea832',
    leaf2: '#82d159',
    bark: '#5c4028',
    accent: '#ffb3d9',
    snow: 0.22
  },
  summer: {
    label: 'Summer',
    leaf1: '#3b7a2e',
    leaf2: '#5a9e38',
    bark: '#5c4028',
    accent: '#d9f7be',
    snow: 0.0
  },
  autumn: {
    label: 'Autumn',
    leaf1: '#d45b18',
    leaf2: '#e89c1e',
    bark: '#4a3525',
    accent: '#ffd166',
    snow: 0.16
  },
  winter: {
    label: 'Winter',
    leaf1: '#2f5249',
    leaf2: '#466961',
    bark: '#422c1d',
    accent: '#eef7fc',
    snow: 0.68
  },
  blossom: {
    label: 'Sakura Blossom',
    leaf1: '#f48fb1',
    leaf2: '#ffc1e3',
    bark: '#3e2d31',
    accent: '#fff5f8',
    snow: 0.30
  },
  tropical: {
    label: 'Tropical Lush',
    leaf1: '#3fa32b',
    leaf2: '#76bf43',
    bark: '#755638',
    accent: '#f4d35e',
    snow: 0.0
  },
  arid: {
    label: 'Savanna Dry',
    leaf1: '#6a8e36',
    leaf2: '#92b34c',
    bark: '#7d6352',
    accent: '#e9d8a6',
    snow: 0.0
  },
  twilight: {
    label: 'Twilight Dusk',
    leaf1: '#264653',
    leaf2: '#2a9d8f',
    bark: '#33292a',
    accent: '#e76f51',
    snow: 0.12
  },
  arcane: {
    label: 'Arcane Glow',
    leaf1: '#00d4ff',
    leaf2: '#9d4edd',
    bark: '#232946',
    accent: '#e0fbfc',
    snow: 0.32
  },
  corrupted: {
    label: 'Shadow Blight',
    leaf1: '#3c096c',
    leaf2: '#7b2cbf',
    bark: '#1d1a24',
    accent: '#ff4d6d',
    snow: 0.18
  }
};

export function generateCoherentTreePalette(season = 'summer', seed = 1337, species = 'oak') {
  const base = TREE_SEASON_PALETTES[season] || TREE_SEASON_PALETTES.summer;
  const r = treeRng32(seed);
  const shift = treeRandBetween(r, 0.02, 0.14);
  const dir = r() > 0.5;

  let bark = base.bark;
  if (species === 'birch') bark = '#dcd6cd';
  else if (species === 'redwood') bark = '#6b3222';
  else if (species === 'cactus') bark = '#2f7339';
  else if (species === 'bamboo') bark = '#6ca644';
  else if (species === 'fantasy') bark = base.bark;
  else bark = dir ? treeLightenHex(base.bark, shift * 0.5) : treeDarkenHex(base.bark, shift * 0.5);

  const leaf1 = dir ? treeLightenHex(base.leaf1, shift) : treeDarkenHex(base.leaf1, shift);
  const leaf2 = treeMixHex(base.leaf2, leaf1, 0.25);

  return {
    leaf1,
    leaf2,
    bark,
    accent: base.accent,
    snow: base.snow
  };
}
