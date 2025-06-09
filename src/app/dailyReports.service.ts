import { Injectable } from '@angular/core';
import { collection, doc, Firestore, getDocs, orderBy, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { ApiService } from './api.service';
import { collectionNames } from './Shareds';

@Injectable({
  providedIn: 'root'
})
export class DailyReportsService {

  private name = 'dailyReport';
  private data: any[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.name);
      const data = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(data)) {
        this.saveToLocal([]);
      } else {
        this.data = data;
      }
    }
  }

  getLocalData(){
    return this.data;
  }

  saveToLocal(data: any[]) {
    this.data = data;
    localStorage.setItem(this.name, JSON.stringify(data));
  }

  getDataFromLocal(typeId: string, branchId: string, date: string) {
    return this.data.find((item: any) => item.typeId === typeId && item.branchId == branchId && item.date == date);
  }


  // compareDate(latestUpdate: Date, fetchedAt: Date): boolean {
  //   console.log('latestUpdate', latestUpdate);
  //   console.log('fetchedAt', fetchedAt);


  //   try {
  //     const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
  //     return latestUpdate.getTime() > fetchedDate.getTime();
  //   } catch (error) {
  //     console.error("Error Compare branches Dates:", error);
  //     return false;
  //   }
  // }

  compareDate(latestUpdate: Date, fetchedAt: Date): boolean {
    try {
      console.log('latestUpdate', latestUpdate);
      console.log('fetchedAt', fetchedAt);
      const latest = latestUpdate instanceof Date ? latestUpdate : new Date(latestUpdate);
      const fetched = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);

      console.log('latest', latest);
      console.log('fetched', fetched);

      console.log('latestUpdate:', latest.toISOString());
      console.log('fetchedAt:', fetched.toISOString());

      return latest.getTime() > fetched.getTime();
    } catch (error) {
      console.error("Error comparing dates:", error);
      return false;
    }
  }




  addDataToLocal(data: any, date: string, typeId: any, branchId: string) {
    const now = new Date();
    this.data.push({
      typeId: typeId,
      branchId: branchId,
      date,
      data,
      fetchedAt: now,
    });
    this.saveToLocal(this.data);
  }

  updateDataInLocal(data: any, date: string, typeId: any, branchId: string) {
    const index = this.data.findIndex(
      (item: any) => item.city == typeId && item.branchId == branchId
    );

    const now = new Date();

    if (index !== -1) {
      this.data[index].data = data;
      this.data[index].fetchedAt = now;
    } else {
      this.data.push({
        typeId: typeId,
        branchId: branchId,
        date: date,
        data,
        fetchedAt: now,
      });
    }

    this.saveToLocal(this.data);
  }

  async getLastupdate(branchId: string, date: Timestamp, apiService: ApiService): Promise<{ id: string, updatedAt: Date } | false> {
    const constraints = [
      where("date", "==", date),
      where("branchId", "==", branchId)

    ];

    const snapshot = await apiService.getData(collectionNames.dailyReportsUpdates, constraints);

    if (snapshot.empty) {
      const docRef = doc(collection(apiService.db, collectionNames.dailyReportsUpdates));

      const now = Timestamp.now();
      await setDoc(docRef, {
        branchId,
        date,
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

  normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  getDateKey(date: Date): string {
    const normalized = this.normalizeDate(date);
    return `${normalized.getFullYear()}-${normalized.getMonth() + 1}-${normalized.getDate()}`;
  }

  async getData(typeId: string, branchId: string, startOfDate: Date, endOfDate: Date, updates: any, apiService: ApiService): Promise<any[]> {

    // console.log(this.normalizeDate(startOfDate));

    const date = this.getDateKey(startOfDate)

    const data = this.getDataFromLocal(typeId, branchId, date);

    // console.log("compred", this.compareDate(updates.updatedAt, data.fetchedAt));
    console.log("date", date);
    console.log("data", data);



    const shouldFetchFromServer = !data || this.compareDate(updates.updatedAt, data.fetchedAt);

    if (shouldFetchFromServer) {
      const q = query(
        collection(apiService.db, collectionNames.dailyReports),
        where("branchId", "==", branchId),
        where("typeId", "==", typeId),
        where("date", ">=", Timestamp.fromDate(startOfDate)),
        where("date", "<=", Timestamp.fromDate(endOfDate)),
      );

      const snapshot = await getDocs(q);

      const dataFromServer = snapshot.docs.map(doc => ({
        id: doc.id,
        productId: doc.data()['productId'],
        branchId: doc.data()['branchId'],
        openingStockId: doc.data()['openingStockId'],
        openingStockQnt: doc.data()['openingStockQnt'],
        recieved: doc.data()['recieved'],
        add: doc.data()['add'],
        sales: doc.data()['sales'],
        staffMeal: doc.data()['staffMeal'],
        transfer: doc.data()['transfer'],
        dameged: doc.data()['dameged'],
        note: doc.data()['note'],

        closeStock: doc.data()['closeStock'],
      }));

      this.updateDataInLocal(dataFromServer, date, typeId, branchId);
      console.log(this.name + "get from server");
      return dataFromServer;
    } else {
      console.log(this.name + " get from Local");
      return data.data;
    }
  }

}
