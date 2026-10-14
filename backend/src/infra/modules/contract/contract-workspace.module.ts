import {ContractFinalizationController} from './contract-finalization.controller';
import {ContractFinalizationService} from './contract-finalization.service';
import {Module} from '@nestjs/common';
import {ContractChangesController} from './contract-changes.controller';
import {ContractChangesService} from './contract-changes.service';
import {ContractAmendmentController} from './contract-amendment.controller';
import {ContractAmendmentService} from './contract-amendment.service';
import {ContractCancellationController} from './contract-cancellation.controller';
import {ContractCancellationService} from './contract-cancellation.service';
import {ContractWorkspaceController} from './contract-workspace.controller';
import {ContractWorkspaceService} from './contract-workspace.service';
@Module({controllers:[ContractWorkspaceController,ContractFinalizationController,ContractCancellationController,ContractAmendmentController,ContractChangesController],providers:[ContractWorkspaceService,ContractFinalizationService,ContractCancellationService,ContractAmendmentService,ContractChangesService]})
export class ContractWorkspaceModule {}
