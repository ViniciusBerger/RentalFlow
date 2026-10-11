import {Module} from '@nestjs/common';
import {ContractWorkspaceController} from './contract-workspace.controller';
import {ContractWorkspaceService} from './contract-workspace.service';
@Module({controllers:[ContractWorkspaceController],providers:[ContractWorkspaceService]})
export class ContractWorkspaceModule {}
