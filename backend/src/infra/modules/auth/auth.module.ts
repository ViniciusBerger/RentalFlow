import { Global, Module } from "@nestjs/common";
import { AuthController } from "../../../web/controller/auth.controller";
import { AuthenticateUseCase } from "../../../core/domain/auth/useCase/authenticate/authenticate.use-case";
import { IAuthPort } from "src/core/app/ports/IAuthPort";
import { FirebaseAuthAdapter } from "src/infra/adapters/firebase/firebase-auth.adapter";
import { FirebaseModule } from "./firebase.module";
import { UserModule } from "../user/user.module";

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