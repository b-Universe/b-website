import { INFRA_REGISTRY, infraRegisterFamily, infraRunRegisteredModules } from '../core/registry.js';
import { famBrgRegisterAll } from './bridges.js';
import { famElevRegisterAll } from './elevated-transit.js';
import { famFacRegisterAll } from './facilities.js';
import { famPedRegisterAll } from './pedestrian.js';
import { famRailRegisterAll } from './railways.js';
import { famRoadRegisterAll } from './roads.js';
import { famTunRegisterAll } from './tunnels.js';
import { famUtilRegisterAll } from './utilities.js';
import { famWatRegisterAll } from './waterways.js';

const PLANNED_FAMILIES = [];

export function infraEnsureRegistry() {
  if (INFRA_REGISTRY.initialized) return INFRA_REGISTRY;

  famRoadRegisterAll();
  famRailRegisterAll();
  famElevRegisterAll();
  famBrgRegisterAll();
  famPedRegisterAll();
  famTunRegisterAll();
  famWatRegisterAll();
  famUtilRegisterAll();
  famFacRegisterAll();

  for (const stub of PLANNED_FAMILIES) {
    infraRegisterFamily(stub);
  }

  infraRunRegisteredModules();
  INFRA_REGISTRY.initialized = true;
  return INFRA_REGISTRY;
}
