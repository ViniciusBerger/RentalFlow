import {ContractFinalizationController} from './contract-finalization.controller';
import {ContractFinalizationService} from './contract-finalization.service';
import {Module} from '@nestjs/common';
import {ContractChangesController} from './contract-changes.controller';
import {ContractChangesService} from './contract-changes.service';
import {ContractWorkspaceController} from './contract-workspace.controller';
import {ContractWorkspaceService} from './contract-workspace.service';
@Module({controllers:[ContractWorkspaceController,ContractFinalizationController,ContractChangesController],providers:[ContractWorkspaceService,ContractFinalizationService,ContractChangesService]})
export class ContractWorkspaceModule {}
