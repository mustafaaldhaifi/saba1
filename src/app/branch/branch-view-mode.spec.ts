import { BranchComponent } from './branch.component';

describe('Branch stock columns by view mode', () => {
  let page: BranchComponent;

  beforeEach(() => {
    page = Object.create(BranchComponent.prototype) as BranchComponent;
    page.branch = { data: { hideDailyStockColumns: true } };
  });

  it('shows both stock columns to the administrator even when the branch hides them', () => {
    page.isAdmin = true;
    expect(page.hideDailyStockColumnsInTable).toBeFalse();
  });

  it('hides both stock columns in branch mode when the branch setting requests it', () => {
    page.isAdmin = false;
    expect(page.hideDailyStockColumnsInTable).toBeTrue();
  });

  it('preserves separate legacy column choices in branch mode', () => {
    page.isAdmin = false;
    page.branch = { data: { hideOpeningStockColumn: true, hideClosingStockColumn: false } };
    expect(page.hideDailyStockColumnsInTable).toBeFalse();
  });

  it('hides only the columns selected for a branch', () => {
    page.isAdmin = false;
    page.branch = { data: { dailyInventoryHiddenColumns: ['add', 'closeStock'] } };
    expect(page.isDailyColumnHidden('add')).toBeTrue();
    expect(page.isDailyColumnHidden('closeStock')).toBeTrue();
    expect(page.isDailyColumnHidden('recieved')).toBeFalse();
  });

  it('shows every column to the administrator', () => {
    page.isAdmin = true;
    page.branch = { data: { dailyInventoryHiddenColumns: ['add', 'closeStock'] } };
    expect(page.isDailyColumnHidden('add')).toBeFalse();
  });
});
