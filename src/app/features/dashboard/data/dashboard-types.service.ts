import { Injectable } from '@angular/core';
import { collection, getDocs, query } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';

/** A category of orders available from the dashboard filter. */
export interface DashboardOrderType {
  id: string;
  name: string;
  nameEn: string;
}

/**
 * Reads the order types shown in the dashboard filter.
 *
 * Authorization: admin dashboard only (the route guard protects this screen).
 * Firestore: reads the `types` collection only; it does not write data or use local storage.
 * Failure: callers receive the Firestore error and should keep their current screen state.
 */
@Injectable({ providedIn: 'root' })
export class DashboardTypesService {
  constructor(private readonly firebase: FirebaseAppService) {}

  async loadTypes(): Promise<DashboardOrderType[]> {
    const snapshot = await getDocs(query(collection(this.firebase.db, 'types')));
    return snapshot.docs.map(document => {
      const data = document.data();
      return {
        id: document.id,
        name: typeof data['name'] === 'string' ? data['name'] : '',
        nameEn: typeof data['name_en'] === 'string' ? data['name_en'] : ''
      };
    });
  }
}
