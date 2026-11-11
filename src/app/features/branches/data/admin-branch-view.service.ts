import { Injectable } from '@angular/core';

/** Keeps an administrator's selected branch and display mode across existing pages. */
@Injectable({ providedIn: 'root' })
export class AdminBranchViewService {
  branchId = '';
  adminMode = true;

  selectBranch(branchId: string): void {
    this.branchId = branchId;
    this.adminMode = true;
  }
}
