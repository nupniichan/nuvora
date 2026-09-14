import { getDatabase } from '@/database/database';
import { CategoryGroupRow, CategoryRow, CategoryType } from '@/database/types';
import { getCurrentLanguage } from '@/i18n/language-state';
import { generateUUID } from '@/shared/uuid';
import {
  localizeStarterCategoryName,
  localizeStarterGroupName,
} from './starter-templates';

export interface CategoryWithGroup extends CategoryRow {
  group_name: string;
  group_type: CategoryType;
}

export async function getAllCategories(type?: CategoryType): Promise<CategoryWithGroup[]> {
  const db = getDatabase();
  let sql = `
    SELECT c.*, cg.name as group_name, cg.type as group_type
    FROM categories c
    JOIN category_groups cg ON cg.id = c.group_id
    WHERE c.is_archived = 0
  `;
  const params: any[] = [];

  if (type) {
    sql += ` AND cg.type = ?`;
    params.push(type);
  }

  sql += ` ORDER BY cg.sort_order ASC, c.sort_order ASC, c.name ASC;`;

  const rows = await db.getAllAsync<CategoryWithGroup>(sql, params);
  const language = getCurrentLanguage();
  return rows.map((row) => ({
    ...row,
    name: localizeStarterCategoryName(row.name, language),
    group_name: localizeStarterGroupName(row.group_name, language),
  }));
}

export async function getCategoryById(id: string): Promise<CategoryWithGroup | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<CategoryWithGroup>(
    `SELECT c.*, cg.name as group_name, cg.type as group_type
     FROM categories c
     JOIN category_groups cg ON cg.id = c.group_id
     WHERE c.id = ?;`,
    [id]
  );
  if (!row) return null;
  const language = getCurrentLanguage();
  return {
    ...row,
    name: localizeStarterCategoryName(row.name, language),
    group_name: localizeStarterGroupName(row.group_name, language),
  };
}

export async function getAllCategoryGroups(type?: CategoryType): Promise<CategoryGroupRow[]> {
  const db = getDatabase();
  let sql = `SELECT * FROM category_groups`;
  const params: any[] = [];

  if (type) {
    sql += ` WHERE type = ?`;
    params.push(type);
  }

  sql += ` ORDER BY sort_order ASC, name ASC;`;

  const rows = await db.getAllAsync<CategoryGroupRow>(sql, params);
  const language = getCurrentLanguage();
  return rows.map((row) => ({
    ...row,
    name: localizeStarterGroupName(row.name, language),
  }));
}

export async function createCategoryGroup(data: {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}): Promise<CategoryGroupRow> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  const existing = await getAllCategoryGroups(data.type);
  const nextOrder = existing.length > 0 ? Math.max(...existing.map((g) => g.sort_order)) + 1 : 1;

  await db.runAsync(
    `INSERT INTO category_groups (id, name, icon, color, sort_order, type, is_system, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?);`,
    [id, data.name.trim(), data.icon || null, data.color || null, nextOrder, data.type, now]
  );

  const created = await db.getFirstAsync<CategoryGroupRow>(
    `SELECT * FROM category_groups WHERE id = ?;`,
    [id]
  );
  if (!created) throw new Error('Không thể tạo nhóm danh mục');
  return created;
}

export async function updateCategoryGroup(
  id: string,
  data: {
    name?: string;
    type?: CategoryType;
    icon?: string | null;
    color?: string | null;
  }
): Promise<void> {
  const db = getDatabase();
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    params.push(data.type);
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?');
    params.push(data.icon);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    params.push(data.color);
  }

  if (updates.length === 0) return;

  params.push(id);
  await db.runAsync(`UPDATE category_groups SET ${updates.join(', ')} WHERE id = ?;`, params);
}

export async function createCategory(data: {
  groupId: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<CategoryRow> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  const existing = await db.getAllAsync<CategoryRow>(
    `SELECT * FROM categories WHERE group_id = ? AND is_archived = 0 ORDER BY sort_order DESC;`,
    [data.groupId]
  );
  const nextOrder = existing.length > 0 ? existing[0].sort_order + 1 : 1;

  await db.runAsync(
    `INSERT INTO categories (id, group_id, name, icon, color, sort_order, is_archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?);`,
    [id, data.groupId, data.name.trim(), data.icon || null, data.color || null, nextOrder, now]
  );

  const created = await db.getFirstAsync<CategoryRow>(
    `SELECT * FROM categories WHERE id = ?;`,
    [id]
  );
  if (!created) throw new Error('Không thể tạo danh mục');
  return created;
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    icon?: string | null;
    color?: string | null;
    groupId?: string;
  }
): Promise<void> {
  const db = getDatabase();
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?');
    params.push(data.icon);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    params.push(data.color);
  }
  if (data.groupId !== undefined) {
    updates.push('group_id = ?');
    params.push(data.groupId);
  }

  if (updates.length === 0) return;

  params.push(id);
  await db.runAsync(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?;`, params);
}

export async function getCategoryTransactionCount(id: string): Promise<number> {
  const db = getDatabase();
  const res = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;`,
    [id]
  );
  return res ? Number(res.count) : 0;
}

export async function archiveCategory(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`UPDATE categories SET is_archived = 1 WHERE id = ?;`, [id]);
}

export async function deleteCategory(id: string): Promise<boolean> {
  const db = getDatabase();
  const count = await getCategoryTransactionCount(id);
  if (count > 0) {

    await archiveCategory(id);
    return false;
  }

  await db.runAsync(`DELETE FROM budget_allocations WHERE category_id = ?;`, [id]);
  await db.runAsync(`DELETE FROM categories WHERE id = ?;`, [id]);
  return true;
}

export async function mergeCategoryInto(sourceId: string, targetId: string): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {

    await db.runAsync(`UPDATE transactions SET category_id = ? WHERE category_id = ?;`, [
      targetId,
      sourceId,
    ]);

    await db.runAsync(`UPDATE recurring_rules SET category_id = ? WHERE category_id = ?;`, [
      targetId,
      sourceId,
    ]);

    await db.runAsync(`DELETE FROM budget_allocations WHERE category_id = ?;`, [sourceId]);

    await db.runAsync(`DELETE FROM categories WHERE id = ?;`, [sourceId]);
  });
}

export async function archiveCategoryGroup(id: string): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE categories SET is_archived = 1 WHERE group_id = ?;`, [id]);
    await db.runAsync(`DELETE FROM category_groups WHERE id = ?;`, [id]);
  });
}
