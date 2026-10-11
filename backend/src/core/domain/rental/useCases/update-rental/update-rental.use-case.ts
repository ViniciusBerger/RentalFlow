import { IRentalRepository } from "../../../../app/ports/IRentalRepository";
import { ServiceError } from "../../../../app/errors/service.error";

const allowedFields = ['clientFirstName','clientLastName','startDate','endDate','guests','revenue','fee','propertyId'] as const;
export class UpdateRentalUseCase {
  constructor(private readonly rentalRepository: IRentalRepository){}
  async updateRental(userId: string, id: string, input: Record<string, unknown>): Promise<boolean> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ServiceError('Invalid update payload');
    // Ignore legacy frontend's readonly profit field, but never accept owner/status changes.
    const keys=Object.keys(input).filter(k=>k!=='profit');
    if (!keys.length || keys.some(k=>!(allowedFields as readonly string[]).includes(k))) {
      throw new ServiceError('Invalid update fields');
    }
    if(input.propertyId !== undefined && (typeof input.propertyId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.propertyId))) {
      throw new ServiceError('Invalid property ID');
    }
    const update=Object.fromEntries(keys.map(k=>[k,input[k]]));
    if (!await this.rentalRepository.update(userId,id,update)) throw new ServiceError('Could not update rental');
    return true;
  }
}
