import { NotFoundException, ForbiddenException } from '@nestjs/common';
/** RentalFlow v1 has a single owner per account; never accept ownerId from a request body. */
export function requireContractOwner(actorUid: string | undefined, recordOwnerUid: string): void {
  if (!actorUid || actorUid !== recordOwnerUid) throw new NotFoundException('Resource not found');
}
export function requireContractAction(actorUid: string | undefined, ownerUid: string, action: 'EDIT'|'PUBLISH'|'FINALIZE'|'OVERRIDE'|'DOWNLOAD'): void {
  if (!actorUid || actorUid !== ownerUid) throw new NotFoundException('Resource not found');
  if (!['EDIT','PUBLISH','FINALIZE','OVERRIDE','DOWNLOAD'].includes(action)) throw new ForbiddenException('Permission denied');
}
