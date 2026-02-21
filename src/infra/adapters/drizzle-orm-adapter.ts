import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type{ IRentalRepository } from '../../core/app/ports/IRentalRepository';
import { RentalRow, RentalSchema } from '../persistence/rental-schema';
import * as schema from '../persistence/rental-schema';
import { and, eq, gt, lt } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../persistence/database.module';
import { Rental } from '../../core/domain/rental/entitiy/rental';



export class DrizzleOrmAdapter implements IRentalRepository {

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

    async update(id: string, toBeUpdated: Partial<RentalRow>): Promise<boolean> {
      const operationResult = await this.db
          .update(RentalSchema)
          .set(toBeUpdated)
          .where(eq(RentalSchema.id, id));

        // If no rows were affected, the ID didn't exist or no change was made
        if (operationResult.rowCount === 0) {
          return false;
        }

        return true;
}


  // Save receives a Rental object to be added on database
  async save(data: Rental) {
    const operationResult = await this.db.insert(RentalSchema).values({ clientFirstName: data.clientFirstName, clientLastName: data.clientLastName, startDate: data.startDate, endDate: data.endDate, revenue: data.revenue
    }).returning();

    if (!operationResult[0]) throw new Error("saving data to database failed")
    
    
    return operationResult[0]
  }

  async delete(id: string): Promise<boolean> {
        const operationResult = await this.db.delete(RentalSchema).where(eq(RentalSchema.id, id))

        // if no rows affected return false
        if (operationResult.rowCount===0) {
            return false
        }
        // default
        return true;
    }


  async getAll(): Promise<Rental[]> {
    const operationResult: RentalRow[] = await this.db.select().from(RentalSchema);
    
    const rentalsList:Rental[] = operationResult.map((r)=> 
        new Rental(r.clientFirstName, r.clientLastName, r.startDate, r.endDate, r.revenue, r.id, new Date(r.createdAt)))
    
    return rentalsList
  }


  async findOne(startDate: string, endDate:string): Promise<Rental>{
    const operationResult = await this.db.select().
                      from(RentalSchema)
                      .where(
                        and(
                          eq(RentalSchema.startDate, startDate),
                          eq(RentalSchema.endDate, endDate)
                        ))
    
    const rental = operationResult[0] ?? null
    if (rental == null) return rental

    return new Rental(rental.clientFirstName, rental.clientLastName, rental.startDate, rental.endDate, rental.revenue, rental.id, rental.createdAt)

  }

  async checkOverlapDate(startDate: string, endDate: string) {
    const overlap = await this.db.select()
                                  .from(RentalSchema)
                                  .where(and(
                                    lt(RentalSchema.startDate, endDate),
                                    gt(RentalSchema.endDate, startDate)
                                  )).limit(1)

    return overlap.length > 0
  }  
}