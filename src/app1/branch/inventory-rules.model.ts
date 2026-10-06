// أنواع الإجراءات المتاحة
export type RuleAction = 'lock' | 'default_value' | 'max_value';

// 1. هيكل بيانات القفل Lock
export interface LockColumn {
  itemId: string;
  columns: string[]; // مثال: ["transfer", "staffMeal"]
}

export interface LockRulePayload {
  action: 'lock';
  dates: string[];
  branchIds: string[];
  items: LockColumn[];
  createdAt?: string;
  updatedAt?: string;
}

// 2. هيكل بيانات القيمة الافتراضية Default Value
export interface DefaultValueDetail {
  qnt: number;
  enabled: boolean;
}

export interface DefaultValueItem {
  itemId: string;
  columns: {
    staffMeal?: DefaultValueDetail;
    [key: string]: DefaultValueDetail | undefined;
  };
}

export interface DefaultValueRulePayload {
  action: 'default_value';
  dates: string[];
  branchIds: string[];
  items: DefaultValueItem[];
  createdAt?: string;
  updatedAt?: string;
}

// 3. هيكل بيانات الحد الأقصى Max Value
export interface MaxValueItem {
  itemId: string;
  columns: {
    dameged?: number;
    transfer?: number;
    staffMeal?: number;
    [key: string]: number | undefined;
  };
}

export interface MaxValueRulePayload {
  action: 'max_value';
  dates: string[];
  branchIds: string[];
  items: MaxValueItem[];
  createdAt?: string;
  updatedAt?: string;
}

// 1. واجهة منتج الكوتة
export interface QuotaProduct {
  productId: string;
  amount: number;
  used: number;
}

// 2. واجهة قاعدة الحصة الأسبوعية بالكامل
export interface WeeklyQuotaRule {
  id?: string;
  action: 'weekly_quota';
  branchId: string;
  name?: string;
  quotaGroupId?: string;
  createdAt?: any;
  updateAt?: string | Date; // تاريخ آخر تحديث ISO string أو Timestamp
  products: QuotaProduct[];
}

// Union Type للتعامل مع أي كائن قادم من الـ API
export type RulePayload = LockRulePayload | DefaultValueRulePayload | MaxValueRulePayload | WeeklyQuotaRule;