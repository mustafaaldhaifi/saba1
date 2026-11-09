import { Injectable } from '@angular/core';
import { limit, where } from 'firebase/firestore';
import { ApiService } from '../../../api.service';
import { collectionNames } from '../../../Shareds';

export interface AccountBranch {
  id: string;
  data: Record<string, unknown>;
}

/**
 * Reads the branch associated with a signed-in branch account.
 *
 * Authorization is performed by the caller's existing authentication flow. This
 * service reads `branches`; it does not cache or modify
 * the branch record.
 */
@Injectable({ providedIn: 'root' })
export class BranchAccountReaderService {
  constructor(private readonly api: ApiService) {}

  /**
   * Resolves an account through its immutable login key or legacy name.
   * 1. Find a current login key, then try a legacy name when needed.
   * 2. Reject missing or archived branches before returning their identity.
   */
  async findByAccountName(accountName: string): Promise<AccountBranch> {
    const normalizedName = accountName.charAt(0).toUpperCase() + accountName.slice(1).toLowerCase();
    // STEP 1: Preserve the existing email prefix when an administrator renames a branch.
    let snapshot = await this.api.getData(collectionNames.branches, [
      where('loginName', '==', normalizedName),
      limit(1)
    ]);
    if (snapshot.empty) snapshot = await this.api.getData(collectionNames.branches, [
      where('name', '==', normalizedName), limit(1)
    ]);

    // STEP 2: Archived accounts must not resolve to an active branch.
    if (snapshot.empty || snapshot.docs[0].data()['status'] === 'archived') {
      throw new Error('No branch is linked to this account.');
    }

    const branch = snapshot.docs[0];
    return { id: branch.id, data: branch.data() };
  }
}
