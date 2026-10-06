import { Injectable } from '@angular/core';
import { ApiService } from '../../../api.service';
import { BranchesService } from '../../../branches.service';

export interface BranchSummary {
  id: string;
  name: string;
  order: number;
  city?: string;
}

/**
 * Loads branches for a city while preserving the existing Firestore-update and local-cache policy.
 *
 * Authorization: callers must already be authenticated. Firestore: reads `branchUpdates` and,
 * when stale, `branches`; the legacy cache is stored under `branches` in local storage. This
 * operation does not modify branch records. Errors are propagated to the caller.
 */
@Injectable({ providedIn: 'root' })
export class BranchesReaderService {
  constructor(
    private readonly branches: BranchesService,
    private readonly api: ApiService
  ) {}

  async loadForCity(city: string): Promise<BranchSummary[]> {
    const update = await this.branches.getLastupdate(city, this.api);
    return this.branches.getBranches(city, update, this.api) as Promise<BranchSummary[]>;
  }
}
