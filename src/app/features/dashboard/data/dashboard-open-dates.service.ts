import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, query, runTransaction, Timestamp, where } from 'firebase/firestore';
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
    }).sort((left, right) => left.createdAt.toMillis() - right.createdAt.toMillis());
  }

  /**
   * Adds an open date once for its order type and city scope.
   * 1. Check legacy documents created with random IDs for the same calendar date.
   * 2. Use a stable document ID so concurrent additions cannot create duplicates.
   */
  async addOpenDate(typeId: string, date: Date, city: string): Promise<DashboardOpenDate> {
    if (Number.isNaN(date.getTime())) throw new Error('Invalid date provided');
    // STEP 1: Include existing random-ID records in the duplicate check.
    const dateKey = date.toISOString().slice(0, 10);
    const existing = await this.loadOpenDates(typeId, city);
    if (existing.some(item => item.createdAt.toDate().toISOString().slice(0, 10) === dateKey)) {
      throw new Error('هذا التاريخ مضاف مسبقًا لنفس النوع والمدينة.');
    }
    // STEP 2: A stable ID prevents two simultaneous additions from making two records.
    const scope = this.citySpecificTypeIds.has(typeId) ? `${typeId}_${city}` : typeId;
    const reference = doc(this.firebase.db, 'openDates', `${encodeURIComponent(scope)}_${dateKey}`);
    const data: { typeId: string; createdAt: Timestamp; city?: string } = {
      typeId,
      createdAt: Timestamp.fromDate(date)
    };
    if (this.citySpecificTypeIds.has(typeId)) data.city = city;
    await runTransaction(this.firebase.db, async transaction => {
      if ((await transaction.get(reference)).exists()) throw new Error('هذا التاريخ مضاف مسبقًا لنفس النوع والمدينة.');
      transaction.set(reference, data);
    });
    return { id: reference.id, createdAt: data.createdAt };
  }

  deleteOpenDate(id: string): Promise<void> {
    return deleteDoc(doc(this.firebase.db, 'openDates', id));
  }
}
