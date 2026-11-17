import { registerAutomotiveFamilies } from './automotive.js';
import './food-hospitality.js';
import './entertainment-recreation.js';
import './retail-shopping.js';
import './civic-government.js';
import './healthcare.js';
import './lodging.js';
import './industrial-utilities.js';
import { getAllSpecialtyFamilies } from '../core/registry.js';

let initialized = false;

export function ensureSpecialtyBuildingRegistry() {
  if (!initialized) {
    registerAutomotiveFamilies();
    initialized = true;
  }
  return getAllSpecialtyFamilies();
}
