import { Injectable } from '@angular/core';
import { doc, getDoc } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';

/**
 * Reads the dashboard's order settings.
 *
 * Authorization: administrator dashboard only. Firestore: reads `settings/{typeId}`
 * and `settings/allowableEdits`; it does not write data or use local storage.
 * Errors are deliberately returned to the caller so the UI can preserve its state.
 */
@Injectable({ providedIn: 'root' })
export class DashboardSettingsService {
  constructor(private readonly firebase: FirebaseAppService) {}

  async loadOrderOpenState(typeId: string): Promise<boolean | null> {
    const snapshot = await getDoc(doc(this.firebase.db, 'settings', typeId));
    if (!snapshot.exists()) return null;
    const value = snapshot.data()['isOpen'];
    return typeof value === 'boolean' ? value : null;
  }

  async loadAllowableEditTypeIds(): Promise<string[]> {
    const snapshot = await getDoc(doc(this.firebase.db, 'settings', 'allowableEdits'));
    if (!snapshot.exists()) return [];
    const value = snapshot.data()['typeIds'];
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  }
}
