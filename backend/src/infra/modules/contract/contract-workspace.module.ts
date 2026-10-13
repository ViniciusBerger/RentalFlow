import {ContractFinalizationController} from './contract-finalization.controller';
import {ContractFinalizationService} from './contract-finalization.service';
import {Module} from '@nestjs/common';
import {ContractWorkspaceController} from './contract-workspace.controller';
import {ContractWorkspaceService} from './contract-workspace.service';
@Module({controllers:[ContractWorkspaceController,ContractFinalizationController],providers:[ContractWorkspaceService,ContractFinalizationService]})
export class ContractWorkspaceModule {}
