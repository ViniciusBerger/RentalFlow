/**
 * This class create a pattern between expected and non expected errors. 
 * It works as a base error for business rules avoiding duplicate code
 */

export class DomainError extends Error{
    constructor(message: string, public readonly metadata?: Record<string, any>) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}