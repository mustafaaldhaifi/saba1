import { Injectable } from '@angular/core';
import { collection, DocumentData, Firestore, getDocs, getFirestore, query, QueryConstraint, QuerySnapshot } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  db: Firestore

  constructor() {
    this.db = getFirestore();
  }

  async getData(collectionName: string, constraints: QueryConstraint[] = []): Promise<QuerySnapshot<DocumentData, DocumentData>> {
    const q = query(collection(this.db, collectionName), ...constraints);
    const snapshot = getDocs(q);
    return snapshot;
  }
}
