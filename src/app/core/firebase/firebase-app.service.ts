import { Injectable } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../../../env';

@Injectable({ providedIn: 'root' })
export class FirebaseAppService {
  readonly app = getApps().some(app => app.name === '[DEFAULT]')
    ? getApp() : initializeApp(environment.firebase);
  readonly db = getFirestore(this.app);
}
