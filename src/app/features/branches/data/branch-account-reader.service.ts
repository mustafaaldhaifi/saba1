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
 * service only performs one read from `branches`; it does not cache or modify
 * the branch record.
 */
@Injectable({ providedIn: 'root' })
export class BranchAccountReaderService {
  constructor(private readonly api: ApiService) {}

  async findByAccountName(accountName: string): Promise<AccountBranch> {
    const normalizedName = accountName.charAt(0).toUpperCase() + accountName.slice(1).toLowerCase();
    const snapshot = await this.api.getData(collectionNames.branches, [
      where('name', '==', normalizedName),
      limit(1)
    ]);

    if (snapshot.empty) {
      throw new Error('No branch is linked to this account.');
    }

    const branch = snapshot.docs[0];
    return { id: branch.id, data: branch.data() };
  }
}
