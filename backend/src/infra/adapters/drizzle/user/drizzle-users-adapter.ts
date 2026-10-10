import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../../../../infra/persistence/database.module";
import { eq } from 'drizzle-orm';
import * as userSchema from '../../../persistence/schemas/user-schema';
import { UserRow, UserSchema } from "../../../persistence/schemas/user-schema";
import { IUserRepository } from "src/core/app/ports/IUserRepository";
import { User } from "../../../../core/domain/user/entity/user";

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

    async create(firebaseUid: string, email: string, firstName:string, lastName:string) {
        const user = await this.db.insert(UserSchema).values({
            firebaseUid: firebaseUid,
            email: email,
            firstName:firstName,
            lastName:lastName
        })

        return (user.rowCount ?? 0) > 0
    }

    async delete(firebaseUid: string) {
        const user = await this.db.delete(UserSchema).where(eq(UserSchema.firebaseUid, firebaseUid ))

        return (user.rowCount ?? 0) > 0
    }
    async update(id: string, toBeUpdated: { firstName?: string; lastName?: string }): Promise<boolean> {
        const updated = await this.db.update(UserSchema)
            .set(toBeUpdated)
            .where(eq(UserSchema.firebaseUid, id));
        return (updated.rowCount ?? 0) > 0;
    }
}