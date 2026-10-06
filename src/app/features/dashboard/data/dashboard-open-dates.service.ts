import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';

export interface DashboardOpenDate {
  id: string;
  createdAt: Timestamp;
}

/**
 * Manages dates opened for dashboard order types.
 *
 * Authorization: administrator dashboard only. Firestore: reads, creates and deletes
 * documents in `openDates`; it never uses local storage. The two legacy type IDs below
 * are scoped to a city to preserve the existing business rule. Callers receive errors
 * so the UI can keep its previous state and show an appropriate failure message.
 */
@Injectable({ providedIn: 'root' })
export class DashboardOpenDatesService {
  private readonly citySpecificTypeIds = new Set([
    '6A64dQOXrkAOGIZYm2G1',
    'bt9w9ZB1H1IizPBugiUl'
  ]);

  constructor(private readonly firebase: FirebaseAppService) {}

  async loadOpenDates(typeId: string, city: string): Promise<DashboardOpenDate[]> {
    const conditions = [where('typeId', '==', typeId)];
    if (this.citySpecificTypeIds.has(typeId)) conditions.push(where('city', '==', city));
    const snapshot = await getDocs(query(collection(this.firebase.db, 'openDates'), ...conditions));
    return snapshot.docs.flatMap(document => {
      const createdAt = document.data()['createdAt'];
      return createdAt instanceof Timestamp ? [{ id: document.id, createdAt }] : [];
    });
  }

  async addOpenDate(typeId: string, date: Date, city: string): Promise<DashboardOpenDate> {
    if (Number.isNaN(date.getTime())) throw new Error('Invalid date provided');
    const reference = doc(collection(this.firebase.db, 'openDates'));
    const data: { typeId: string; createdAt: Timestamp; city?: string } = {
      typeId,
      createdAt: Timestamp.fromDate(date)
    };
    if (this.citySpecificTypeIds.has(typeId)) data.city = city;
    await setDoc(reference, data);
    return { id: reference.id, createdAt: data.createdAt };
  }

  deleteOpenDate(id: string): Promise<void> {
    return deleteDoc(doc(this.firebase.db, 'openDates', id));
  }
}
