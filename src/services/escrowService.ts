import { calculateEscrow, releaseEscrow } from '../utils/business';
import { IBuyer, IPool, IEscrowAccount } from '../types';

/**
 * Create a new escrow account for a pool and lock the buyer's payment.
 */
export function createEscrow(pool: IPool, buyer: IBuyer): IEscrowAccount {
  const escrow = calculateEscrow(pool, buyer);
  // Log the escrow creation audit event
  // const audit = logAudit(AuditActionType.escrow_funded, buyer.id, 'escrow', escrow.id, { poolId: pool.id });
  // In a real integration, dispatch the audit log via the context.
  return escrow;
}

/**
 * Release the escrow after delivery verification.
 * Returns the updated escrow record with status 'released'.
 */
export function completeEscrow(escrow: IEscrowAccount): IEscrowAccount {
  const released = releaseEscrow(escrow);
  // Log the escrow release audit event
  // const audit = logAudit(AuditActionType.payment_released, '', 'escrow', escrow.id, { releasedAt: released.releasedAt });
  // dispatch(audit);
  return released;
}