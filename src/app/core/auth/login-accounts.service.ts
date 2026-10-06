import { Injectable } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { FirebaseAppService } from '../firebase/firebase-app.service';

@Injectable({ providedIn: 'root' })
export class LoginAccountsService {
  constructor(private readonly firebase: FirebaseAppService) {}

  async getAccountNames(): Promise<string[]> {
    // Keep the existing branch-name-to-email mapping. Rules must allow this read.
    const snapshot = await getDocs(collection(this.firebase.db, 'branches'));
    const names = snapshot.docs.map(doc => doc.data()['name'])
      .filter((name): name is string => typeof name === 'string' && !!name.trim());
    return [...new Set([...names, 'Admin'])];
  }
}
