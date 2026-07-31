import { ColumnConstraint } from './column-constraints.service';

export class ConstraintChecker {

  /**
   * فحص القفل للمنتج (سواء الرئيسي أو الفرعي)
   */
  static isLocked(
    constraints: ColumnConstraint[],
    selectedDate: string,
    branchId: string,
    itemId: string
  ): boolean {
    if (!constraints || constraints.length === 0) return false;

    return constraints.some((c) => {
      if (c.action !== 'lock') return false;

      // إذا كانت المصفوفة فارغة تعني "الكل"
      const matchDate = !c.dates || c.dates.length === 0 || c.dates.includes(selectedDate);
      const matchBranch = !c.branchIds || c.branchIds.length === 0 || c.branchIds.includes(branchId);
      const matchItem = !c.itemIds || c.itemIds.length === 0 || c.itemIds.includes(itemId);

      return matchDate && matchBranch && matchItem;
    });
  }

  /**
   * جلب القيمة الافتراضية
   */
  static getDefaultValue(
    constraints: ColumnConstraint[],
    selectedDate: string,
    branchId: string,
    itemId: string,
    columnName: string
  ): { qnt: number; enabled: boolean } | null {
    if (!constraints || constraints.length === 0) return null;

    for (const c of constraints) {
      if (c.action !== 'default_value' || !c.items) continue;

      const matchDate = !c.dates || c.dates.length === 0 || c.dates.includes(selectedDate);
      const matchBranch = !c.branchIds || c.branchIds.length === 0 || c.branchIds.includes(branchId);

      if (matchDate && matchBranch) {
        const itemConfig = c.items.find((i) => i.itemId === itemId);
        if (itemConfig && itemConfig.columns && itemConfig.columns[columnName]) {
          return itemConfig.columns[columnName];
        }
      }
    }

    return null;
  }
}