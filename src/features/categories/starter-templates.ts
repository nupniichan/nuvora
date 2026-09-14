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
    icon: 'shopping-cart',
    color: '#F4A284',
    categories: [
      { nameVi: 'Ăn uống', nameEn: 'Food & Dining', icon: 'restaurant', color: '#FF7043' },
      { nameVi: 'Di chuyển', nameEn: 'Transportation', icon: 'directions-car', color: '#42A5F5' },
      { nameVi: 'Mua sắm', nameEn: 'Shopping', icon: 'shopping-bag', color: '#AB47BC' },
      { nameVi: 'Cà phê & Đồ uống', nameEn: 'Coffee & Drinks', icon: 'local-cafe', color: '#8D6E63' },
    ],
  },
  {
    nameVi: 'Sinh hoạt & Hóa đơn',
    nameEn: 'Housing & Utilities',
    type: 'expense',
    icon: 'home',
    color: '#7B8CDE',
    categories: [
      { nameVi: 'Tiền nhà', nameEn: 'Rent / Mortgage', icon: 'vpn-key', color: '#5C6BC0' },
      { nameVi: 'Điện, Nước & Gas', nameEn: 'Utilities', icon: 'flash-on', color: '#FFA726' },
      { nameVi: 'Internet & Phí di động', nameEn: 'Internet & Mobile', icon: 'wifi', color: '#26A69A' },
    ],
  },
  {
    nameVi: 'Giải trí & Đời sống',
    nameEn: 'Entertainment & Lifestyle',
    type: 'expense',
    icon: 'sports-esports',
    color: '#EC407A',
    categories: [
      { nameVi: 'Phim & Game', nameEn: 'Movies & Games', icon: 'tv', color: '#EF5350' },
      { nameVi: 'Sức khỏe & Thể thao', nameEn: 'Health & Fitness', icon: 'fitness-center', color: '#66BB6A' },
      { nameVi: 'Học tập & Sách', nameEn: 'Education & Books', icon: 'menu-book', color: '#7E57C2' },
    ],
  },
  {
    nameVi: 'Đầu tư & Tích lũy',
    nameEn: 'Investments',
    type: 'expense',
    icon: 'trending-up',
    color: '#2E7D32',
    categories: [
      { nameVi: 'Chứng khoán & Cổ phiếu', nameEn: 'Stocks & Securities', icon: 'show-chart', color: '#4CAF7D' },
      { nameVi: 'Tiền điện tử / Crypto', nameEn: 'Cryptocurrency', icon: 'currency-bitcoin', color: '#FFA726' },
      { nameVi: 'Chứng chỉ quỹ & Vàng', nameEn: 'Funds & Gold', icon: 'monetization-on', color: '#FBC02D' },
      { nameVi: 'Bất động sản', nameEn: 'Real Estate', icon: 'apartment', color: '#5C6BC0' },
    ],
  },
  {
    nameVi: 'Tiết kiệm & Quỹ tương lai',
    nameEn: 'Savings & Reserve Funds',
    type: 'expense',
    icon: 'savings',
    color: '#00897B',
    categories: [
      { nameVi: 'Quỹ khẩn cấp', nameEn: 'Emergency Fund', icon: 'shield', color: '#EF5350' },
      { nameVi: 'Quỹ mua nhà / xe', nameEn: 'House & Car Fund', icon: 'home', color: '#26A69A' },
      { nameVi: 'Quỹ du lịch & Kỳ nghỉ', nameEn: 'Travel Fund', icon: 'flight', color: '#42A5F5' },
    ],
  },
  {
    nameVi: 'Khoản nợ & Trả góp',
    nameEn: 'Debts & Installments',
    type: 'expense',
    icon: 'credit-card',
    color: '#D32F2F',
    categories: [
      { nameVi: 'Trả nợ ngân hàng', nameEn: 'Bank Loan Repayment', icon: 'account-balance', color: '#E53935' },
      { nameVi: 'Dư nợ thẻ tín dụng', nameEn: 'Credit Card Balance', icon: 'credit-card', color: '#C2185B' },
      { nameVi: 'Trả nợ cá nhân', nameEn: 'Personal Debt Repayment', icon: 'people', color: '#7E57C2' },
    ],
  },
  {
    nameVi: 'Thu nhập',
    nameEn: 'Income',
    type: 'income',
    icon: 'account-balance-wallet',
    color: '#4CAF7D',
    categories: [
      { nameVi: 'Lương hàng tháng', nameEn: 'Salary', icon: 'payments', color: '#4CAF7D' },
      { nameVi: 'Thưởng & Phụ cấp', nameEn: 'Bonus & Allowances', icon: 'emoji-events', color: '#FFB74D' },
      { nameVi: 'Lợi nhuận đầu tư & Cổ tức', nameEn: 'Investment Returns', icon: 'insights', color: '#26A69A' },
      { nameVi: 'Thu nhập làm thêm / Freelance', nameEn: 'Freelance & Side gigs', icon: 'laptop', color: '#42A5F5' },
      { nameVi: 'Thu nhập bất ngờ / Khác', nameEn: 'Other & Windfall Income', icon: 'card-giftcard', color: '#AB47BC' },
    ],
  },
];

export function localizeStarterGroupName(name: string, lang: 'vi' | 'en'): string {
  const template = STARTER_TEMPLATES.find(
    (item) => item.nameVi === name || item.nameEn === name
  );
  return template ? (lang === 'en' ? template.nameEn : template.nameVi) : name;
}

export function localizeStarterCategoryName(name: string, lang: 'vi' | 'en'): string {
  for (const template of STARTER_TEMPLATES) {
    const category = template.categories.find(
      (item) => item.nameVi === name || item.nameEn === name
    );
    if (category) return lang === 'en' ? category.nameEn : category.nameVi;
  }
  return name;
}

export async function seedSingleGroupTemplate(
  db: any,
  group: StarterGroupTemplate,
  lang: 'vi' | 'en' = 'vi'
): Promise<string> {
  const now = new Date().toISOString();
  const groupId = generateUUID();
  const groupName = lang === 'vi' ? group.nameVi : group.nameEn;

  let maxSort = 1;
  try {
    const existing = await db.getAllAsync(`SELECT sort_order FROM category_groups WHERE type = ?;`, [group.type]);
    if (existing && existing.length > 0) {
      maxSort = Math.max(...existing.map((g: any) => g.sort_order || 0)) + 1;
    }
  } catch {}

  await db.runAsync(
    `INSERT INTO category_groups (id, name, icon, color, sort_order, type, is_system, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?);`,
    [groupId, groupName, group.icon, group.color, maxSort, group.type, now]
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

  return groupId;
}

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
