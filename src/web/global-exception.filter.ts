import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * Global Exception Filter to handle all uncaught exceptions
 * @author Vinicius Berger
 * 
 * 
 * @description This filter catches all uncaught exceptions in the application and formats the response
 * to include status code, timestamp, request path, and error message.
 * 
 */

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse<Response>();

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        
        response.status(status).json({
            status: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: ((exception as any).message )|| 'Internal server error'
        })
    }

}