import { Injectable } from '@angular/core';
import { collection, doc, orderBy, QueryConstraint, setDoc, Timestamp, where } from 'firebase/firestore';
import { ApiService } from './api.service';
import { collectionNames } from './Shareds';

export interface OrderSummary { id: string; branchId: string; typeId: string; status: string; createdAt: Timestamp; }
export interface OrderUpdate { id: string; updatedAt: Date; }
interface CachedOrders { city: string; typeId: string; orders: OrderSummary[]; fetchedAt: Date | string; }
interface SerializedTimestamp { seconds: number; nanoseconds: number; }

/**
 * Legacy-compatible order repository and cache.
 *
 * Reads `orderUpdates` and `orders`, creates a missing update marker, and maintains
 * only the `orders` local-storage cache. It never writes actual order records.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly storageKey = 'orders';
  private ordersInfo: CachedOrders[];

  constructor() { this.ordersInfo = this.readCache(); }

  remove(): void {
    this.ordersInfo = [];
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(this.storageKey); } catch { /* Storage may be unavailable. */ }
  }

  getOrdersFromLocal(city: string, typeId: string): CachedOrders | null {
    const entry = this.ordersInfo.find(item => item.city === city && item.typeId === typeId);
    return entry ? { ...entry, orders: entry.orders.map(order => ({ ...order, createdAt: this.toTimestamp(order.createdAt) })) } : null;
  }

  updateOrderInLocal(orders: OrderSummary[], city: string, typeId: string): void {
    const next: CachedOrders = { city, typeId, orders, fetchedAt: new Date() };
    const index = this.ordersInfo.findIndex(item => item.city === city && item.typeId === typeId);
    this.ordersInfo = index === -1 ? [...this.ordersInfo, next] : this.ordersInfo.map((item, i) => i === index ? next : item);
    this.saveCache();
  }

  async getLastupdate(city: string, typeId: string, api: ApiService): Promise<OrderUpdate> {
    const snapshot = await api.getData('orderUpdates', [where('city', '==', city), where('typeId', '==', typeId)]);
    if (snapshot.empty) {
      const reference = doc(collection(api.db, 'orderUpdates'));
      const now = Timestamp.now();
      await setDoc(reference, { city, typeId, updatedAt: now });
      return { id: reference.id, updatedAt: now.toDate() };
    }
    return snapshot.docs.map(document => ({ id: document.id, updatedAt: this.toDate(document.data()['updatedAt']) }))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];
  }

  async getOrders(city: string, typeId: string, branchId: string | null, update: OrderUpdate, api: ApiService): Promise<OrderSummary[]> {
    const cached = this.getOrdersFromLocal(city, typeId);
    if (cached && update.updatedAt.getTime() <= new Date(cached.fetchedAt).getTime()) return cached.orders;
    const constraints: QueryConstraint[] = [
      branchId ? where('branchId', '==', branchId) : where('city', '==', city),
      where('typeId', '==', typeId), orderBy('createdAt', 'desc')
    ];
    const snapshot = await api.getData(collectionNames.orders, constraints);
    const orders = snapshot.docs.map(document => {
      const data = document.data();
      return { id: document.id, branchId: String(data['branchId'] ?? ''), typeId: String(data['typeId'] ?? ''), status: String(data['status'] ?? ''), createdAt: this.toTimestamp(data['createdAt']) };
    });
    this.updateOrderInLocal(orders, city, typeId);
    return orders;
  }

  private readCache(): CachedOrders[] {
    if (typeof window === 'undefined') return [];
    try { const raw = localStorage.getItem(this.storageKey); const value: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(value) ? value as CachedOrders[] : []; } catch { return []; }
  }
  private saveCache(): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.ordersInfo)); } catch { /* Keep memory cache. */ }
  }
  private toDate(value: unknown): Date {
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
    return new Date(0);
  }
  private toTimestamp(value: unknown): Timestamp {
    if (value instanceof Timestamp) return value;
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) { const item = value as SerializedTimestamp; return new Timestamp(item.seconds, item.nanoseconds); }
    if (value instanceof Date) return Timestamp.fromDate(value);
    return Timestamp.fromDate(new Date(0));
  }
}
