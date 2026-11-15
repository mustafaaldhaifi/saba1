import { Injectable } from '@angular/core';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';

@Injectable({ providedIn: 'root' })
export class SurveyBanService {
  constructor(private readonly firebase: FirebaseAppService) {}

  /**
   * Records a missed survey once and returns the branch's current ban message.
   * 1. Read the branch, catalog item, and deterministic history record.
   * 2. Preserve a cleared ban or existing ban; otherwise write the item, history, and status together.
   */
  async applyMissedSurveyBan(branchId: string, surveyId: string, title: string, occurrenceDate: string, eventKey = ''): Promise<string | null> {
    // STEP 1: Identify one occurrence, including a later expired access grant.
    const itemId = `survey_${surveyId}`;
    const historyId = `${branchId}__${itemId}__${occurrenceDate}${eventKey ? `__${eventKey}` : ''}`;
    const branchRef = doc(this.firebase.db, 'branches', branchId);
    const itemRef = doc(this.firebase.db, 'banItems', itemId);
    const historyRef = doc(this.firebase.db, 'bansHistory', historyId);
    const message = `تأخر الاستبيان «${title}» بتاريخ ${occurrenceDate}`;
    return runTransaction(this.firebase.db, async transaction => {
      const [branch, item, history] = await Promise.all([
        transaction.get(branchRef), transaction.get(itemRef), transaction.get(historyRef)
      ]);
      if (!branch.exists() || branch.data()['status'] === 'archived') throw new Error('الفرع غير متاح.');
      const current = branch.data()['ban'];
      // STEP 2: A historical record prevents the same event from re-banning after an administrator clears it.
      if (typeof current === 'string') return current;
      if (history.exists()) return null;
      if (!item.exists()) transaction.set(itemRef, { type: 'survey', title });
      transaction.update(branchRef, { ban: message });
      transaction.set(historyRef, { branchId, banItemId: itemId, message, bannedAt: serverTimestamp() });
      return message;
    });
  }
}
