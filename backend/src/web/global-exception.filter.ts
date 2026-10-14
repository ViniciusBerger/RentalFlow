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
      // Avoid logging SQL, parameters or personal information.
      const error = exception as {code?:unknown;constraint?:unknown;cause?:{code?:unknown;constraint?:unknown}};
      const code = error?.cause?.code ?? error?.code;
      const constraint = error?.cause?.constraint ?? error?.constraint;
      const safeConstraints = ['contract_template_versions_one_draft',
        'contract_template_versions_number_unique','contract_templates_one_default_owner'];
      console.error('Unhandled request failure', {
        type: exception instanceof Error ? exception.name : 'UnknownError',
        code: typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : undefined,
        constraint: typeof constraint === 'string' && safeConstraints.includes(constraint) ? constraint : undefined,
        path: request.path
      });
      if (request.path === '/contracts/template/draft') {
        if (code === '23505' && safeConstraints.includes(String(constraint))) {
          status = HttpStatus.CONFLICT;
          message = 'Contract draft was changed or already exists. Reload the template and try again.';
        } else if (code === '23503') {
          status = HttpStatus.CONFLICT;
          message = 'Contract template account reference is missing. Reload and try again.';
        } else {
          message = 'Unable to save contract clauses. The server could not confirm your changes. Try again.';
        }
      } }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: typeof request.path === 'string' ? request.path : String(request.url ?? '').split('?')[0],
      message,
    });
  }
}