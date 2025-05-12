import { Injectable } from '@angular/core';
import { collection, doc, Firestore, getDocs, orderBy, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { ApiService } from './api.service';
import { collectionNames } from './Shareds';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  remove() {
    localStorage.removeItem(this.name);
  }

  private name = 'orders';
  private ordersInfo: any[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.name);
      const ordersInfo = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(ordersInfo)) {
        this.saveToLocal([]);
      } else {
        this.ordersInfo = ordersInfo;
      }
    }
  }

  private saveToLocal(data: any[]) {
    this.ordersInfo = data;
    localStorage.setItem(this.name, JSON.stringify(data));
  }

  getOrdersFromLocal(city: string, typeId: string) {
    const orderInfo = this.ordersInfo.find((item: any) => item.city === city && item.typeId === typeId);

    if (orderInfo && orderInfo.orders) {
      const updatedOrders = orderInfo.orders.map((item: any) => {
        if (item.createdAt && item.createdAt.seconds !== undefined) {
          return {
            ...item,
            createdAt: new Timestamp(item.createdAt.seconds, item.createdAt.nanoseconds),
          };
        } else {
          return item;
        }
      });

      return {
        ...orderInfo,
        orders: updatedOrders,
      };
    }

    return null;
  }

  async compareDate(city: string, typeId: string, fetchedAt: Date, apiService: ApiService): Promise<boolean> {
    try {
      const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
      const latestUpdate = await this.getLastupdate(city, typeId, apiService);

      if (!latestUpdate) {
        return false; // No update found in Firestore
      }

      return latestUpdate.updatedAt.getTime() > fetchedDate.getTime();

    } catch (error) {
      console.error("Error fetching product update info:", error);
      return false;
    }
  }

  compareDate2(latestUpdate: Date, fetchedAt: Date): boolean {
    try {
      const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
      // const latestUpdate = await this.getLastupdate(city, typeId, apiService);

      // if (!latestUpdate) {
      //   return false; // No update found in Firestore
      // }

      return latestUpdate.getTime() > fetchedDate.getTime();

    } catch (error) {
      console.error("Error fetching product update info:", error);
      return false;
    }
  }



  addOrderToLocal(orders: any, city: string, typeId: string) {
    this.ordersInfo.push({ city, typeId, orders });
    this.saveToLocal(this.ordersInfo);
  }

  updateOrderInLocal(orders: any, city: string, typeId: string) {
    const index = this.ordersInfo.findIndex(
      (item: any) => item.city === city && item.typeId === typeId
    );

    const now = new Date();

    if (index !== -1) {
      this.ordersInfo[index].orders = orders;
      this.ordersInfo[index].fetchedAt = now;
    } else {
      this.ordersInfo.push({
        city,
        typeId,
        orders,
        fetchedAt: now
      });
    }

    this.saveToLocal(this.ordersInfo);
  }

  async getLastupdate(city: string, typeId: string, apiService: ApiService): Promise<{ id: string, updatedAt: Date } | false> {
    const constraints = [
      where("city", "==", city),
      where("typeId", "==", typeId),
    ];

    const snapshot = await apiService.getData("orderUpdates", constraints);

    if (snapshot.empty) {
      const docRef = doc(collection(apiService.db, "orderUpdates"));

      const now = Timestamp.now();
      await setDoc(docRef, {
        city,
        typeId,
        updatedAt: now,
      });

      return {
        id: docRef.id,
        updatedAt: now.toDate(),
      };
    }

    // Get the most recent updatedAt and its document ID
    const sorted = snapshot.docs
      .map(doc => {
        const ts = doc.data()['updatedAt'];
        const updatedAt = ts instanceof Date ? ts : ts.toDate();
        return { id: doc.id, updatedAt };
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return sorted[0]; // { id, updatedAt }
  }

  async getOrders(city: string, typeId: string, branchId: any, orderUpdates: any, apiService: ApiService): Promise<any[]> {
    const ordersInfo = this.getOrdersFromLocal(city, typeId);

    console.log("ordersInfo", ordersInfo);
    console.log(orderUpdates);

    const shouldFetchFromServer = !ordersInfo || this.compareDate2(orderUpdates.updatedAt, ordersInfo.fetchedAt);

    if (shouldFetchFromServer) {
      var constraints = [];
      if (branchId) {
        constraints.push(where("branchId", "==", branchId))
      } else {
        constraints.push(where("city", "==", city))
      }
      constraints.push(where("typeId", "==", typeId))
      constraints.push(orderBy("createdAt", "desc"))


      const snapshot = await apiService.getData(collectionNames.orders, constraints)
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        branchId: doc.data()['branchId'],
        typeId: doc.data()['typeId'],
        status: doc.data()['status'],
        createdAt: doc.data()['createdAt']
      }));

      this.updateOrderInLocal(orders, city, typeId);
      console.log("orders get from server");
      return orders;
    } else {
      console.log("orders get from Local");
      return ordersInfo.orders;
    }
  }

}
