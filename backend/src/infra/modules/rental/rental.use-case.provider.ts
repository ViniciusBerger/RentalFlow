import { IRentalRepository } from "../../../core/app/ports/IRentalRepository";
import * as UseCases from "../../../core/domain/rental/useCases";

// Helper to automate the manual wiring
const mapUseCase = (UseCaseClass: any) => ({
  provide: UseCaseClass,
  useFactory: (repo: IRentalRepository) => new UseCaseClass(repo),
  inject: ['IRentalRepository'],
});

export const RentalUseCaseProviders = [
  mapUseCase(UseCases.CreateRentalUseCase),
  mapUseCase(UseCases.UpdateRentalUseCase),
  mapUseCase(UseCases.DeleteRentalUseCase),
  mapUseCase(UseCases.FindRentalUseCase),
  mapUseCase(UseCases.FindAllRentalsUseCase),
  mapUseCase(UseCases.GetBalanceUseCase),
];