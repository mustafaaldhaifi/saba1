import { Injectable } from '@angular/core';
import { ApiService } from '../../../api.service';
import { ProductsService } from '../../../products.service';

export interface InventoryProduct {
  id: string;
  name: string;
  unit: string;
  unitF?: string;
}

/**
 * Loads products for a city and order type.
 *
 * Authorization: caller-controlled. Firestore: reads `productUpdates` and, if the
 * cache is stale, `products`. The existing `products` local-storage cache is retained.
 * This operation is read-only and propagates failures to its caller.
 */
@Injectable({ providedIn: 'root' })
export class ProductsReaderService {
  constructor(
    private readonly products: ProductsService,
    private readonly api: ApiService
  ) {}

  async loadForCityAndType(city: string, typeId: string): Promise<InventoryProduct[]> {
    const update = await this.products.getLastupdate(city, typeId, this.api);
    return this.products.getProducts(city, typeId, update, this.api) as Promise<InventoryProduct[]>;
  }
}
