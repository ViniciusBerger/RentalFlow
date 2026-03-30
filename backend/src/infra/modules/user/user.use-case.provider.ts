
import { IUserRepository } from "../../../core/app/ports/IUserRepository";
import * as UseCases from "../../../core/domain/user/useCases";

// Helper to automate the manual wiring
const mapUseCase = (UseCaseClass: any) => ({
  provide: UseCaseClass,
  useFactory: (repo: IUserRepository) => new UseCaseClass(repo),
  inject: ['IUserRepository'],
});

export const UserUseCaseProviders = [
  mapUseCase(UseCases.CreateUserUseCase),
  mapUseCase(UseCases.DeleteUserUseCase),
  mapUseCase(UseCases.NewUserUseCase),
  mapUseCase(UseCases.CompleteProfileUseCase),
  mapUseCase(UseCases.FindUserUseCase),
  mapUseCase(UseCases.findAllUsersUseCase),
];