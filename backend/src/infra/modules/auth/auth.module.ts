import { Global, Module } from "@nestjs/common";
import { AuthController } from "../../../web/controller/auth.controller";
import { AuthenticateUseCase } from "../../../core/domain/auth/useCase/authenticate/authenticate.use-case";
import { IAuthPort } from "src/core/app/ports/IAuthPort";
import { IUserRepository } from "src/core/app/ports/IUserRepository";
import { FirebaseAuthAdapter } from "src/infra/adapters/firebase/firebase-auth.adapter";
import { FirebaseModule } from "./firebase.module";
import { UserModule } from "../user/user.module";
import { CompleteProfileUseCase } from "src/core/domain/user/useCases/complete-profile/complete-profile.use-case";
@Global()
@Module({
  imports: [FirebaseModule, UserModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthenticateUseCase,
      // Remove 'async' and just return the new instance
      useFactory: (authPort: IAuthPort) => {return new AuthenticateUseCase(authPort)},
      inject: ['IAuthPort'],
    },
    {
      provide: 'IAuthPort',
      useClass: FirebaseAuthAdapter,
    },
  ],
  exports: ['IAuthPort', AuthenticateUseCase], // Export both so Guards and Controllers can use them
})
export class AuthModule {}