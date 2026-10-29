import { closeDatabase } from '@/database/database.web';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import {
  createFund,
  deleteFund,
  depositToFund,
  getAllFunds,
  getAssetSummary,
  getFundById,
  getFundTransactions,
  getTotalFundsBalance,
  reorderFunds,
  transferBetweenFunds,
  updateFund,
  withdrawFromFund,
} from '../fund-queries';
import {
  createTransaction,
} from '@/features/transactions/transaction-queries';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => {
  let nextId = 0;
  return { generateUUID: () => `test-uuid-${++nextId}` };
});

beforeEach(async () => {
  await closeDatabase();
});

describe('Fund Queries & Transactions', () => {
  it('creates funds with default sort_order and retrieves them', async () => {
    const fund1 = await createFund({
      name: 'Quỹ khẩn cấp',
      description: 'Dự phòng 6 tháng',
      icon: 'shield',
      color: '#FF5722',
      targetAmount: 50000000,
    });

    expect(fund1.id).toBeDefined();
    expect(fund1.name).toBe('Quỹ khẩn cấp');
    expect(fund1.description).toBe('Dự phòng 6 tháng');
    expect(fund1.balance).toBe(0);
    expect(fund1.sort_order).toBe(1);
    expect(fund1.target_amount).toBe(50000000);
    expect(fund1.is_deleted).toBe(0);

    const fund2 = await createFund({
      name: 'Quỹ du lịch',
      icon: 'flight',
      color: '#2196F3',
    });
    expect(fund2.sort_order).toBe(2);
    expect(fund2.target_amount).toBeNull();

    const all = await getAllFunds(false);
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('Quỹ khẩn cấp');
    expect(all[1].name).toBe('Quỹ du lịch');
  });

  it('updates and reorders funds correctly', async () => {
    const f1 = await createFund({ name: 'Quỹ 1' });
    const f2 = await createFund({ name: 'Quỹ 2' });

    const updated = await updateFund(f1.id, {
      name: 'Quỹ 1 Đã đổi',
      targetAmount: 10000000,
      color: '#000000',
    });
    expect(updated.name).toBe('Quỹ 1 Đã đổi');
    expect(updated.target_amount).toBe(10000000);
    expect(updated.color).toBe('#000000');

    await reorderFunds([f2.id, f1.id]);
    const reordered = await getAllFunds(false);
    expect(reordered[0].id).toBe(f2.id);
    expect(reordered[1].id).toBe(f1.id);
  });

  it('deposits from wallet to fund and respects wallet balance', async () => {
    const wallet = await getDefaultAccount();
    // Seed wallet with income
    await createTransaction({
      type: 'income',
      amount: 1000000,
      currency: 'VND',
      accountId: wallet.id,
      date: '2026-10-01',
    });

    const fund = await createFund({ name: 'Tiết kiệm' });
    expect(fund.balance).toBe(0);

    // Fail if deposit > wallet balance
    await expect(
      depositToFund({
        fundId: fund.id,
        amount: 2000000,
      })
    ).rejects.toThrow('INSUFFICIENT_WALLET_BALANCE');

    // Deposit 400k
    const depositTx = await depositToFund({
      fundId: fund.id,
      amount: 400000,
      note: 'Nạp quỹ tháng 10',
    });

    expect(depositTx.type).toBe('fund_deposit');
    expect(depositTx.amount).toBe(400000);
    expect(depositTx.to_fund_id).toBe(fund.id);

    const updatedFund = await getFundById(fund.id);
    const updatedWallet = await getDefaultAccount();

    expect(updatedFund?.balance).toBe(400000);
    expect(updatedWallet.balance).toBe(600000);

    const assetSummary = await getAssetSummary();
    expect(assetSummary.walletBalance).toBe(600000);
    expect(assetSummary.fundsBalance).toBe(400000);
    expect(assetSummary.totalAssets).toBe(1000000);
  });

  it('withdraws from fund to wallet and respects fund balance', async () => {
    const wallet = await getDefaultAccount();
    await createTransaction({
      type: 'income',
      amount: 1000000,
      currency: 'VND',
      accountId: wallet.id,
      date: '2026-10-01',
    });

    const fund = await createFund({ name: 'Tiết kiệm' });
    await depositToFund({ fundId: fund.id, amount: 500000 });

    // Withdraw more than fund balance fails
    await expect(
      withdrawFromFund({
        fundId: fund.id,
        amount: 600000,
      })
    ).rejects.toThrow('INSUFFICIENT_FUND_BALANCE');

    // Withdraw 200k
    const withdrawTx = await withdrawFromFund({
      fundId: fund.id,
      amount: 200000,
      note: 'Rút tiêu vặt',
    });

    expect(withdrawTx.type).toBe('fund_withdrawal');
    expect(withdrawTx.fund_id).toBe(fund.id);

    const updatedFund = await getFundById(fund.id);
    const updatedWallet = await getDefaultAccount();

    expect(updatedFund?.balance).toBe(300000);
    expect(updatedWallet.balance).toBe(700000);
  });

  it('transfers between funds without touching wallet balance', async () => {
    const wallet = await getDefaultAccount();
    await createTransaction({
      type: 'income',
      amount: 1000000,
      currency: 'VND',
      accountId: wallet.id,
      date: '2026-10-01',
    });

    const fundA = await createFund({ name: 'Quỹ A' });
    const fundB = await createFund({ name: 'Quỹ B' });

    await depositToFund({ fundId: fundA.id, amount: 500000 });

    // Cannot transfer to self
    await expect(
      transferBetweenFunds({
        fromFundId: fundA.id,
        toFundId: fundA.id,
        amount: 100000,
      })
    ).rejects.toThrow('INVALID_FUND_TRANSFER');

    // Transfer 200k from A to B
    const transferTx = await transferBetweenFunds({
      fromFundId: fundA.id,
      toFundId: fundB.id,
      amount: 200000,
      note: 'Chia sẻ quỹ',
    });

    expect(transferTx.type).toBe('fund_transfer');
    expect(transferTx.fund_id).toBe(fundA.id);
    expect(transferTx.to_fund_id).toBe(fundB.id);

    const updatedA = await getFundById(fundA.id);
    const updatedB = await getFundById(fundB.id);
    const updatedWallet = await getDefaultAccount();

    expect(updatedA?.balance).toBe(300000);
    expect(updatedB?.balance).toBe(200000);
    expect(updatedWallet.balance).toBe(500000);
    expect(await getTotalFundsBalance()).toBe(500000);
  });

  it('spends directly from a fund without affecting wallet balance', async () => {
    const wallet = await getDefaultAccount();
    await createTransaction({
      type: 'income',
      amount: 1000000,
      currency: 'VND',
      accountId: wallet.id,
      date: '2026-10-01',
    });

    const fund = await createFund({ name: 'Quỹ ăn uống tiệc tùng' });
    await depositToFund({ fundId: fund.id, amount: 400000 });

    // Spending more than fund balance fails
    await expect(
      createTransaction({
        type: 'expense',
        amount: 500000,
        currency: 'VND',
        accountId: wallet.id,
        fundId: fund.id,
        date: '2026-10-02',
      })
    ).rejects.toThrow('INSUFFICIENT_FUND_BALANCE');

    // Spend 150k from fund
    const expenseTx = await createTransaction({
      type: 'expense',
      amount: 150000,
      currency: 'VND',
      accountId: wallet.id,
      fundId: fund.id,
      date: '2026-10-02',
      note: 'Đi ăn BBQ với bạn bè',
    });

    expect(expenseTx.fund_id).toBe(fund.id);

    const updatedFund = await getFundById(fund.id);
    const updatedWallet = await getDefaultAccount();

    expect(updatedFund?.balance).toBe(250000); // 400k - 150k
    expect(updatedWallet.balance).toBe(600000); // wallet unchanged!
  });

  it('receives income directly to a fund without affecting wallet balance', async () => {
    const wallet = await getDefaultAccount();
    const fund = await createFund({ name: 'Quỹ đầu tư' });

    const incomeTx = await createTransaction({
      type: 'income',
      amount: 500000,
      currency: 'VND',
      accountId: wallet.id,
      fundId: fund.id,
      date: '2026-10-03',
      note: 'Cổ tức nhận vào quỹ',
    });

    expect(incomeTx.fund_id).toBe(fund.id);

    const updatedFund = await getFundById(fund.id);
    const updatedWallet = await getDefaultAccount();

    expect(updatedFund?.balance).toBe(500000);
    expect(updatedWallet.balance).toBe(0); // wallet unchanged!
  });

  it('handles fund history querying correctly', async () => {
    const wallet = await getDefaultAccount();
    await createTransaction({
      type: 'income',
      amount: 1000000,
      currency: 'VND',
      accountId: wallet.id,
      date: '2026-10-01',
    });

    const fundA = await createFund({ name: 'Quỹ Alpha' });
    const fundB = await createFund({ name: 'Quỹ Beta' });

    await depositToFund({ fundId: fundA.id, amount: 300000, date: '2026-10-02' });
    await transferBetweenFunds({
      fromFundId: fundA.id,
      toFundId: fundB.id,
      amount: 100000,
      date: '2026-10-03',
    });

    const historyA = await getFundTransactions(fundA.id);
    const historyB = await getFundTransactions(fundB.id);

    expect(historyA).toHaveLength(2); // deposit (to_fund_id=A) and transfer (fund_id=A)
    expect(historyB).toHaveLength(1); // transfer (to_fund_id=B)
  });

  it('deleting an empty fund soft-deletes it', async () => {
    const fund = await createFund({ name: 'Quỹ tạm' });
    await deleteFund(fund.id);

    const activeFunds = await getAllFunds(false);
    expect(activeFunds.find((f) => f.id === fund.id)).toBeUndefined();

    const allFunds = await getAllFunds(true);
    const deleted = allFunds.find((f) => f.id === fund.id);
    expect(deleted?.is_deleted).toBe(1);
  });

  it('deleting a non-empty fund requires resolution action', async () => {
    const wallet = await getDefaultAccount();
    await createTransaction({
      type: 'income',
      amount: 1000000,
      currency: 'VND',
      accountId: wallet.id,
      date: '2026-10-01',
    });

    const fundA = await createFund({ name: 'Quỹ Có Tiền' });
    await depositToFund({ fundId: fundA.id, amount: 200000 });

    // Should fail without action
    await expect(deleteFund(fundA.id)).rejects.toThrow('FUND_NON_ZERO_BALANCE_ON_DELETE');

    // Refund to wallet
    await deleteFund(fundA.id, { action: 'refund_to_wallet' });

    const updatedFund = await getFundById(fundA.id);
    const updatedWallet = await getDefaultAccount();

    expect(updatedFund?.is_deleted).toBe(1);
    expect(updatedFund?.balance).toBe(0);
    expect(updatedWallet.balance).toBe(1000000); // 800k + 200k refund
  });

  it('deleting a non-empty fund with transfer_to_fund moves remaining balance', async () => {
    const wallet = await getDefaultAccount();
    await createTransaction({
      type: 'income',
      amount: 1000000,
      currency: 'VND',
      accountId: wallet.id,
      date: '2026-10-01',
    });

    const fundSource = await createFund({ name: 'Quỹ Cũ' });
    const fundDest = await createFund({ name: 'Quỹ Mới' });

    await depositToFund({ fundId: fundSource.id, amount: 350000 });
    expect((await getFundById(fundSource.id))?.balance).toBe(350000);

    await deleteFund(fundSource.id, {
      action: 'transfer_to_fund',
      targetFundId: fundDest.id,
    });

    const sourceAfter = await getFundById(fundSource.id);
    const destAfter = await getFundById(fundDest.id);

    expect(sourceAfter?.is_deleted).toBe(1);
    expect(sourceAfter?.balance).toBe(0);
    expect(destAfter?.balance).toBe(350000);
  });
});
