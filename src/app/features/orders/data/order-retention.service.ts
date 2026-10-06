import { Injectable } from '@angular/core';
import { collection, doc, getDocs, query, Timestamp, where, writeBatch } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';
import { OrderSubmissionGroup } from './order-submissions.service';

/**
 * Applies the legacy dashboard retention policy for submitted orders.
 *
 * Authorization: administrator dashboard only. Firestore: updates `orderUpdates`,
 * then permanently deletes `orders` and matching `branchesOrders` documents older than
 * the four most recent date groups. It does not affect local storage. Failures leave
 * the caller's in-memory list unchanged because the batch is committed atomically.
 */
@Injectable({ providedIn: 'root' })
export class OrderRetentionService {
  constructor(private readonly firebase: FirebaseAppService) {}

  async retainLatestFour(
    groups: OrderSubmissionGroup[],
    city: string,
    typeId: string,
    updateId: string
  ): Promise<OrderSubmissionGroup[]> {
    if (groups.length <= 4) return groups;

    const retained = groups.slice(0, 4);
    const expired = groups.slice(4);
    const batch = writeBatch(this.firebase.db);
    batch.update(doc(this.firebase.db, 'orderUpdates', updateId), { updatedAt: Timestamp.now() });

    for (const group of expired) {
      for (const order of group.orders) {
        batch.delete(doc(this.firebase.db, 'orders', order.id));
      }
      const day = group.createdAt.toDate();
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      const snapshot = await getDocs(query(
        collection(this.firebase.db, 'branchesOrders'),
        where('typeId', '==', typeId),
        where('city', '==', city),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      ));
      snapshot.forEach(document => batch.delete(document.ref));
    }
    await batch.commit();
    return retained;
  }
}
