-- A paid order whose items were already fully gifted by someone else while
-- the buyer was paying. Nothing is fulfilled; an admin must refund it.
ALTER TYPE "OrderStatus" ADD VALUE 'NEEDS_REFUND';
