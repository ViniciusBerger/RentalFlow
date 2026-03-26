import { Module } from "@nestjs/common";
import { CreateUserUseCase } from "src/core/domain/user/useCases/create-user/create-user.use-case";
import { IUserRepository } from "src/core/app/ports/IUserRepository";
import { DrizzleUsersOrmAdapter } from "src/infra/adapters/drizzle/user/drizzle-users-adapter";
import { NewUserUseCase } from "src/core/domain/user/useCases/new-user-process/new-user.use-case";
import { UserUseCaseProviders } from "./user.use-case.provider";
import { UserController } from "src/web/controller/user.controller";
import { CompleteProfileUseCase } from "src/core/domain/user/useCases/complete-profile/complete-profile.use-case";

@Module({
  controllers: [UserController],
  providers: [
      ...UserUseCaseProviders, 
      {
        provide: 'IUserRepository',
        useClass: DrizzleUsersOrmAdapter,
      },
    ],
  exports: [CreateUserUseCase, NewUserUseCase, CompleteProfileUseCase]
})
export class UserModule {}