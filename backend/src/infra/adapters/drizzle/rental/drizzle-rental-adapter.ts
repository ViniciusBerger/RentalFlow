import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, desc, eq, gt, lt, sql, sum } from 'drizzle-orm';
import { Inject } from '@nestjs/common';

import { RentalRow, RentalSchema } from '../../../persistence/schemas/rental-schema';
import { DRIZZLE } from '../../../persistence/database.module';
import * as rentalSchema from '../../../persistence/schemas/rental-schema';
import { PropertySchema } from '../../../persistence/schemas/property-schema';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { Rental } from '../../../../core/domain/rental/entity/rental';
import type { IRentalRepository } from '../../../../core/app/ports/IRentalRepository';
import { PersistenceError } from '../../../../core/app/errors/persistence.error';

/**
 * Drizzle ORM implementation of the IRentalRepository.
 * Handles database operations for Rental entities using PostgreSQL.
 */
export class DrizzleOrmRentalAdapter implements IRentalRepository {

  private throwBookingConstraint(error: unknown): never {
    const code=(error as {code?:string,cause?:{code?:string}})?.code ?? (error as {cause?:{code?:string}})?.cause?.code;
    if(code==='23P01') throw new ConflictException('Date already booked for this property');
    if(code==='23503') throw new NotFoundException('Property not found in this account');
    throw error;
  }

