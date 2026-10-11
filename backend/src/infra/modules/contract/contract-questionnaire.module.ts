import {Module} from '@nestjs/common';
import {ContractQuestionnaireController} from './contract-questionnaire.controller';
import {ContractQuestionnaireService} from './contract-questionnaire.service';
@Module({controllers:[ContractQuestionnaireController],providers:[ContractQuestionnaireService]})
export class ContractQuestionnaireModule {}
