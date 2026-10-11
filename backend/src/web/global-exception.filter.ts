import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ServiceError } from "src/core/app/errors/service.error";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === "string" ? res : (res as any).message || res;
    } else if (exception instanceof ServiceError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else {
      // Never serialize arbitrary exception objects: SQL/query parameters may contain PII.
      console.error('Unhandled request failure', { type: exception instanceof Error ? exception.name : 'UnknownError' });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: typeof request.path === 'string' ? request.path : String(request.url ?? '').split('?')[0],
      message,
    });
  }
}