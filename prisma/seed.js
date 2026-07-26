const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  await prisma.transaction.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.round.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemStats.deleteMany();

  await prisma.systemStats.create({
    data: { id: 1, totalAdminRevenue: 0.00 },
  });

  const mockHash = '$2b$10$e8w6aU.v23I5jZ7V2q.mneZlK8K7XpA3O1i9J9Z3W2Y1X0V9U8T7S';

  const admin = await prisma.user.create({
    data: {
      email: 'admin@goldlottery.io',
      passwordHash: mockHash,
      role: 'ADMIN',
      balance: 0.00,
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice@crypto.io',
      walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      passwordHash: mockHash,
      role: 'USER',
      balance: 100.00,
    },
  });

  const round1 = await prisma.round.create({
    data: {
      roundNumber: 1,
      status: 'OPEN',
      ticketPrice: 5.00,
      grossSales: 25.00,
      rolloverFromPrev: 0.00,
    },
  });

  await prisma.ticket.createMany({
    data: [
      { userId: alice.id, roundId: round1.id, digits: '481093' },
      { userId: alice.id, roundId: round1.id, digits: '481229' },
      { userId: alice.id, roundId: round1.id, digits: '903411' },
      { userId: alice.id, roundId: round1.id, digits: '128904' },
      { userId: alice.id, roundId: round1.id, digits: '480000' },
    ],
  });

  await prisma.transaction.create({
    data: {
      userId: alice.id,
      amount: 50.00,
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentProof: 'https://etherscan.io/tx/0xmockdep123',
      adminNote: 'Awaiting admin verification',
    },
  });

  console.log('✅ Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });