import { Module } from "@nestjs/common";
import { RentalController } from "../../web/rental.controller";
import { CreateRentalUseCase } from "../../core/domain/rental/useCases/create-rental.use-case";
import { IRentalRepository } from "../../core/app/ports/IRentalRepository";
import { DrizzleOrmAdapter } from "../adapters/drizzle-orm-adapter";
import { UpdateRentalUseCase } from "../../core/domain/rental/useCases/update-rental.use-case";
import { DeleteRentalUseCase } from "../../core/domain/rental/useCases/delete-rental.use-case";
import { FindRentalUseCase } from "../../core/domain/rental/useCases/find-rental.use-case";
import { FindAllRentalsUseCase } from "../../core/domain/rental/useCases/find-all.use-case";

@Module({
  controllers: [RentalController],
  providers: [
    // Your manual wiring goes here
    {
      provide: CreateRentalUseCase,
      useFactory: (repo: IRentalRepository) => new CreateRentalUseCase(repo),
      inject: ['IRentalRepository'],
    },{
      provide:UpdateRentalUseCase,
      useFactory: (repo: IRentalRepository) => new UpdateRentalUseCase(repo),
      inject: ['IRentalRepository'],
    },{
      provide: DeleteRentalUseCase,
      useFactory: (repo: IRentalRepository) => new DeleteRentalUseCase(repo),
      inject: ['IRentalRepository'],
    },{
      provide: FindRentalUseCase,
      useFactory: (repo: IRentalRepository) => new FindRentalUseCase(repo),
      inject: ['IRentalRepository'],
    },{
      provide: FindAllRentalsUseCase,
      useFactory: (repo: IRentalRepository) => new FindAllRentalsUseCase(repo),
      inject: ['IRentalRepository'],
    },{
      provide: 'IRentalRepository',
      useClass: DrizzleOrmAdapter,
    },
  ],
})
export class RentalModule {}