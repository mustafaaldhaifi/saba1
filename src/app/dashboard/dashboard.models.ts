import { Timestamp } from 'firebase/firestore';

/** A branch shown in the dashboard grid. */
export interface DashboardBranch {
  id: string;
  name: string;
  order: number;
  city?: string;
}

/** A product displayed in reports and order grids. */
export interface DashboardProduct {
  id: string;
  name: string;
  unit: string;
  unitF?: string;
  parentProduct?: string;
  subProducts?: DashboardProduct[];
}

/** A read-only order cell in the dashboard. */
export interface DashboardOrder {
  id: string;
  branchId: string;
  productId: string;
  qnt: number;
  qntF?: number;
  status: string;
  cashValue?: number;
  isCashEnabled?: boolean;
  qntNotRequirement?: number;
}

/** An available date for creating or viewing orders. */
export interface OpenDate {
  id: string;
  typeId: string;
  createdAt: Timestamp;
  city?: string;
}

/** A submission summary grouped by its creation timestamp. */
export interface PreOrderGroup {
  createdAt: Timestamp;
  count: number;
  orders: Array<{ id: string; branchId: string; createdAt: Timestamp; status: string }>;
}
