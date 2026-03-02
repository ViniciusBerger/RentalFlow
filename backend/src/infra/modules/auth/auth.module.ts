import { Global, Module } from "@nestjs/common";
import { AuthController } from "../../../web/controller/auth.controller";
import { AuthenticateUseCase, ValidateTokenUseCase } from "src/core/domain/auth/useCase";
import { IAuthPort } from "src/core/app/ports/IAuthPort";
import { FirebaseAuthAdapter } from "src/infra/adapters/firebase/firebase-auth.adapter";
import { FirebaseModule } from "./firebase.module";

@Global()
@Module({
  imports:[FirebaseModule],
  controllers: [AuthController],
  providers: [{
    provide: AuthenticateUseCase,
    useFactory: (authPort: IAuthPort) => new AuthenticateUseCase(authPort),
    inject:['IAuthPort']

  },{
    provide: ValidateTokenUseCase,
    useFactory: (authPort: IAuthPort) => new ValidateTokenUseCase(authPort),
    inject:['IAuthPort']
  },{
    provide: 'IAuthPort',
    useClass: FirebaseAuthAdapter
  }],

  exports: [ValidateTokenUseCase],
})
export class AuthModule {}