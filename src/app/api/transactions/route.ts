import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId, type, amount, paymentProof } = await request.json();

    if (!userId || !type || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'WITHDRAWAL') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || Number(user.balance) < Number(amount)) {
        return NextResponse.json({ error: 'Insufficient balance for withdrawal request' }, { status: 400 });
      }
    }

    const tx = await prisma.transaction.create({
      data: {
        userId,
        amount: Number(amount),
        type,
        status: 'PENDING',
        paymentProof: paymentProof || null,
      },
    });

    return NextResponse.json({ success: true, transaction: tx });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { transactionId, action, adminId } = await request.json();

    if (!transactionId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const updatedTx = await prisma.$transaction(async (tx) => {
      const pendingTx = await tx.transaction.findUnique({ where: { id: transactionId } });
      if (!pendingTx || pendingTx.status !== 'PENDING') {
        throw new Error('Transaction not found or already processed.');
      }

      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

      if (action === 'APPROVE') {
        if (pendingTx.type === 'DEPOSIT') {
          await tx.user.update({
            where: { id: pendingTx.userId },
            data: { balance: { increment: pendingTx.amount } },
          });
        } else if (pendingTx.type === 'WITHDRAWAL') {
          const user = await tx.user.findUnique({ where: { id: pendingTx.userId } });
          if (!user || Number(user.balance) < Number(pendingTx.amount)) {
            throw new Error('User balance is insufficient to finalize withdrawal.');
          }
          await tx.user.update({
            where: { id: pendingTx.userId },
            data: { balance: { decrement: pendingTx.amount } },
          });
        }
      }

      return await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          approvedBy: adminId || 'ADMIN',
        },
      });
    });

    return NextResponse.json({ success: true, transaction: updatedTx });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}