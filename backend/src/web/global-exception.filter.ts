import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();              // Get HTTP context from Nest
    const request = ctx.getRequest();             // Access the request
    const response = ctx.getResponse<Response>(); // Access Express response

    const isHttpException = exception instanceof HttpException;

    // Determine the HTTP status code
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Default message
    let message: string | object = 'Internal server error';

    // Log unexpected errors
    if (!isHttpException) console.error(exception);

    // Extract message from HttpException, preserving objects if provided
    if (isHttpException) {
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || res;
    }

    // Send structured JSON response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}