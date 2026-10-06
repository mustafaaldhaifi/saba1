import { Injectable } from '@angular/core';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';

/**
 * Reads the dashboard's order settings.
 *
 * Authorization: administrator dashboard only. Firestore: reads `settings/{typeId}`
 * and updates those same documents when an administrator changes a setting. It never
 * uses local storage. Errors are deliberately returned to the caller so the UI can
 * preserve its state.
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

  /** Updates `settings/{typeId}.isOpen` and returns its new value. */
  async toggleOrderOpenState(typeId: string): Promise<boolean> {
    const reference = doc(this.firebase.db, 'settings', typeId);
    const snapshot = await getDoc(reference);
    const currentValue = snapshot.exists() && snapshot.data()['isOpen'] === true;
    const nextValue = !currentValue;
    if (snapshot.exists()) {
      await updateDoc(reference, { isOpen: nextValue, updatedAt: serverTimestamp() });
    } else {
      await setDoc(reference, { isOpen: nextValue, createdAt: serverTimestamp() });
    }
    return nextValue;
  }

  /** Adds or removes a type ID from `settings/allowableEdits` and returns the new list. */
  async toggleAllowableEditTypeId(typeId: string): Promise<string[]> {
    const typeIds = await this.loadAllowableEditTypeIds();
    const nextTypeIds = typeIds.includes(typeId)
      ? typeIds.filter(id => id !== typeId)
      : [...typeIds, typeId];
    await setDoc(doc(this.firebase.db, 'settings', 'allowableEdits'), { typeIds: nextTypeIds }, { merge: true });
    return nextTypeIds;
  }
}
