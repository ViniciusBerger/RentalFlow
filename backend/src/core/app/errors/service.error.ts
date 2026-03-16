import { DomainError } from "./domain.error";
/**
 * It implements DomainError and build up a specific use case error.
 * Handle errors in use cases scope. Map them to a domain error displaying the exact cause
 */
export class ServiceError extends DomainError{
    constructor(message: string) {
        super(`Sorry something went wrong while trying to do a service. \n message=> ${message} `)
    }
}