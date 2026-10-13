import {Module} from '@nestjs/common';
import {ContractQuestionnaireController} from './contract-questionnaire.controller';
import {ContractQuestionnaireService} from './contract-questionnaire.service';
import {ContractReadinessService} from './contract-readiness.service';
@Module({controllers:[ContractQuestionnaireController],providers:[ContractQuestionnaireService,ContractReadinessService]})
export class ContractQuestionnaireModule {}
