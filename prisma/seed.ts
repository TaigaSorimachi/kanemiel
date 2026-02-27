import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // デモ用会社
  const company = await prisma.company.create({
    data: {
      name: '山田建設株式会社',
      bankBalance: 15200000, // 1,520万円
      dangerLine: 2000000, // 200万円
    },
  });

  // ユーザー3名
  const owner = await prisma.user.create({
    data: {
      companyId: company.id,
      name: '山田太郎',
      role: 'OWNER',
      lineUserId: 'demo-owner-001',
    },
  });

  const accounting = await prisma.user.create({
    data: {
      companyId: company.id,
      name: '佐藤花子',
      role: 'ACCOUNTING',
      lineUserId: 'demo-accounting-001',
    },
  });

  const foreman = await prisma.user.create({
    data: {
      companyId: company.id,
      name: '田中一郎',
      role: 'FOREMAN',
      lineUserId: 'demo-foreman-001',
    },
  });

  // 取引先5社
  const clientA = await prisma.client.create({
    data: {
      companyId: company.id,
      name: '大手建設株式会社',
      type: 'GENERAL_CONTRACTOR',
      paymentTerms: '月末締め翌月末払い',
    },
  });

  const clientB = await prisma.client.create({
    data: {
      companyId: company.id,
      name: '東京ハウジング株式会社',
      type: 'GENERAL_CONTRACTOR',
      paymentTerms: '月末締め翌々月15日払い',
    },
  });

  const subA = await prisma.client.create({
    data: {
      companyId: company.id,
      name: '鈴木工業',
      type: 'SUBCONTRACTOR',
    },
  });

  const subB = await prisma.client.create({
    data: {
      companyId: company.id,
      name: '中村左官店',
      type: 'SUBCONTRACTOR',
    },
  });

  const subC = await prisma.client.create({
    data: {
      companyId: company.id,
      name: '高橋材木店',
      type: 'SUBCONTRACTOR',
    },
  });

  // 現場4件
  const projectA = await prisma.project.create({
    data: {
      companyId: company.id,
      name: 'A現場（新宿ビル改修）',
      clientId: clientA.id,
      contractAmount: 12000000, // 1,200万円
      status: 'ACTIVE',
      foremanId: foreman.id,
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-04-30'),
    },
  });

  const projectB = await prisma.project.create({
    data: {
      companyId: company.id,
      name: 'B現場（渋谷マンション）',
      clientId: clientA.id,
      contractAmount: 8500000, // 850万円
      status: 'ACTIVE',
      foremanId: foreman.id,
      startDate: new Date('2025-12-15'),
      endDate: new Date('2026-05-31'),
    },
  });

  const projectC = await prisma.project.create({
    data: {
      companyId: company.id,
      name: 'C現場（品川オフィス）',
      clientId: clientB.id,
      contractAmount: 6000000, // 600万円
      status: 'ACTIVE',
      foremanId: foreman.id,
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-06-30'),
    },
  });

  const projectD = await prisma.project.create({
    data: {
      companyId: company.id,
      name: 'D現場（池袋商業施設）',
      clientId: clientB.id,
      contractAmount: 15000000, // 1,500万円
      status: 'ACTIVE',
      foremanId: foreman.id,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-09-30'),
    },
  });

  // 入金予定
  await prisma.incomeSchedule.createMany({
    data: [
      { projectId: projectA.id, clientId: clientA.id, amount: 4000000, scheduledDate: new Date('2026-02-28'), incomeType: 'PROGRESS', status: 'SCHEDULED' },
      { projectId: projectA.id, clientId: clientA.id, amount: 4000000, scheduledDate: new Date('2026-03-31'), incomeType: 'PROGRESS', status: 'SCHEDULED' },
      { projectId: projectB.id, clientId: clientA.id, amount: 3000000, scheduledDate: new Date('2026-03-15'), incomeType: 'PROGRESS', status: 'SCHEDULED' },
      { projectId: projectC.id, clientId: clientB.id, amount: 2000000, scheduledDate: new Date('2026-03-31'), incomeType: 'ADVANCE', status: 'SCHEDULED' },
      { projectId: projectD.id, clientId: clientB.id, amount: 5000000, scheduledDate: new Date('2026-04-15'), incomeType: 'ADVANCE', status: 'SCHEDULED' },
    ],
  });

  // 入出金実績
  await prisma.transaction.createMany({
    data: [
      { projectId: projectA.id, type: 'INCOME', amount: 4000000, date: new Date('2026-01-31'), category: '出来高入金', clientId: clientA.id, description: '1月分出来高' },
      { projectId: projectA.id, type: 'EXPENSE', amount: 1500000, date: new Date('2026-01-20'), category: '外注費', clientId: subA.id, description: '鈴木工業 1月分' },
      { projectId: projectA.id, type: 'EXPENSE', amount: 800000, date: new Date('2026-01-25'), category: '材料費', clientId: subC.id, description: '高橋材木店 資材' },
      { projectId: projectB.id, type: 'INCOME', amount: 2000000, date: new Date('2026-01-31'), category: '前受金', clientId: clientA.id, description: '着手金' },
      { projectId: projectB.id, type: 'EXPENSE', amount: 1200000, date: new Date('2026-02-10'), category: '外注費', clientId: subB.id, description: '中村左官店 2月分' },
      { projectId: projectC.id, type: 'INCOME', amount: 1500000, date: new Date('2026-02-01'), category: '前受金', clientId: clientB.id, description: '着手金' },
      { projectId: projectC.id, type: 'EXPENSE', amount: 600000, date: new Date('2026-02-15'), category: '材料費', clientId: subC.id, description: '高橋材木店 資材' },
    ],
  });

  // 支払申請3件（pending状態）
  await prisma.paymentRequest.createMany({
    data: [
      {
        projectId: projectA.id,
        requesterId: foreman.id,
        clientId: subA.id,
        amount: 800000,
        category: 'SUBCONTRACTING',
        desiredDate: new Date('2026-03-15'),
        status: 'PENDING',
        note: '2月分外注費',
      },
      {
        projectId: projectB.id,
        requesterId: foreman.id,
        clientId: subB.id,
        amount: 1000000,
        category: 'SUBCONTRACTING',
        desiredDate: new Date('2026-03-15'),
        status: 'PENDING',
        note: '2月分左官工事費',
      },
      {
        projectId: projectC.id,
        requesterId: foreman.id,
        clientId: subC.id,
        amount: 450000,
        category: 'MATERIAL',
        desiredDate: new Date('2026-03-10'),
        status: 'PENDING',
        note: '3月分材料費',
      },
    ],
  });

  console.log('✅ シードデータ投入完了');
  console.log(`  会社: ${company.name}`);
  console.log(`  ユーザー: ${owner.name}, ${accounting.name}, ${foreman.name}`);
  console.log(`  取引先: 5社`);
  console.log(`  現場: 4件`);
  console.log(`  支払申請(pending): 3件`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
