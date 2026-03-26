import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../../../../infra/persistence/database.module";
import { and, desc, eq, gt, lt, sql, sum } from 'drizzle-orm';
import * as userSchema from '../../../persistence/schemas/user-schema';
import { UserRow, UserSchema } from "../../../persistence/schemas/user-schema";
import { IUserRepository } from "src/core/app/ports/IUserRepository";
import { User } from "../../../../core/domain/user/entity/user";
import { PersistenceError } from "src/core/app/errors/persistence.error";

export class DrizzleUsersOrmAdapter implements IUserRepository {
    constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof userSchema>){}
    
    async select(firebaseUid: string): Promise<User | null> {
        const result = await this.db.select().from(UserSchema).where(eq(UserSchema.firebaseUid, firebaseUid));
        const userRow = result[0] ?? null;

        if (!userRow) return null;
        return User.create(userRow);
    }

    /**
       * Retrieves all rental records and maps them to Domain Rental entities.
       * @returns a list with all rentals
       */
    async findAll(): Promise<User[]> {
        const operationResult: UserRow[] = await this.db.select().from(UserSchema)
    
        const usersList: User[] = operationResult.map((user) => User.create(user))
        return usersList
      }

    async create(firebaseUid: string, firstName:string, lastName:string, email: string) {
        const user = await this.db.insert(UserSchema).values({
            firebaseUid: firebaseUid,
            firstName:firstName,
            lastName:lastName,
            email: email
        })

        return user
    }

    async delete(firebaseUid: string) {
        const user = await this.db.delete(UserSchema).where(eq(UserSchema.firebaseUid, firebaseUid ))

        if (user.rowCount == null) return false
        return true
    }
    update(id: string, toBeUpdated: any) {
        throw new Error("Method not implemented.");
    }
}