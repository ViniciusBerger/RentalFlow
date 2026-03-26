import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RentalModule } from './infra/modules/rental/rental.module';
import { DatabaseModule } from './infra/persistence/database.module';
import { AppController } from './web/controller/app.controller';
import { AuthModule } from './infra/modules/auth/auth.module';
import { UserModule } from './infra/modules/user/user.module';


@Module({
  imports: [
    RentalModule, 
    AuthModule,
    UserModule,
    DatabaseModule, 
    ConfigModule.forRoot({isGlobal: true })],
    
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
