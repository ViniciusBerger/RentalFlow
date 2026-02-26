import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { IRentalRepository } from '../../core/app/ports/IRentalRepository';
import { RentalRow, RentalSchema } from '../persistence/rental-schema';
import * as schema from '../persistence/rental-schema';
import { and, desc, eq, gt, lt, sql, sum } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../persistence/database.module';
import { Rental } from '../../core/domain/rental/entitiy/rental';

/**
 * Drizzle ORM implementation of the IRentalRepository.
 * Handles database operations for Rental entities using PostgreSQL.
 */
export class DrizzleOrmAdapter implements IRentalRepository {

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Updates specific fields of a rental record by ID.
   * @returns Promise resolving to true if a row was updated, false otherwise.
   */
  async update(id: string, toBeUpdated: Partial<RentalRow>): Promise<boolean> {
    const operationResult = await this.db
      .update(RentalSchema)
      .set(toBeUpdated)
      .where(eq(RentalSchema.id, id));

    if (operationResult.rowCount === 0) {
      return false;
    }

    return true;
  }

  /**
   * Inserts a new Rental record into the database.
   * @throws Error if the insert operation fails to return the saved row.
   */
  async save(data: Rental) {
    const operationResult = await this.db.insert(RentalSchema).values({
      clientFirstName: data.clientFirstName,
      clientLastName: data.clientLastName,
      startDate: data.startDate,
      endDate: data.endDate,
      guests: data.guests,
      revenue: data.revenue,
      profit: data.profit,
      fee: data.fee
    }).returning();

    if (!operationResult[0]) throw new Error("saving data to database failed")

    return operationResult[0]
  }

  /**
   * Removes a rental record by its unique ID.
   * @returns Promise resolving to true if deleted, false if ID not found.
   */
  async delete(id: string): Promise<boolean> {
    const operationResult = await this.db.delete(RentalSchema).where(eq(RentalSchema.id, id))

    if (operationResult.rowCount === 0) {
      return false
    }
    return true;
  }

  /**
   * Retrieves all rental records and maps them to Domain Rental entities.
   */
  async getAll(): Promise<Rental[]> {
    const operationResult: RentalRow[] = await this.db.select().from(RentalSchema);

    const rentalsList: Rental[] = operationResult.map((rental) =>
      new Rental(
          rental.clientFirstName,
          rental.clientLastName,
          rental.startDate,
          rental.endDate,
          rental.guests,
          rental.revenue,
          rental.profit,
          rental.fee,
          rental.id, 
          rental.createdAt.toISOString(), 
          rental.isActive
      ))

    return rentalsList
  }

  /**
   * Finds a specific rental record by its start and end date.
   * @returns Rental entity if found, otherwise null.
   */
  async findOne(startDate: string, endDate: string): Promise<Rental> {
    const operationResult = await this.db.select().
      from(RentalSchema)
      .where(
        and(
          eq(RentalSchema.startDate, startDate),
          eq(RentalSchema.endDate, endDate)
        ))

    const rental = operationResult[0] ?? null
    if (rental === null) return rental

    return new Rental(
    rental.clientFirstName,
    rental.clientLastName,
    rental.startDate,
    rental.endDate,
    rental.guests,
    rental.revenue,
    rental.profit,
    rental.fee,
    rental.id, 
    rental.createdAt.toISOString(), 
    rental.isActive
);
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
      .where(
        sql`${RentalSchema.startDate} >= DATE_TRUNC('year', NOW())`
      )
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
      .where(
        sql`${RentalSchema.startDate} >= DATE_TRUNC('year', NOW())`
      )
      .groupBy(sql`year_label`)
      .orderBy(desc(sql`year_label`));
  }
}