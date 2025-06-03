import { Injectable } from '@angular/core';
import { collection, doc, Firestore, getDocs, orderBy, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class BranchesService {

  private name = 'branches';
  private branchesInfo: any[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.name);
      const branchesInfo = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(branchesInfo)) {
        this.saveToLocal([]);
      } else {
        this.branchesInfo = branchesInfo;
      }
    }
  }

  private saveToLocal(data: any[]) {
    this.branchesInfo = data;
    localStorage.setItem(this.name, JSON.stringify(data));
  }

  getBranchesFromLocal(city: string) {
    return this.branchesInfo.find((item: any) => item.city === city);
  }


  compareDate(latestUpdate: Date, fetchedAt: Date): boolean {
    try {
      const fetchedDate = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
      return latestUpdate.getTime() > fetchedDate.getTime();
    } catch (error) {
      console.error("Error Compare branches Dates:", error);
      return false;
    }
  }



  addBranchesToLocal(branches: any, city: string) {
    this.branchesInfo.push({ city, branches });
    this.saveToLocal(this.branchesInfo);
  }

  updateBranchesInLocal(branches: any, city: string) {
    const index = this.branchesInfo.findIndex(
      (item: any) => item.city === city
    );

    const now = new Date();

    if (index !== -1) {
      this.branchesInfo[index].branches = branches;
      this.branchesInfo[index].fetchedAt = now;
    } else {
      this.branchesInfo.push({
        city,
        branches,
        fetchedAt: now
      });
    }

    this.saveToLocal(this.branchesInfo);
  }

  async getLastupdate(city: string, apiService: ApiService): Promise<{ id: string, updatedAt: Date } | false> {
    const constraints = [
      where("city", "==", city)
    ];

    const snapshot = await apiService.getData("branchUpdates", constraints);

    if (snapshot.empty) {
      const docRef = doc(collection(apiService.db, "branchUpdates"));

      const now = Timestamp.now();
      await setDoc(docRef, {
        city,
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

  async getBranches(city: string, branchUpdates: any, apiService: ApiService): Promise<any[]> {
    // const city = this.selectedOption;
    // const typeId = this.selectedType.id;

    const branchesInfo = this.getBranchesFromLocal(city);

    // this.productUpdates = await this.getLastupdate(city, typeId, apiService);

    // console.log("productUpdates2", this.productUpdates);
    // console.log("branchesInfo", branchesInfo);


    const shouldFetchFromServer = !branchesInfo || this.compareDate(branchUpdates.updatedAt, branchesInfo.fetchedAt);

    if (shouldFetchFromServer) {
      const q = query(
        collection(apiService.db, "branches"),
        where("city", '==', city)
      );

      const snapshot = await getDocs(q);

      const branches = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data()['name'],
        city: doc.data()['city'],
      }));

      this.updateBranchesInLocal(branches, city);
      console.log("branches get from server");
      return branches;
    } else {
      console.log("branches get from Local");
      return branchesInfo.branches;
    }
  }

}
