import { generateUUID } from '@/shared/uuid';

export interface StarterGroupTemplate {
  nameVi: string;
  nameEn: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  categories: { nameVi: string; nameEn: string; icon: string; color: string }[];
}

export const STARTER_TEMPLATES: StarterGroupTemplate[] = [
  {
    nameVi: 'Chi tiêu hàng ngày',
    nameEn: 'Daily Expenses',
    type: 'expense',
    icon: 'cart-outline',
    color: '#F89E62',
    categories: [
      { nameVi: 'Ăn uống', nameEn: 'Food & Dining', icon: 'fast-food-outline', color: '#FF7043' },
      { nameVi: 'Di chuyển', nameEn: 'Transportation', icon: 'car-outline', color: '#42A5F5' },
      { nameVi: 'Mua sắm', nameEn: 'Shopping', icon: 'bag-handle-outline', color: '#AB47BC' },
      { nameVi: 'Cà phê & Đồ uống', nameEn: 'Coffee & Drinks', icon: 'cafe-outline', color: '#8D6E63' },
    ],
  },
  {
    nameVi: 'Sinh hoạt & Hóa đơn',
    nameEn: 'Housing & Utilities',
    type: 'expense',
    icon: 'home-outline',
    color: '#7B8CDE',
    categories: [
      { nameVi: 'Tiền nhà', nameEn: 'Rent / Mortgage', icon: 'key-outline', color: '#5C6BC0' },
      { nameVi: 'Điện, Nước & Gas', nameEn: 'Utilities', icon: 'flash-outline', color: '#FFA726' },
      { nameVi: 'Internet & Phí di động', nameEn: 'Internet & Mobile', icon: 'wifi-outline', color: '#26A69A' },
    ],
  },
  {
    nameVi: 'Giải trí & Khác',
    nameEn: 'Entertainment & Others',
    type: 'expense',
    icon: 'game-controller-outline',
    color: '#EC407A',
    categories: [
      { nameVi: 'Phim & Game', nameEn: 'Movies & Games', icon: 'tv-outline', color: '#EF5350' },
      { nameVi: 'Sức khỏe & Thể thao', nameEn: 'Health & Fitness', icon: 'fitness-outline', color: '#66BB6A' },
      { nameVi: 'Học tập & Sách', nameEn: 'Education & Books', icon: 'book-outline', color: '#7E57C2' },
    ],
  },
  {
    nameVi: 'Thu nhập',
    nameEn: 'Income',
    type: 'income',
    icon: 'wallet-outline',
    color: '#4CAF7D',
    categories: [
      { nameVi: 'Lương hàng tháng', nameEn: 'Salary', icon: 'cash-outline', color: '#4CAF7D' },
      { nameVi: 'Thưởng & Freelance', nameEn: 'Bonus & Freelance', icon: 'trophy-outline', color: '#FFB74D' },
      { nameVi: 'Thu nhập khác', nameEn: 'Other Income', icon: 'briefcase-outline', color: '#26C6DA' },
    ],
  },
];

/**
 * Seeds starter category templates into the active SQLite database
 */
export async function seedStarterCategories(db: any, lang: 'vi' | 'en' = 'vi'): Promise<void> {
  const now = new Date().toISOString();

  let groupSort = 1;
  for (const group of STARTER_TEMPLATES) {
    const groupId = generateUUID();
    const groupName = lang === 'vi' ? group.nameVi : group.nameEn;

    await db.runAsync(
      `INSERT INTO category_groups (id, name, icon, color, sort_order, type, is_system, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?);`,
      [groupId, groupName, group.icon, group.color, groupSort++, group.type, now]
    );

    let catSort = 1;
    for (const cat of group.categories) {
      const catId = generateUUID();
      const catName = lang === 'vi' ? cat.nameVi : cat.nameEn;

      await db.runAsync(
        `INSERT INTO categories (id, group_id, name, icon, color, sort_order, is_archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?);`,
        [catId, groupId, catName, cat.icon, cat.color, catSort++, now]
      );
    }
  }
}
