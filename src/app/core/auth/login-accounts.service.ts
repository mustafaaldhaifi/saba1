import { Injectable } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { FirebaseAppService } from '../firebase/firebase-app.service';

@Injectable({ providedIn: 'root' })
export class LoginAccountsService {
  constructor(private readonly firebase: FirebaseAppService) {}

  async getAccountNames(): Promise<string[]> {
    // New accounts use an immutable login key; older records use their branch name.
    const snapshot = await getDocs(collection(this.firebase.db, 'branches'));
    const names = snapshot.docs.filter(doc => doc.data()['status'] !== 'archived')
      .map(doc => doc.data()['loginName'] || doc.data()['name'])
      .filter((name): name is string => typeof name === 'string' && !!name.trim());
    return [...new Set([...names, 'Admin'])];
  }
}
