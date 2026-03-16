import { DomainError } from "./domain.error";
/**
 * It implements DomainError and build up a specific use case error.
 * Handle errors in persistence scope. Map them to a domain error displaying the exact cause
 */
export class PersistenceError extends DomainError{
    constructor(message: string) {
        super(`Sorry something went wrong while persisting data: \n message => ${message}`)
    }
}