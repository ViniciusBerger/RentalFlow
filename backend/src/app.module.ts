import { Module } from '@nestjs/common';
import {ContractQuestionnaireModule} from './infra/modules/contract/contract-questionnaire.module';
import {PrivateContractDocumentsModule} from './infra/security/private-contract-documents.module';
import { ConfigModule } from '@nestjs/config';
import { PropertyModule } from './infra/modules/property/property.module';
import { RentalModule } from './infra/modules/rental/rental.module';
import { DatabaseModule } from './infra/persistence/database.module';
import { AppController } from './web/controller/app.controller';
import { AuthModule } from './infra/modules/auth/auth.module';
import { UserModule } from './infra/modules/user/user.module';


@Module({
  imports: [
    PropertyModule,
    RentalModule, 
    AuthModule,
    UserModule,
    DatabaseModule,
    PrivateContractDocumentsModule,
    ContractQuestionnaireModule, 
    ConfigModule.forRoot({isGlobal: true })],
    
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
