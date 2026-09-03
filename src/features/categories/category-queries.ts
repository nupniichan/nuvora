import { getDatabase } from '@/database/database';
import { CategoryGroupRow, CategoryRow, CategoryType } from '@/database/types';
import { generateUUID } from '@/shared/uuid';

export interface CategoryWithGroup extends CategoryRow {
  group_name: string;
  group_type: CategoryType;
}

/**
 * Retrieves all categories, optionally filtered by group type (expense or income)
 */
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

  return await db.getAllAsync<CategoryWithGroup>(sql, params);
}

/**
 * Retrieves a single category by id
 */
export async function getCategoryById(id: string): Promise<CategoryWithGroup | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<CategoryWithGroup>(
    `SELECT c.*, cg.name as group_name, cg.type as group_type
     FROM categories c
     JOIN category_groups cg ON cg.id = c.group_id
     WHERE c.id = ?;`,
    [id]
  );
  return row ?? null;
}

/**
 * Retrieves all category groups
 */
export async function getAllCategoryGroups(type?: CategoryType): Promise<CategoryGroupRow[]> {
  const db = getDatabase();
  let sql = `SELECT * FROM category_groups`;
  const params: any[] = [];

  if (type) {
    sql += ` WHERE type = ?`;
    params.push(type);
  }

  sql += ` ORDER BY sort_order ASC, name ASC;`;

  return await db.getAllAsync<CategoryGroupRow>(sql, params);
}

/**
 * Creates a new category group
 */
export async function createCategoryGroup(data: {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}): Promise<CategoryGroupRow> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  // Get max sort_order
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

/**
 * Updates an existing category group
 */
export async function updateCategoryGroup(
  id: string,
  data: {
    name?: string;
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

/**
 * Creates a new category inside a group
 */
export async function createCategory(data: {
  groupId: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<CategoryRow> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  // Get current max sort order in this group
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

/**
 * Updates an existing category
 */
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

/**
 * Gets transaction count for a category to determine if safe to delete
 */
export async function getCategoryTransactionCount(id: string): Promise<number> {
  const db = getDatabase();
  const res = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;`,
    [id]
  );
  return res ? Number(res.count) : 0;
}

/**
 * Archives a category (soft delete)
 */
export async function archiveCategory(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`UPDATE categories SET is_archived = 1 WHERE id = ?;`, [id]);
}

/**
 * Hard deletes a category if no transactions use it
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const db = getDatabase();
  const count = await getCategoryTransactionCount(id);
  if (count > 0) {
    // If it has transactions, soft-delete instead
    await archiveCategory(id);
    return false;
  }

  // Remove any budget_allocations referencing it
  await db.runAsync(`DELETE FROM budget_allocations WHERE category_id = ?;`, [id]);
  await db.runAsync(`DELETE FROM categories WHERE id = ?;`, [id]);
  return true;
}

/**
 * Merges a category into another category and removes the source category
 */
export async function mergeCategoryInto(sourceId: string, targetId: string): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    // Reassign transactions
    await db.runAsync(`UPDATE transactions SET category_id = ? WHERE category_id = ?;`, [
      targetId,
      sourceId,
    ]);
    // Reassign recurring rules
    await db.runAsync(`UPDATE recurring_rules SET category_id = ? WHERE category_id = ?;`, [
      targetId,
      sourceId,
    ]);
    // Delete budget allocations for source
    await db.runAsync(`DELETE FROM budget_allocations WHERE category_id = ?;`, [sourceId]);
    // Delete source category
    await db.runAsync(`DELETE FROM categories WHERE id = ?;`, [sourceId]);
  });
}

/**
 * Archives a category group and its categories
 */
export async function archiveCategoryGroup(id: string): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE categories SET is_archived = 1 WHERE group_id = ?;`, [id]);
    await db.runAsync(`DELETE FROM category_groups WHERE id = ?;`, [id]);
  });
}
