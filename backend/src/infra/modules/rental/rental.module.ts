import { Module } from "@nestjs/common";
import { RentalController } from "../../../web/controller/rental.controller";
import { RentalUseCaseProviders } from "./rental.use-case.provider";
import { DrizzleOrmRentalAdapter } from "../../adapters/drizzle/rental/drizzle-rental-adapter";
import { BalanceController } from "src/web/controller/balance.controller";
import { ContractBookingService } from "../contract/contract-booking.service";

@Module({
  controllers: [RentalController, BalanceController],
  providers: [
    ...RentalUseCaseProviders,
    ContractBookingService, 
    {
      provide: 'IRentalRepository',
      useClass: DrizzleOrmRentalAdapter,
    },
  ]
})
export class RentalModule {}