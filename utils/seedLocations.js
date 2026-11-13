import State from '../models/State.js';
import City from '../models/City.js';
import Area from '../models/Area.js';
import { generateSlug } from './slugify.js';

export const autoSeedLocations = async () => {
  // Automatic location seeding disabled — database managed via admin panel/client data
  return;
};
