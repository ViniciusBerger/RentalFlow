import {ContractFinalizationController} from './contract-finalization.controller';
import {ContractFinalizationService} from './contract-finalization.service';
import {Module} from '@nestjs/common';
import {ContractAmendmentController} from './contract-amendment.controller';
import {ContractAmendmentService} from './contract-amendment.service';
import {ContractCancellationController} from './contract-cancellation.controller';
import {ContractCancellationService} from './contract-cancellation.service';
import {ContractWorkspaceController} from './contract-workspace.controller';
import {ContractWorkspaceService} from './contract-workspace.service';
@Module({controllers:[ContractWorkspaceController,ContractFinalizationController,ContractCancellationController,ContractAmendmentController],providers:[ContractWorkspaceService,ContractFinalizationService,ContractCancellationService,ContractAmendmentService]})
export class ContractWorkspaceModule {}
