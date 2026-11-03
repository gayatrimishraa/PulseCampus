import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { CampusBuilding } from '@/types/models';

const buildingsCollection = collection(db, 'buildings');

export async function getBuildings(): Promise<CampusBuilding[]> {
  const buildingsQuery = query(
    buildingsCollection,
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(buildingsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as CampusBuilding[];
}