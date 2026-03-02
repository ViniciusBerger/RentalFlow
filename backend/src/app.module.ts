import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RentalModule } from './infra/modules/rental/rental.module';
import { DatabaseModule } from './infra/persistence/database.module';
import { AppController } from './web/controller/app.controller';
import { AuthModule } from './infra/modules/auth/auth.module';


@Module({
  imports: [
    RentalModule, 
    AuthModule,
    DatabaseModule, 
    ConfigModule.forRoot({isGlobal: true })],
    
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
