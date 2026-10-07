import { Injectable } from '@angular/core';
import { ApiService } from '../../../api.service';
import { collectionNames } from '../../../Shareds';
import { where } from 'firebase/firestore';

export interface BranchOrderType {
  id: string;
  name: string;
  name_en: string;
}

/** Read-only data access used by the branch page. */
@Injectable({ providedIn: 'root' })
export class BranchPageDataService {
  constructor(private readonly api: ApiService) {}

  /** Loads order types. This operation only reads the `types` collection. */
  async loadOrderTypes(): Promise<BranchOrderType[]> {
    const snapshot = await this.api.getData(collectionNames.types);
    return snapshot.docs.map(item => ({
      id: item.id,
      name: item.data()['name'],
      name_en: item.data()['name_en']
    }));
  }

  /** Loads dates enabled for creating a new branch order. */
  async loadAllowedOrderDates(typeId: string, city: string): Promise<{ id: string; createdAt: unknown }[]> {
    const constraints = [where('typeId', '==', typeId)];
    if (typeId === '6A64dQOXrkAOGIZYm2G1' || typeId === 'bt9w9ZB1H1IizPBugiUl') constraints.push(where('city', '==', city));
    const snapshot = await this.api.getData(collectionNames.openDates, constraints);
    return snapshot.docs.map(item => ({ id: item.id, createdAt: item.data()['createdAt'] }));
  }
}
