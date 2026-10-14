import {sql} from 'drizzle-orm';
import {bigint,boolean,check,foreignKey,index,jsonb,pgTable,timestamp,unique,uuid,varchar} from 'drizzle-orm/pg-core';
import {ContractSchema} from './contract-schema';
import {RentalSchema} from './rental-schema';
import {ContractRevisionSchema} from './contract-revision-schema';

export type AmendmentFacts={propertyId:string;startDate:string;endDate:string;
 guests:number;revenueCents:number;feeCents:number;profitCents:number};
export const ContractAmendmentSchema=pgTable('contract_amendments',{
 id:uuid('id').primaryKey().defaultRandom(),
 contractId:uuid('contract_id').notNull(),
 rentalId:uuid('rental_id').notNull(),
 userId:varchar('user_id',{length:128}).notNull(),
 actorId:varchar('actor_id',{length:128}).notNull(),
 fromRevisionId:uuid('from_revision_id').notNull().references(()=>ContractRevisionSchema.id,{onDelete:'restrict'}),
 toRevisionId:uuid('to_revision_id').notNull().references(()=>ContractRevisionSchema.id,{onDelete:'restrict'}),
 transactionId:bigint('transaction_id',{mode:'number'}).notNull(),
 beforeFacts:jsonb('before_facts').$type<AmendmentFacts>().notNull(),
 afterFacts:jsonb('after_facts').$type<AmendmentFacts>().notNull(),
 paymentChanged:boolean('payment_changed').notNull().default(false),
 approvedAt:timestamp('approved_at',{withTimezone:true}).notNull().defaultNow()
},t=>({
 contractOwnerFk:foreignKey({columns:[t.contractId,t.userId],
  foreignColumns:[ContractSchema.id,ContractSchema.userId],name:'contract_amendments_contract_owner_fk'}).onDelete('restrict'),
 rentalOwnerFk:foreignKey({columns:[t.rentalId,t.userId],
  foreignColumns:[RentalSchema.id,RentalSchema.userId],name:'contract_amendments_rental_owner_fk'}).onDelete('restrict'),
 newRevisionUnique:unique('contract_amendments_new_revision_unique').on(t.toRevisionId),
 ownerIdx:index('contract_amendments_owner_idx').on(t.userId,t.approvedAt),
 factsCheck:check('contract_amendments_valid_facts',sql.raw("jsonb_typeof(before_facts)='object' AND jsonb_typeof(after_facts)='object' AND before_facts<>after_facts"))
}));
