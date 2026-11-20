import { rng32, pick, mixHex, darkenHex } from '../utils.js';
import { PALETTE_FAMILIES } from '../config.js';

export function generateCoherentPalette(paletteFamilyId, seed = 1024, roleVariant = 'civilian') {
  const r = rng32((seed >>> 0) || 1024);

  let familyKey = paletteFamilyId && PALETTE_FAMILIES[paletteFamilyId] ? paletteFamilyId : 'civilian_neutrals';
  if (roleVariant === 'taxi' && !paletteFamilyId) familyKey = 'taxi_palette';
  else if ((roleVariant === 'police' || roleVariant === 'ambulance' || roleVariant === 'fire') && !paletteFamilyId) familyKey = 'emergency_palette';
  else if (roleVariant === 'construction' && !paletteFamilyId) familyKey = 'construction_yellow';
  else if (roleVariant === 'postal' && !paletteFamilyId) familyKey = 'postal_municipal';
  else if (roleVariant === 'armored' && !paletteFamilyId) familyKey = 'muted_industrial';
  else if ((roleVariant === 'delivery' || roleVariant === 'service') && !paletteFamilyId) familyKey = 'service_utility';

  const fam = PALETTE_FAMILIES[familyKey] || PALETTE_FAMILIES.civilian_neutrals;
  const primary = pick(r, fam.primaries);
  const secondary = pick(r, fam.secondaries);
  const stripe = pick(r, fam.stripes);
  const darkTrim = pick(r, ['#1d2228', '#252a30', '#2d333b', '#191d22']);
  const rimTone = pick(r, ['#b7c0c8', '#c3ccd4', '#9aa4ae', '#adb6bf']);
  const glassTone = pick(r, ['#223545', '#1d2d3d', '#283d4e', '#1a2735']);

  const bodyPrimaryMaterial = familyKey === 'muted_industrial' || familyKey === 'retro_city'
    ? (r() > 0.45 ? 'matte_body' : 'painted_metal')
    : 'painted_metal';

  return {
    paletteFamily: familyKey,
    bodyPrimaryMaterial,
    bodyPrimaryColor: primary,
    bodySecondaryMaterial: r() > 0.45 ? 'painted_metal' : 'plastic_trim',
    bodySecondaryColor: secondary,
    trimMaterial: 'plastic_trim',
    trimColor: darkTrim,
    bumperMaterial: r() > 0.72 ? 'chrome_metal' : 'plastic_trim',
    bumperColor: r() > 0.72 ? '#bec7d0' : darkenHex(darkTrim, 0.08),
    wheelRimMaterial: r() > 0.5 ? 'chrome_metal' : 'utility_metal',
    wheelRimColor: rimTone,
    tireMaterial: 'dark_rubber',
    tireColor: '#1a1d21',
    glassMaterial: r() > 0.55 ? 'tinted_glass' : 'dark_glass',
    glassColor: glassTone,
    utilityMaterial: 'utility_metal',
    utilityColor: mixHex('#8d96a0', primary, 0.15),
    liveryStripeColor: stripe
  };
}
