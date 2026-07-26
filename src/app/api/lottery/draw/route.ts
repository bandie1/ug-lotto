import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processLotteryDraw, generateRandomTicketDigits } from '@/lib/lotteryEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const activeRound = await prisma.round.findFirst({
      where: { status: 'OPEN' },
      include: { tickets: true },
    });

    if (!activeRound) {
      return NextResponse.json({ error: 'No active open round to draw.' }, { status: 400 });
    }

    const winningDigits = body.winningDigits || generateRandomTicketDigits();

    const drawResult = processLotteryDraw({
      grossSales: Number(activeRound.grossSales),
      previousRollover: Number(activeRound.rolloverFromPrev),
      tickets: activeRound.tickets,
      winningDigits,
    });

    await prisma.$transaction(async (tx) => {
      await tx.round.update({
        where: { id: activeRound.id },
        data: {
          winningDigits: drawResult.winningDigits,
          status: 'COMPLETED',
          adminFee: drawResult.financials.adminFee,
          completedAt: new Date(),
        },
      });

      for (const ticket of [...drawResult.winningTickets, ...drawResult.losingTickets]) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            matchedBracket: ticket.matchedBracket,
            payout: ticket.payout,
          },
        });
      }

      for (const winningTicket of drawResult.winningTickets) {
        if (winningTicket.payout > 0) {
          await tx.user.update({
            where: { id: winningTicket.userId },
            data: { balance: { increment: winningTicket.payout } },
          });

          await tx.transaction.create({
            data: {
              userId: winningTicket.userId,
              amount: winningTicket.payout,
              type: 'LOTTERY_PAYOUT',
              status: 'APPROVED',
              adminNote: `Match Bracket ${winningTicket.matchedBracket} prize payout for Round #${activeRound.roundNumber}`,
            },
          });
        }
      }

      await tx.systemStats.update({
        where: { id: 1 },
        data: { totalAdminRevenue: { increment: drawResult.financials.adminFee } },
      });

      await tx.round.create({
        data: {
          roundNumber: activeRound.roundNumber + 1,
          status: 'OPEN',
          ticketPrice: activeRound.ticketPrice,
          grossSales: 0.00,
          rolloverFromPrev: drawResult.financials.nextRollover,
        },
      });
    });

    return NextResponse.json({ success: true, drawResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}