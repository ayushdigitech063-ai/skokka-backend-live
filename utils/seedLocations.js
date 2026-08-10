import State from '../models/State.js';
import City from '../models/City.js';
import Area from '../models/Area.js';
import { generateSlug } from './slugify.js';

export const autoSeedLocations = async () => {
  try {
    const stateCount = await State.countDocuments({ isDeleted: false });
    if (stateCount === 0) {
      console.log('🌱 Auto-seeding initial Indian Location hierarchy (States -> Cities -> Areas)...');

      // 1. Seed States
      const rajasthan = await State.create({ name: 'Rajasthan', code: 'RJ', slug: 'rajasthan', sortOrder: 1 });
      const delhi = await State.create({ name: 'Delhi', code: 'DL', slug: 'delhi', sortOrder: 2 });
      const maharashtra = await State.create({ name: 'Maharashtra', code: 'MH', slug: 'maharashtra', sortOrder: 3 });
      const karnataka = await State.create({ name: 'Karnataka', code: 'KA', slug: 'karnataka', sortOrder: 4 });
      const goa = await State.create({ name: 'Goa', code: 'GA', slug: 'goa', sortOrder: 5 });

      // 2. Seed Cities
      const jaipur = await City.create({ name: 'Jaipur', stateId: rajasthan._id, slug: 'jaipur', tier: 'Tier 2', isPopular: true, sortOrder: 1 });
      const udaipur = await City.create({ name: 'Udaipur', stateId: rajasthan._id, slug: 'udaipur', tier: 'Tier 2', isPopular: true, sortOrder: 2 });
      const delhiCity = await City.create({ name: 'Delhi', stateId: delhi._id, slug: 'delhi', tier: 'Tier 1', isPopular: true, sortOrder: 1 });
      const mumbai = await City.create({ name: 'Mumbai', stateId: maharashtra._id, slug: 'mumbai', tier: 'Tier 1', isPopular: true, sortOrder: 1 });
      const pune = await City.create({ name: 'Pune', stateId: maharashtra._id, slug: 'pune', tier: 'Tier 2', isPopular: true, sortOrder: 2 });
      const bangalore = await City.create({ name: 'Bangalore', stateId: karnataka._id, slug: 'bangalore', tier: 'Tier 1', isPopular: true, sortOrder: 1 });

      // 3. Seed Areas under Jaipur & Delhi & Mumbai
      await Area.create([
        { name: 'Bani Park', cityId: jaipur._id, stateId: rajasthan._id, slug: 'bani-park', pincode: '302016', isPopular: true },
        { name: 'Malviya Nagar', cityId: jaipur._id, stateId: rajasthan._id, slug: 'malviya-nagar', pincode: '302017', isPopular: true },
        { name: 'C-Scheme', cityId: jaipur._id, stateId: rajasthan._id, slug: 'c-scheme', pincode: '302001', isPopular: true },
        { name: 'Mansarovar', cityId: jaipur._id, stateId: rajasthan._id, slug: 'mansarovar', pincode: '302020' },
        { name: 'Vaishali Nagar', cityId: jaipur._id, stateId: rajasthan._id, slug: 'vaishali-nagar', pincode: '302021' },
        { name: 'Connaught Place', cityId: delhiCity._id, stateId: delhi._id, slug: 'connaught-place', pincode: '110001', isPopular: true },
        { name: 'South Extension', cityId: delhiCity._id, stateId: delhi._id, slug: 'south-extension', pincode: '110049', isPopular: true },
        { name: 'Bandra West', cityId: mumbai._id, stateId: maharashtra._id, slug: 'bandra-west', pincode: '400050', isPopular: true },
        { name: 'Juhu', cityId: mumbai._id, stateId: maharashtra._id, slug: 'juhu', pincode: '400049', isPopular: true },
        { name: 'Koramangala', cityId: bangalore._id, stateId: karnataka._id, slug: 'koramangala', pincode: '560034', isPopular: true },
      ]);

      console.log('✅ Initial Indian Location hierarchy successfully seeded into MongoDB Atlas!');
    }
  } catch (err) {
    console.error('Location seeding error:', err.message);
  }
};
