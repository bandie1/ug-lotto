import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRandomTicketDigits } from '@/lib/lotteryEngine';

export async function POST(request: Request) {
  try {
    const { userId, quantity = 1 } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeRound = await tx.round.findFirst({ where: { status: 'OPEN' } });
      if (!activeRound) throw new Error('No active open round found.');

      const ticketPrice = Number(activeRound.ticketPrice);
      const totalCost = ticketPrice * quantity;

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || Number(user.balance) < totalCost) {
        throw new Error('Insufficient wallet balance.');
      }

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: totalCost } },
      });

      await tx.round.update({
        where: { id: activeRound.id },
        data: { grossSales: { increment: totalCost } },
      });

      const ticketsToCreate = [];
      for (let i = 0; i < quantity; i++) {
        ticketsToCreate.push({
          userId,
          roundId: activeRound.id,
          digits: generateRandomTicketDigits(),
        });
      }

      await tx.ticket.createMany({ data: ticketsToCreate });

      await tx.transaction.create({
        data: {
          userId,
          amount: totalCost,
          type: 'TICKET_PURCHASE',
          status: 'APPROVED',
          adminNote: `Purchased ${quantity} ticket(s) for Round #${activeRound.roundNumber}`,
        },
      });

      return { quantity, totalCost, roundNumber: activeRound.roundNumber };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}