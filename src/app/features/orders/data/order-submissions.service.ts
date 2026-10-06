import { Injectable } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { ApiService } from '../../../api.service';
import { OrdersService } from '../../../orders.service copy';

export interface OrderSubmission {
  id: string;
  branchId: string;
  status: string;
  createdAt: Timestamp;
}

export interface OrderSubmissionGroup {
  createdAt: Timestamp;
  count: number;
  orders: OrderSubmission[];
}

/**
 * Loads and groups submitted orders for the dashboard date selector.
 *
 * Authorization: administrator dashboard only. Firestore and local storage use the
 * existing `orders` and `orderUpdates` cache policy. Grouping is in memory only and
 * this service never creates, updates, or deletes orders.
 */
@Injectable({ providedIn: 'root' })
export class OrderSubmissionsService {
  constructor(
    private readonly orders: OrdersService,
    private readonly api: ApiService
  ) {}

  async load(city: string, typeId: string): Promise<{ submissions: OrderSubmission[]; updateId?: string }> {
    const update = await this.orders.getLastupdate(city, typeId, this.api);
    const submissions = await this.orders.getOrders(city, typeId, null, update, this.api) as OrderSubmission[];
    return { submissions, updateId: update ? update.id : undefined };
  }

  groupByLocalDate(submissions: OrderSubmission[]): OrderSubmissionGroup[] {
    const groups = new Map<string, OrderSubmissionGroup>();
    for (const submission of submissions) {
      const date = submission.createdAt.toDate();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const group = groups.get(key) ?? { createdAt: Timestamp.fromDate(new Date(key)), count: 0, orders: [] };
      group.count += 1;
      group.orders.push(submission);
      groups.set(key, group);
    }
    return Array.from(groups.values());
  }
}
