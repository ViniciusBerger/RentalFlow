import {Inject,Injectable,NotFoundException,ConflictException} from '@nestjs/common';
import {and,desc,eq} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {DRIZZLE} from '../../persistence/database.module';
import {ContractSchema} from '../../persistence/schemas/contract-schema';
import {ContractRevisionSchema} from '../../persistence/schemas/contract-revision-schema';
import {ContractTemplateVersionSchema} from '../../persistence/schemas/contract-template-version-schema';
import {RentalSchema} from '../../persistence/schemas/rental-schema';
import {RentalInstallmentSchema} from '../../persistence/schemas/rental-installment-schema';
import {cancellationQuote} from '../../../core/domain/contract/contract-changes';
import type {ContractPolicy} from '../../../core/domain/contract/contract-questionnaire';

@Injectable()
export class ContractChangesService{
 constructor(@Inject(DRIZZLE) private readonly db:NodePgDatabase){}
 /** Read-only and authoritative: never trust a browser-supplied price, payment or policy. */
 async cancellationPreview(uid:string,contractId:string){
  if(!uid)throw new NotFoundException();
  const [contract]=await this.db.select().from(ContractSchema).where(and(
   eq(ContractSchema.id,contractId),eq(ContractSchema.userId,uid))).limit(1);
  if(!contract)throw new NotFoundException('Contract not found');
  const [rental]=await this.db.select().from(RentalSchema).where(and(
   eq(RentalSchema.id,contract.rentalId),eq(RentalSchema.userId,uid))).limit(1);
  if(!rental)throw new NotFoundException('Booking not found');
  if(!rental.isActive)throw new ConflictException('Booking is already inactive');
  const [revision]=await this.db.select().from(ContractRevisionSchema).where(and(
   eq(ContractRevisionSchema.contractId,contractId),eq(ContractRevisionSchema.userId,uid)))
   .orderBy(desc(ContractRevisionSchema.versionNumber)).limit(1);
  if(!revision?.templateVersionId)throw new ConflictException('Approved contract policy is required');
  const [template]=await this.db.select().from(ContractTemplateVersionSchema).where(and(
   eq(ContractTemplateVersionSchema.id,revision.templateVersionId),
   eq(ContractTemplateVersionSchema.userId,uid))).limit(1);
  const policy=template?.policySnapshot as ContractPolicy|undefined;
  if(!policy||!Number.isInteger(policy.cancellationDays))
   throw new ConflictException('Contract cancellation policy is incomplete');
  const installments=await this.db.select({
   agreedCents:RentalInstallmentSchema.agreedCents,receivedCents:RentalInstallmentSchema.receivedCents
  }).from(RentalInstallmentSchema).where(and(
   eq(RentalInstallmentSchema.userId,uid),eq(RentalInstallmentSchema.rentalId,rental.id)));
  const received=installments.reduce((n,p)=>n+p.receivedCents,0);
  const expected=Math.round(rental.revenue*100);
  if(installments.length===0||installments.some(p=>!Number.isSafeInteger(p.receivedCents)||
   p.receivedCents<0)||!Number.isSafeInteger(expected)||expected<0||
   installments.reduce((n,p)=>n+p.agreedCents,0)!==expected)
   throw new ConflictException('Payment ledger is inconsistent');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',
   year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const datePart=(kind:string)=>parts.find(x=>x.type===kind)?.value??'';
  const today=[datePart('year'),datePart('month'),datePart('day')].join('-');
  const quote=cancellationQuote({startDate:rental.startDate,cancelledOn:today,
   cancelDays:policy.cancellationDays,paidCents:received,agreedTotalCents:expected});
  return {contractId,bookingId:rental.id,revisionId:revision.id,
   ...quote,requiresLandlordConfirmation:true,
   refundExecutionStatus:'NOT_AVAILABLE' as const,
   cancellationStatus:'PREVIEW_ONLY' as const};
 }
}
