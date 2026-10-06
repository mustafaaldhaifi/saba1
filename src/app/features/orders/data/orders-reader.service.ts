import { Injectable } from '@angular/core';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';

export interface BranchOrder {
  id: string;
  qnt: number;
  qntF: number;
  qntNotRequirement?: number;
  status: string;
  productId: string;
  branchId: string;
  cashValue: number;
  isCashEnabled: boolean;
}

/**
 * Reads branch orders for a dashboard date range.
 *
 * Authorization: administrator dashboard only. Firestore: reads `branchesOrders`
 * filtered by city, type, and inclusive timestamps, ordered by creation time. This
 * operation does not write Firestore or local storage; failures propagate to the caller.
 */
@Injectable({ providedIn: 'root' })
export class OrdersReaderService {
  constructor(private readonly firebase: FirebaseAppService) {}

  async loadForDateRange(city: string, typeId: string, start: Timestamp, end: Timestamp): Promise<BranchOrder[]> {
    const snapshot = await getDocs(query(
      collection(this.firebase.db, 'branchesOrders'),
      where('city', '==', city),
      where('typeId', '==', typeId),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end),
      orderBy('createdAt')
    ));
    return snapshot.docs.map(document => {
      const data = document.data();
      return {
        id: document.id,
        qnt: Number(data['qnt'] ?? 0),
        qntF: Number(data['qntF'] ?? 0),
        qntNotRequirement: typeof data['qntNotRequirement'] === 'number' ? data['qntNotRequirement'] : undefined,
        status: String(data['status'] ?? ''),
        productId: String(data['productId'] ?? ''),
        branchId: String(data['branchId'] ?? ''),
        cashValue: Number(data['cashValue'] ?? 0),
        isCashEnabled: data['isCashEnabled'] === true
      };
    });
  }
}
