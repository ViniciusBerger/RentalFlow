import {Module} from '@nestjs/common';
import {PrivateContractDocumentsController} from './private-contract-documents.controller';
import {PrivateContractDocumentsService} from './private-contract-documents.service';
import {ContractAuditService} from './contract-audit.service';
@Module({controllers:[PrivateContractDocumentsController],providers:[PrivateContractDocumentsService,ContractAuditService]})
export class PrivateContractDocumentsModule {}
