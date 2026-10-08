import { Inject, Injectable } from '@angular/core';
import { ApiService } from '../../../api.service';
import { OrdersService, OrderSummary, OrderUpdate } from '../../../orders.service copy';

export interface BranchPreOrdersResult {
  update: OrderUpdate;
  orders: OrderSummary[];
}

/** Loads cached or current pre-orders for one branch and order type. */
@Injectable({ providedIn: 'root' })
export class BranchPreOrdersReaderService {
  constructor(
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    private readonly api: ApiService
  ) {}

  async load(city: string, typeId: string, branchId: string): Promise<BranchPreOrdersResult> {
    const update = await this.ordersService.getLastupdate(city, typeId, this.api);
    const orders = await this.ordersService.getOrders(city, typeId, branchId, update, this.api);
    return { update, orders };
  }
}
