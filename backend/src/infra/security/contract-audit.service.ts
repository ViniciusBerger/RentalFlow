import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../persistence/database.module';
import { ContractAuditEventSchema } from '../persistence/schemas/contract-security-schema';
/** Allowlisted audit metadata only: no raw identifiers, guest values or payloads. */
export type ContractAuditAction = 'VIEW_PDF'|'CREATE_DRAFT'|'UPDATE_GUEST'|'UPDATE_LANDLORD'|'OVERRIDE_FEE'|'PUBLISH_TEMPLATE'|'FINALIZE'|'AMEND'|'CANCEL';
export type AuditOutcome = 'SUCCESS'|'DENIED'|'FAILED';
@Injectable()
export class ContractAuditService {
 constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}
 async record(event:{userId:string;actorId:string;action:ContractAuditAction;
   targetType:'CONTRACT'|'RENTAL'|'TEMPLATE';targetId:string;outcome:AuditOutcome}) {
   await this.db.insert(ContractAuditEventSchema).values(event);
 }
}
