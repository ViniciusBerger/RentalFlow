import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../../../../infra/persistence/database.module";
import { and, desc, eq, gt, lt, sql, sum } from 'drizzle-orm';
import * as userSchema from '../../../persistence/schemas/user-schema';
import { UserSchema } from "../../../persistence/schemas/user-schema";
import { IUserRepository } from "src/core/app/ports/IUserRepository";
import { User } from "../../../../core/domain/user/entity/user";
import { PersistenceError } from "src/core/app/errors/persistence.error";

export class DrizzleUsersOrmAdapter implements IUserRepository {
    constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof userSchema>){}
    
    async select(id: string){
        const user = await this.db.select().from(UserSchema).where(eq(UserSchema.id, id))
        if (!user) throw new PersistenceError('Sorry error while selecting user')
        return User.create(user)
    }

    async create(firstName:string, lastName:string, email:string) {
        const user = await this.db.insert(UserSchema).values({
            firstName:firstName,
            lastName:lastName,
            email: email,
        })
    }

    delete(id: string) {
        throw new Error("Method not implemented.");
    }
    update(id: string, toBeUpdated: any) {
        throw new Error("Method not implemented.");
    }
}