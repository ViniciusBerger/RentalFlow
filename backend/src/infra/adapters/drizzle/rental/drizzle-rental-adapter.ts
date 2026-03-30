import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, gt, lt, sql, sum } from 'drizzle-orm';
import { Inject } from '@nestjs/common';

import { RentalRow, RentalSchema } from '../../../persistence/schemas/rental-schema';
import { DRIZZLE } from '../../../persistence/database.module';
import * as rentalSchema from '../../../persistence/schemas/rental-schema';

import { Rental } from '../../../../core/domain/rental/entity/rental';
import type { IRentalRepository } from '../../../../core/app/ports/IRentalRepository';
import { PersistenceError } from '../../../../core/app/errors/persistence.error';

/**
 * Drizzle ORM implementation of the IRentalRepository.
 * Handles database operations for Rental entities using PostgreSQL.
 */
export class DrizzleOrmRentalAdapter implements IRentalRepository {

  // inject database instance
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof rentalSchema>) {}

   /**
   * Inserts a new Rental record into the database.
   * @throws Error if the insert operation fails to return the saved row.
   * @returns client first name, client last name, start and end date (as string)
   */
  async save(data: Rental): Promise<{userId: string, clientFirstName:string, clientLastName:string, startDate: string, endDate: string, guests:number, revenue: number, fee: number, profit:number}> {
    const operationResult = await this.db.insert(RentalSchema).values({
      userId: data.userId,
      clientFirstName: data.clientFirstName,
      clientLastName: data.clientLastName,
      startDate: data.startDate,
      endDate: data.endDate,
      guests: data.guests,
      revenue: data.revenue,
      profit: data.profit,
      fee: data.fee
    }).returning({ userId:RentalSchema.userId, clientFirstName:RentalSchema.clientFirstName, clientLastName:RentalSchema.clientLastName, startDate: RentalSchema.startDate, endDate: RentalSchema.endDate, guests: RentalSchema.guests, revenue:RentalSchema.revenue, fee:RentalSchema.fee, profit: RentalSchema.profit});

    if (!operationResult[0]) throw new PersistenceError('error saving rental')
    return operationResult[0] // rental added
  }

  /**
   * Updates specific fields of a rental record by ID.
   * @returns Promise resolving to true if a row was updated, false otherwise.
   */
  async update(id: string, toBeUpdated: Partial<RentalRow>): Promise<boolean> {
    const operationResult = await this.db.update(RentalSchema).set(toBeUpdated).where(eq(RentalSchema.id, id));
    if (operationResult.rowCount === 0) throw new PersistenceError('cannot update item');
    return true;
  }

  /**
   * Removes a rental record by its unique ID.
   * @returns Promise resolving to true if deleted, false if ID not found.
   */
  async delete(id: string): Promise<boolean> {
    const operationResult = await this.db.delete(RentalSchema).where(eq(RentalSchema.id, id))
    if (operationResult.rowCount === 0) throw new PersistenceError('cannot delete item')
    return true;
  }

  /**
   * Finds a specific rental record by its start and end date.
   * @returns Rental entity if found, otherwise null.
   */
  async findOne(startDate: string, endDate: string): Promise<Rental> {
    const operationResult = await this.db.select().
      from(RentalSchema)
      .where(and(
          eq(RentalSchema.startDate, startDate),
          eq(RentalSchema.endDate, endDate)
        ))

    const rental = operationResult[0] ?? null
    if (rental === null) return rental

    return Rental.create(rental)
  }

  /**
   * Retrieves all rental records and maps them to Domain Rental entities.
   * @returns a list with all rentals
   */
  async findAll(userId: string): Promise<Rental[]> {
    const operationResult: RentalRow[] = await this.db.select().from(RentalSchema).where(and(eq(RentalSchema.isActive, true), eq(RentalSchema.userId, userId)));

    const rentalsList: Rental[] = operationResult.map((rental) => Rental.create(rental))
    return rentalsList
  }

  /**
   * It retrieves the next three rentals from today's date and on.
   * @returns return a list with these three rentals
   */
  async findNextThree(): Promise<Rental[]> {
    const operationResult:RentalRow[] = await this.db.select().from(RentalSchema).where(and(
      sql`${RentalSchema.startDate} >=DATE_TRUNC('year', now())`, 
      eq(RentalSchema.isActive, true)
    )).limit(3);
    
    if (!operationResult[0]) throw new PersistenceError('Error fetching next rentals')
    return operationResult.map(rental => Rental.create(rental))
  
  }

  /**
   * Checks if any existing rental dates conflict with the provided date range.
   * @returns True if an overlap exists, false otherwise.
   */
  async checkOverlapDate(startDate: string, endDate: string) {
    const overlap = await this.db.select()
      .from(RentalSchema)
      .where(and(
        lt(RentalSchema.startDate, endDate),
        gt(RentalSchema.endDate, startDate)
      )).limit(1)

    return overlap.length > 0
  }

  /**
   * Calculates revenue grouped by month for the current calendar year.
   * @returns A promise resolving to an array of objects for each month 
   * in the current year. Format: { label: "2026-02", totalRevenue: 12500 }
   */
  async getMonthlyBalanceCurrentYear() {
    return await this.db
      .select({
        label: sql<string>`TO_CHAR(${RentalSchema.startDate}, 'YYYY-MM')`.as('month_label'),
        totalRevenue: sum(RentalSchema.revenue).mapWith(Number),
        totalProfit: sum(RentalSchema.profit).mapWith(Number)
      })
      .from(RentalSchema)
      .where(and(
        eq(RentalSchema.isActive, true),
        sql`${RentalSchema.startDate} >= DATE_TRUNC('year', NOW())`
      ))
      .groupBy(sql`month_label`)
      .orderBy(sql`month_label`);
  }

  /**
   * Calculates total revenue for the current calendar year only.
   * @returns A promise resolving to an array containing a single object 
   * for the current year. Format: { label: "2026", totalRevenue: 50000 }
   */
  async getYearlyBalanceCurrentYear() {
    return await this.db
      .select({
        label: sql<string>`TO_CHAR(${RentalSchema.startDate}, 'YYYY')`.as('year_label'),
        totalRevenue: sum(RentalSchema.revenue).mapWith(Number),
        totalProfit: sum(RentalSchema.profit).mapWith(Number)
      })
      .from(RentalSchema)
      .where(and(
        eq(RentalSchema.isActive, true),
        sql`${RentalSchema.startDate} >= DATE_TRUNC('year', NOW())`
      ))
      .groupBy(sql`year_label`)
      .orderBy(desc(sql`year_label`));
  }

}