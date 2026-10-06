import { Injectable } from '@angular/core';
import { collection, DocumentData, Firestore, getDocs, query, QueryConstraint, QuerySnapshot } from 'firebase/firestore';
import { FirebaseAppService } from './core/firebase/firebase-app.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly db: Firestore;
  constructor(firebase: FirebaseAppService) { this.db = firebase.db; }

  getData(collectionName: string, constraints: QueryConstraint[] = []): Promise<QuerySnapshot<DocumentData, DocumentData>> {
    return getDocs(query(collection(this.db, collectionName), ...constraints));
  }
}