  // inject database instance
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof rentalSchema>) {}

   /**
   * Inserts a new Rental record into the database.
   * @throws Error if the insert operation fails to return the saved row.
   * @returns client first name, client last name, start and end date (as string)
   */
  async save(data: Rental): Promise<{userId: string, clientFirstName:string, clientLastName:string, startDate: string, endDate: string, guests:number, revenue: number, fee: number, profit:number}> {
    const propertyId = data.propertyId ?? (await this.db.select({id:PropertySchema.id}).from(PropertySchema)
      .where(and(eq(PropertySchema.userId,data.userId),eq(PropertySchema.isDefault,true))))[0]?.id;
    if (!propertyId) throw new NotFoundException('Property not found');
    const property = await this.db.select({id:PropertySchema.id}).from(PropertySchema)
      .where(and(eq(PropertySchema.id,propertyId),eq(PropertySchema.userId,data.userId),eq(PropertySchema.isActive,true)));
    if (!property.length) throw new NotFoundException('Property not found');
    let operationResult;
    try { operationResult = await this.db.insert(RentalSchema).values({
      propertyId,
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

    } catch(error) {this.throwBookingConstraint(error);}
    if (!operationResult![0]) throw new PersistenceError('error saving rental');
    return operationResult![0] // rental added
  }

  /**
   * Updates specific fields of a rental record by ID.
   * @returns Promise resolving to true if a row was updated, false otherwise.
   */
  async update(userId: string, id: string, toBeUpdated: Partial<RentalRow>): Promise<boolean> {
    const patch = {...toBeUpdated};
    if(patch.propertyId !== undefined) {
      const owner = await this.db.select({id:PropertySchema.id}).from(PropertySchema)
        .where(and(eq(PropertySchema.id,patch.propertyId),eq(PropertySchema.userId,userId),eq(PropertySchema.isActive,true)));
      if(!owner.length) throw new NotFoundException('Property not found');
    }

    // Keep profit consistent if only revenue or fee changes. Uses current DB values atomically.
    if (patch.revenue !== undefined || patch.fee !== undefined) {
      patch.profit = sql`${patch.revenue === undefined ? RentalSchema.revenue : patch.revenue} - ${patch.fee === undefined ? RentalSchema.fee : patch.fee}` as unknown as number;
    }
    let operationResult;
    try {
      operationResult = await this.db.update(RentalSchema).set(patch)
        .where(and(eq(RentalSchema.id,id),eq(RentalSchema.userId,userId)));
    } catch(error) {this.throwBookingConstraint(error);}

    if (operationResult!.rowCount === 0) throw new PersistenceError('cannot update item');
    return true;
  }

  /**
   * Removes a rental record by its unique ID.
   * @returns Promise resolving to true if deleted, false if ID not found.
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const operationResult = await this.db.delete(RentalSchema).where(and(eq(RentalSchema.id,id),eq(RentalSchema.userId,userId)))
    if (operationResult.rowCount === 0) throw new PersistenceError('cannot delete item')
    return true;
  }

  /**
   * Finds a specific rental record by its start and end date.
   * @returns Rental entity if found, otherwise null.
   */
  async findOne(userId: string, startDate: string, endDate: string): Promise<Rental> {
    const operationResult = await this.db.select().
      from(RentalSchema)
      .where(and(
          eq(RentalSchema.startDate, startDate),
          eq(RentalSchema.endDate, endDate),
          eq(RentalSchema.userId, userId)
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
    const operationResult: RentalRow[] = await this.db.select().from(RentalSchema).where(and(eq(RentalSchema.isActive, true), eq(RentalSchema.userId, userId))).orderBy(asc(RentalSchema.startDate));

    const rentalsList: Rental[] = operationResult.map((rental) => Rental.create(rental))
    return rentalsList
  }

  /**
   * It retrieves the next three rentals from today's date and on.
   * @returns return a list with these three rentals
   */
  async findNextThree(userId: string): Promise<Rental[]> {
    const operationResult:RentalRow[] = await this.db.select().from(RentalSchema).where(and(
      sql`${RentalSchema.startDate} >= CURRENT_DATE`, 
      eq(RentalSchema.isActive, true),
      eq(RentalSchema.userId, userId)
    )).orderBy(asc(RentalSchema.startDate)).limit(3);
    
    return operationResult.map(rental => Rental.create(rental))
  
  }

  /**
   * Checks if any existing rental dates conflict with the provided date range.
   * @returns True if an overlap exists, false otherwise.
   */
  async checkOverlapDate(userId: string, startDate: string, endDate: string, propertyId?: string) {
    const overlap = await this.db.select()
      .from(RentalSchema)
      .where(and(
        lt(RentalSchema.startDate, endDate),
        gt(RentalSchema.endDate, startDate),
        eq(RentalSchema.userId,userId),
        eq(RentalSchema.isActive,true),
        ...(propertyId ? [eq(RentalSchema.propertyId,propertyId)] : [])
      )).limit(1)

    return overlap.length > 0
  }

  /**
   * Calculates revenue grouped by month for the current calendar year.
   * @returns A promise resolving to an array of objects for each month 
   * in the current year. Format: { label: "2026-02", totalRevenue: 12500 }
   */
  async getMonthlyBalanceCurrentYear(userUid:string,propertyId?:string) {
    return await this.db
      .select({
        label: sql<string>`TO_CHAR(${RentalSchema.startDate}, 'YYYY-MM')`.as('month_label'),
        totalRevenue: sum(RentalSchema.revenue).mapWith(Number),
        totalProfit: sum(RentalSchema.profit).mapWith(Number),
        bookingCount: sql<number>`COUNT(*)::int`
      })
      .from(RentalSchema)
      .where(and(
        eq(RentalSchema.isActive, true),
        eq(RentalSchema.userId, userUid),
        ...(propertyId ? [eq(RentalSchema.propertyId,propertyId)] : []),
        sql`${RentalSchema.startDate} >= DATE_TRUNC('year', NOW())`,
        sql`${RentalSchema.startDate} < DATE_TRUNC('year', NOW()) + INTERVAL '1 year'`
      ))
      .groupBy(sql`month_label`)
      .orderBy(sql`month_label`);
  }

  /**
   * Calculates total revenue for the current calendar year only.
   * @returns A promise resolving to an array containing a single object 
   * for the current year. Format: { label: "2026", totalRevenue: 50000 }
   */
  async getYearlyBalanceCurrentYear(userUid:string,propertyId?:string) {
    return await this.db
      .select({
        label: sql<string>`TO_CHAR(${RentalSchema.startDate}, 'YYYY')`.as('year_label'),
        totalRevenue: sum(RentalSchema.revenue).mapWith(Number),
        totalProfit: sum(RentalSchema.profit).mapWith(Number),
        bookingCount: sql<number>`COUNT(*)::int`
      })
      .from(RentalSchema)
      .where(and(
        eq(RentalSchema.isActive, true),
        eq(RentalSchema.userId, userUid),
        ...(propertyId ? [eq(RentalSchema.propertyId,propertyId)] : []),
        sql`${RentalSchema.startDate} >= DATE_TRUNC('year', NOW())`,
        sql`${RentalSchema.startDate} < DATE_TRUNC('year', NOW()) + INTERVAL '1 year'`
      ))
      .groupBy(sql`year_label`)
      .orderBy(desc(sql`year_label`));
  }

}