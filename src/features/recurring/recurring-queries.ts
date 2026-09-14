import { getDatabase } from '@/database/database';
import {
  AutomationOccurrenceRow,
  EntryType,
  RecurringRuleRow,
  TransactionType,
} from '@/database/types';
import { createTransaction } from '@/features/transactions/transaction-queries';
import { MonthlyLimitExceededError } from '@/features/budgets/monthly-limits';
import { formatDateISO } from '@/shared/date-utils';
import { generateUUID } from '@/shared/uuid';
import { calculateDueOccurrences } from './recurring-engine';

export interface RecurringRuleWithDetails extends RecurringRuleRow {
  account_name: string;
  category_name?: string | null;
}

export interface PendingOccurrenceWithRule extends AutomationOccurrenceRow {
  rule_name: string;
  rule_type: string;
  rule_amount: number;
  rule_currency: string;
  account_id: string;
  account_name: string;
  category_id: string | null;
  category_name: string | null;
}

export async function getAllRecurringRules(): Promise<RecurringRuleWithDetails[]> {
  const db = getDatabase();
  const rules = await db.getAllAsync<RecurringRuleWithDetails>(
    `SELECT rr.*, a.name as account_name, c.name as category_name
     FROM recurring_rules rr
     JOIN accounts a ON a.id = rr.account_id
     LEFT JOIN categories c ON c.id = rr.category_id
     ORDER BY rr.created_at DESC;`
  );
  return rules.filter((rule) => rule.type !== 'transfer');
}

export async function createRecurringRule(data: {
  name: string;
  type: TransactionType;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  monthEndBehavior?: 'last_day' | 'skip';
  startDate: string;
  endDate?: string | null;
  behavior?: 'auto_post' | 'confirm';
}): Promise<RecurringRuleRow> {
  if (data.type !== 'income' && data.type !== 'expense') {
    throw new Error('Transfers are no longer supported.');
  }
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO recurring_rules (
       id, name, type, amount, currency, account_id, to_account_id, category_id,
       frequency, interval, day_of_month, day_of_week, month_end_behavior,
       start_date, end_date, behavior, is_active, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
    [
      id,
      data.name,
      data.type,
      data.amount,
      data.currency,
      data.accountId,
      null,
      data.categoryId || null,
      data.frequency,
      data.interval ?? 1,
      data.dayOfMonth ?? null,
      data.dayOfWeek ?? null,
      data.monthEndBehavior || 'last_day',
      data.startDate,
      data.endDate || null,
      data.behavior || 'confirm',
      now,
      now,
    ]
  );

  const created = await db.getFirstAsync<RecurringRuleRow>(
    `SELECT * FROM recurring_rules WHERE id = ?;`,
    [id]
  );
  if (!created) throw new Error('Failed to create recurring rule');
  return created;
}

export async function getPendingOccurrences(): Promise<PendingOccurrenceWithRule[]> {
  const db = getDatabase();
  const occurrences = await db.getAllAsync<PendingOccurrenceWithRule>(
    `SELECT ao.*, rr.name as rule_name, rr.type as rule_type, rr.amount as rule_amount,
            rr.currency as rule_currency, rr.account_id, a.name as account_name,
            rr.category_id, c.name as category_name
     FROM automation_occurrences ao
     JOIN recurring_rules rr ON rr.id = ao.recurring_rule_id
     JOIN accounts a ON a.id = rr.account_id
     LEFT JOIN categories c ON c.id = rr.category_id
     WHERE ao.status = 'pending'
     ORDER BY ao.scheduled_date ASC;`
  );
  return occurrences.filter((occurrence) => occurrence.rule_type !== 'transfer');
}

export async function confirmOccurrence(occurrenceId: string, monthlyLimitApproval?: string): Promise<void> {
  const db = getDatabase();
  const occurrence = await db.getFirstAsync<AutomationOccurrenceRow>(
    `SELECT * FROM automation_occurrences WHERE id = ? AND status = 'pending';`,
    [occurrenceId]
  );
  if (!occurrence) return;

  const rule = await db.getFirstAsync<RecurringRuleRow>(
    `SELECT * FROM recurring_rules WHERE id = ?;`,
    [occurrence.recurring_rule_id]
  );
  if (!rule || rule.type === 'transfer') return;

  await createTransaction({
    type: rule.type as EntryType,
    amount: rule.amount,
    currency: rule.currency,
    accountId: rule.account_id,
    categoryId: rule.category_id || undefined,
    recurringRuleId: rule.id,
    occurrenceId: occurrence.id,
    date: occurrence.scheduled_date,
    note: `Định kỳ: ${rule.name}`,
    monthlyLimitApproval,
  });
}

export async function skipOccurrence(occurrenceId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE automation_occurrences SET status = 'skipped', processed_at = ? WHERE id = ?;`,
    [now, occurrenceId]
  );
}

export async function processRecurringCatchUp(
  asOfDate?: string
): Promise<{ processed: number; created: number }> {
  const db = getDatabase();
  const today = asOfDate || formatDateISO(new Date());

  const activeRules = await db.getAllAsync<RecurringRuleRow>(
    `SELECT * FROM recurring_rules WHERE is_active = 1;`
  );

  let createdCount = 0;
  let processedCount = 0;

  for (const rule of activeRules) {
    if (rule.type === 'transfer') continue;
    const fromDate = rule.last_processed_date
      ? formatDateISO(new Date(new Date(rule.last_processed_date).getTime() + 86400000))
      : rule.start_date;

    if (fromDate > today) continue;

    const dueDates = calculateDueOccurrences(
      {
        frequency: rule.frequency as any,
        interval: rule.interval,
        day_of_month: rule.day_of_month,
        day_of_week: rule.day_of_week,
        month_end_behavior: rule.month_end_behavior as any,
        start_date: rule.start_date,
        end_date: rule.end_date,
      },
      fromDate,
      today
    );

    for (const scheduledDate of dueDates) {

      const existing = await db.getFirstAsync<AutomationOccurrenceRow>(
        `SELECT id FROM automation_occurrences WHERE recurring_rule_id = ? AND scheduled_date = ?;`,
        [rule.id, scheduledDate]
      );
      if (existing) continue;

      const occurrenceId = generateUUID();

      await db.runAsync(
        `INSERT INTO automation_occurrences (id, recurring_rule_id, scheduled_date, status)
         VALUES (?, ?, ?, 'pending');`, [occurrenceId, rule.id, scheduledDate]
      );
      if (rule.behavior === 'auto_post') {
        try {
          await createTransaction({
            type: rule.type as EntryType,
            amount: rule.amount,
            currency: rule.currency,
            accountId: rule.account_id,
            categoryId: rule.category_id || undefined,
            recurringRuleId: rule.id,
            occurrenceId,
            date: scheduledDate,
            note: `Tự động định kỳ: ${rule.name}`,
          });

          processedCount++;
        } catch (error) {
          if (!(error instanceof MonthlyLimitExceededError)) throw error;
          createdCount++;
        }
      } else {
        createdCount++;
      }
    }

    await db.runAsync(
      `UPDATE recurring_rules SET last_processed_date = ?, updated_at = ? WHERE id = ?;`,
      [today, new Date().toISOString(), rule.id]
    );
  }

  return { created: createdCount, processed: processedCount };
}
