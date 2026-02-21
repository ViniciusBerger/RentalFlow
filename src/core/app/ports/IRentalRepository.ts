import { Rental } from "../../domain/rental/entitiy/rental";

/**
 * Port: IRentalRepository
 * Defines the contract for rental data persistence.
 * 
 */
export interface IRentalRepository {
    /**
     * Persists a new rental entity to the database.
     * @param data - The Rental domain entity to be saved.
     * @returns Promise resolving to true if saved, false if no rows were affected.
     */
    save(data: Rental);
    
    /**
     * Retrieves all rental records and maps them back to Domain Entities.
     */
    getAll(): Promise<Rental[]>;
    
    /**
     * Finds a specific rental record by its exact start and end dates.
     * @returns The Rental entity if found, or null/undefined.
     */
    findOne(startDate: string, endDate: string): Promise<Rental>;

    /**
     * Removes a rental record from the system by its unique identifier.
     * @param id - The UUID or unique string of the rental.
     */
    delete(id: string): Promise<boolean>;

    /**
     * Updates an existing rental's properties.
     * @param id - The ID of the rental to update.
     * @param toBeUpdated - Partial data containing the fields to change.
     */
    update(id: string, toBeUpdated: any): Promise<boolean>; 

    /**
     * Business Rule check: Determines if a car is already booked within a specific timeframe.
     * Uses the logic: (ExistingStart < NewEnd) AND (ExistingEnd > NewStart).
     */
    checkOverlapDate(startDate: string, endDate: string): Promise<boolean>;
}