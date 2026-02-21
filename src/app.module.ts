import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RentalModule } from './infra/modules/rental.module';
import { DatabaseModule } from './infra/persistence/database.module';


@Module({
  imports: [
    RentalModule, 
    DatabaseModule, 
    ConfigModule.forRoot({
      isGlobal: true, 
    }),],
  controllers: [],
  providers: [],
})
export class AppModule {}
