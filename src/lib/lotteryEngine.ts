import crypto from 'crypto';

export function calculateMatchingBracket(ticketDigits: string, winningDigits: string): number {
  let matchedCount = 0;
  for (let i = 0; i < 6; i++) {
    if (ticketDigits[i] === winningDigits[i]) {
      matchedCount++;
    } else {
      break;
    }
  }
  return matchedCount;
}

export function generateRandomTicketDigits(): string {
  const digits: number[] = [];
  for (let i = 0; i < 6; i++) {
    digits.push(crypto.randomInt(0, 10));
  }
  return digits.join('');
}

const BRACKET_PERCENTAGES: Record<number, number> = {
  1: 0.02,
  2: 0.03,
  3: 0.05,
  4: 0.10,
  5: 0.20,
  6: 0.40
};

export function processLotteryDraw({ grossSales, previousRollover, tickets, winningDigits }: {
  grossSales: number;
  previousRollover: number;
  tickets: any[];
  winningDigits: string;
}) {
  const adminFee = grossSales * 0.20;
  const netRoundSales = grossSales * 0.80;
  const totalPrizePool = netRoundSales + previousRollover;

  const bracketBuckets: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const losingTickets: any[] = [];

  for (const ticket of tickets) {
    const bracket = calculateMatchingBracket(ticket.digits, winningDigits);
    ticket.matchedBracket = bracket;

    if (bracket > 0) {
      bracketBuckets[bracket].push(ticket);
    } else {
      ticket.payout = 0;
      losingTickets.push(ticket);
    }
  }

  let nextRollover = 0;
  const bracketSummary: Record<number, any> = {};
  const processedWinningTickets: any[] = [];

  for (let bracket = 1; bracket <= 6; bracket++) {
    const weight = BRACKET_PERCENTAGES[bracket] / 0.80;
    const bracketAllocatedPool = totalPrizePool * weight;
    const winnersCount = bracketBuckets[bracket].length;

    if (winnersCount > 0) {
      const payoutPerTicket = bracketAllocatedPool / winnersCount;
      for (const ticket of bracketBuckets[bracket]) {
        ticket.payout = Number(payoutPerTicket.toFixed(2));
        processedWinningTickets.push(ticket);
      }
      bracketSummary[bracket] = {
        winners: winnersCount,
        allocatedPool: bracketAllocatedPool,
        payoutPerTicket,
        rolledOver: 0
      };
    } else {
      nextRollover += bracketAllocatedPool;
      bracketSummary[bracket] = {
        winners: 0,
        allocatedPool: bracketAllocatedPool,
        payoutPerTicket: 0,
        rolledOver: bracketAllocatedPool
      };
    }
  }

  return {
    winningDigits,
    financials: {
      grossSales,
      adminFee,
      previousRollover,
      netPrizePool: totalPrizePool,
      nextRollover: Number(nextRollover.toFixed(2))
    },
    bracketSummary,
    winningTickets: processedWinningTickets,
    losingTickets
  };
}