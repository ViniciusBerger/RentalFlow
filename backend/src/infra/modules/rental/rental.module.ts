import { Module } from "@nestjs/common";
import { RentalController } from "../../../web/controller/rental.controller";
import { RentalUseCaseProviders } from "./rental.use-case.provider";
import { DrizzleOrmAdapter } from "../../adapters/drizzle/drizzle-orm-adapter";
import { BalanceController } from "src/web/controller/balance.controller";

@Module({
  controllers: [RentalController, BalanceController],
  providers: [
    ...RentalUseCaseProviders, 
    {
      provide: 'IRentalRepository',
      useClass: DrizzleOrmAdapter,
    },
  ]
})
export class RentalModule {}