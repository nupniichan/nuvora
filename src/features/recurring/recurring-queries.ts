import { getDatabase } from '@/database/database';
import {
  AutomationOccurrenceRow,
  RecurringRuleRow,
} from '@/database/types';
import { createTransaction } from '@/features/transactions/transaction-queries';
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

/**
 * Retrieves all recurring rules
 */
export async function getAllRecurringRules(): Promise<RecurringRuleWithDetails[]> {
  const db = getDatabase();
  return await db.getAllAsync<RecurringRuleWithDetails>(
    `SELECT rr.*, a.name as account_name, c.name as category_name
     FROM recurring_rules rr
     JOIN accounts a ON a.id = rr.account_id
     LEFT JOIN categories c ON c.id = rr.category_id
     ORDER BY rr.created_at DESC;`
  );
}

/**
 * Creates a new recurring rule
 */
export async function createRecurringRule(data: {
  name: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  accountId: string;
  toAccountId?: string | null;
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
      data.toAccountId || null,
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

/**
 * Retrieves all pending occurrences needing user confirmation
 */
export async function getPendingOccurrences(): Promise<PendingOccurrenceWithRule[]> {
  const db = getDatabase();
  return await db.getAllAsync<PendingOccurrenceWithRule>(
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
}

/**
 * Confirms a pending occurrence and creates the corresponding financial transaction
 */
export async function confirmOccurrence(occurrenceId: string): Promise<void> {
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
  if (!rule) return;

  await db.withTransactionAsync(async () => {
    // 1. Create financial transaction
    const tx = await createTransaction({
      type: rule.type as any,
      amount: rule.amount,
      currency: rule.currency,
      accountId: rule.account_id,
      toAccountId: rule.to_account_id || undefined,
      categoryId: rule.category_id || undefined,
      recurringRuleId: rule.id,
      occurrenceId: occurrence.id,
      date: occurrence.scheduled_date,
      note: `Định kỳ: ${rule.name}`,
    });

    // 2. Update occurrence status
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE automation_occurrences
       SET status = 'confirmed', transaction_id = ?, processed_at = ?
       WHERE id = ?;`,
      [tx.id, now, occurrenceId]
    );
  });
}

/**
 * Skips a pending occurrence without posting a financial transaction
 */
export async function skipOccurrence(occurrenceId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE automation_occurrences SET status = 'skipped', processed_at = ? WHERE id = ?;`,
    [now, occurrenceId]
  );
}

/**
 * Reconciles due occurrences for all active rules up to asOfDate (default: today).
 * Idempotent: duplicates are prevented by (recurring_rule_id, scheduled_date) unique constraint.
 */
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
      // Check if already processed
      const existing = await db.getFirstAsync<AutomationOccurrenceRow>(
        `SELECT id FROM automation_occurrences WHERE recurring_rule_id = ? AND scheduled_date = ?;`,
        [rule.id, scheduledDate]
      );
      if (existing) continue;

      const occurrenceId = generateUUID();
      const now = new Date().toISOString();

      if (rule.behavior === 'auto_post') {
        // Auto-post: create confirmed transaction & marked occurrence
        await db.withTransactionAsync(async () => {
          const tx = await createTransaction({
            type: rule.type as any,
            amount: rule.amount,
            currency: rule.currency,
            accountId: rule.account_id,
            toAccountId: rule.to_account_id || undefined,
            categoryId: rule.category_id || undefined,
            recurringRuleId: rule.id,
            occurrenceId,
            date: scheduledDate,
            note: `Tự động định kỳ: ${rule.name}`,
          });

          await db.runAsync(
            `INSERT INTO automation_occurrences (id, recurring_rule_id, scheduled_date, transaction_id, status, processed_at)
             VALUES (?, ?, ?, ?, 'confirmed', ?);`,
            [occurrenceId, rule.id, scheduledDate, tx.id, now]
          );
        });
        processedCount++;
      } else {
        // Require confirmation
        await db.runAsync(
          `INSERT INTO automation_occurrences (id, recurring_rule_id, scheduled_date, status)
           VALUES (?, ?, ?, 'pending');`,
          [occurrenceId, rule.id, scheduledDate]
        );
        createdCount++;
      }
    }

    // Update last_processed_date for the rule
    await db.runAsync(
      `UPDATE recurring_rules SET last_processed_date = ?, updated_at = ? WHERE id = ?;`,
      [today, new Date().toISOString(), rule.id]
    );
  }

  return { created: createdCount, processed: processedCount };
}
