import { closeDatabase, getDatabase } from '../database.web';

describe('web database category updates', () => {
  beforeEach(async () => {
    await closeDatabase();
  });

  it('archives one category using a literal assignment', async () => {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO category_groups (id, name, type, sort_order)
       VALUES (?, ?, ?, ?);`,
      ['group-expense', 'Chi tiêu', 'expense', 1]
    );
    await db.runAsync(
      `INSERT INTO categories (id, group_id, name, sort_order, is_archived)
       VALUES (?, ?, ?, ?, 0);`,
      ['category-food', 'group-expense', 'Ăn uống', 1]
    );

    await db.runAsync('UPDATE categories SET is_archived = 1 WHERE id = ?;', [
      'category-food',
    ]);

    const activeCategories = await db.getAllAsync(
      `SELECT c.*, cg.name as group_name, cg.type as group_type
       FROM categories c
       JOIN category_groups cg ON cg.id = c.group_id
       WHERE c.is_archived = 0;`
    );
    expect(activeCategories).toHaveLength(0);
  });

  it('archives every category in a deleted group', async () => {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO category_groups (id, name, type, sort_order)
       VALUES (?, ?, ?, ?);`,
      ['group-expense', 'Chi tiêu', 'expense', 1]
    );
    await db.runAsync(
      `INSERT INTO categories (id, group_id, name, sort_order, is_archived)
       VALUES (?, ?, ?, ?, 0);`,
      ['category-food', 'group-expense', 'Ăn uống', 1]
    );
    await db.runAsync(
      `INSERT INTO categories (id, group_id, name, sort_order, is_archived)
       VALUES (?, ?, ?, ?, 0);`,
      ['category-home', 'group-expense', 'Nhà cửa', 2]
    );

    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE categories SET is_archived = 1 WHERE group_id = ?;', [
        'group-expense',
      ]);
      await db.runAsync('DELETE FROM category_groups WHERE id = ?;', ['group-expense']);
    });

    const activeCategories = await db.getAllAsync(
      `SELECT c.*, cg.name as group_name, cg.type as group_type
       FROM categories c
       JOIN category_groups cg ON cg.id = c.group_id
       WHERE c.is_archived = 0;`
    );
    expect(activeCategories).toHaveLength(0);
  });

  it('filters joined categories by their group type only once', async () => {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO category_groups (id, name, type, sort_order)
       VALUES (?, ?, ?, ?);`,
      ['group-expense', 'Chi tiêu', 'expense', 1]
    );
    await db.runAsync(
      `INSERT INTO category_groups (id, name, type, sort_order)
       VALUES (?, ?, ?, ?);`,
      ['group-income', 'Thu nhập', 'income', 2]
    );
    await db.runAsync(
      `INSERT INTO categories (id, group_id, name, sort_order, is_archived)
       VALUES (?, ?, ?, ?, 0);`,
      ['category-food', 'group-expense', 'Ăn uống', 1]
    );
    await db.runAsync(
      `INSERT INTO categories (id, group_id, name, sort_order, is_archived)
       VALUES (?, ?, ?, ?, 0);`,
      ['category-salary', 'group-income', 'Lương', 1]
    );

    const incomeCategories = await db.getAllAsync(
      `SELECT c.*, cg.name as group_name, cg.type as group_type
       FROM categories c
       JOIN category_groups cg ON cg.id = c.group_id
       WHERE c.is_archived = 0 AND cg.type = ?;`,
      ['income']
    );

    expect(incomeCategories).toHaveLength(1);
    expect(incomeCategories[0]).toMatchObject({
      id: 'category-salary',
      group_type: 'income',
    });
  });
});
