import {sql} from 'drizzle-orm';
import {bigint,check,foreignKey,index,pgTable,timestamp,unique,uuid,varchar} from 'drizzle-orm/pg-core';
import {ContractSchema} from './contract-schema';
import {RentalSchema} from './rental-schema';
export const ContractCancellationSchema=pgTable('contract_cancellations',{
 id:uuid('id').primaryKey().defaultRandom(),
 contractId:uuid('contract_id').notNull(),
 rentalId:uuid('rental_id').notNull(),
 userId:varchar('user_id',{length:128}).notNull(),
 actorId:varchar('actor_id',{length:128}).notNull(),
 transactionId:bigint('transaction_id',{mode:'number'}).notNull(),
 excludedRevenueCents:bigint('excluded_revenue_cents',{mode:'number'}).notNull(),
 excludedProfitCents:bigint('excluded_profit_cents',{mode:'number'}).notNull(),
 cancelledAt:timestamp('cancelled_at',{withTimezone:true}).notNull().defaultNow()
},t=>({
 contractOwnerFk:foreignKey({columns:[t.contractId,t.userId],
  foreignColumns:[ContractSchema.id,ContractSchema.userId],
  name:'contract_cancellations_contract_owner_fk'}).onDelete('restrict'),
 rentalOwnerFk:foreignKey({columns:[t.rentalId,t.userId],
  foreignColumns:[RentalSchema.id,RentalSchema.userId],
  name:'contract_cancellations_rental_owner_fk'}).onDelete('restrict'),
 onePerContract:unique('contract_cancellations_one_per_contract').on(t.contractId),
 ownerIdx:index('contract_cancellations_owner_idx').on(t.userId,t.cancelledAt),
 nonnegativeRevenue:check('contract_cancellations_nonnegative_revenue',sql.raw('"excluded_revenue_cents" >= 0'))
}));
