export interface AppSettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export type AccountType = 'cash' | 'bank' | 'e_wallet' | 'credit_card' | 'savings';

export interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export type CategoryType = 'income' | 'expense' | 'saving' | 'investment' | 'debt' | 'custom';

export interface CategoryGroupRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  type: CategoryType;
  is_system: number;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  group_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
}

export type EntryType = 'income' | 'expense';

export type TransactionType = EntryType | 'transfer';
export type TransactionStatus = 'confirmed' | 'planned';

export interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  recurring_rule_id: string | null;
  occurrence_id: string | null;
  note: string | null;
  date: string;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
}

export type BudgetPeriodType = 'monthly' | 'weekly' | 'custom';

export interface BudgetRow {
  id: string;
  name: string;
  period_type: BudgetPeriodType;
  start_date: string;
  currency: string;
  total_budget?: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type AllocationRuleType = 'fixed' | 'percentage' | 'limit';

export interface BudgetAllocationRow {
  id: string;
  budget_id: string;
  category_id: string;
  rule_type: AllocationRuleType;
  amount: number | null;
  percentage: number | null;
  sort_order: number;
}

export type GoalType = 'saving' | 'debt_payoff' | 'investment' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export interface FinancialGoalRow {
  id: string;
  name: string;
  type: GoalType;
  icon: string | null;
  color: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  linked_category_id: string | null;
  linked_account_id: string | null;
  notes: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface GoalContributionRow {
  id: string;
  goal_id: string;
  amount: number;
  transaction_id: string | null;
  note: string | null;
  date: string;
  created_at: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type MonthEndBehavior = 'last_day' | 'skip';
export type OccurrenceBehavior = 'confirm' | 'auto_post';

export interface RecurringRuleRow {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  currency: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  day_of_month: number | null;
  day_of_week: number | null;
  month_end_behavior: MonthEndBehavior;
  start_date: string;
  end_date: string | null;
  behavior: OccurrenceBehavior;
  is_active: number;
  last_processed_date: string | null;
  created_at: string;
  updated_at: string;
}

export type OccurrenceStatus = 'pending' | 'posted' | 'skipped' | 'reversed';

export interface AutomationOccurrenceRow {
  id: string;
  recurring_rule_id: string;
  scheduled_date: string;
  transaction_id: string | null;
  status: OccurrenceStatus;
  processed_at: string | null;
}

export interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes_json: string | null;
  created_at: string;
}
