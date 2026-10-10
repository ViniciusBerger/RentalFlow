import { ArgumentsHost, BadRequestException, HttpException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ServiceError } from '../core/app/errors/service.error';

describe('GlobalExceptionFilter', () => {
 const filter = new GlobalExceptionFilter();
 const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
 const ctx = { switchToHttp: () => ({ getRequest: () => ({ url: '/rental/add' }), getResponse: () => response }) } as unknown as ArgumentsHost;
 beforeEach(() => { jest.clearAllMocks(); });
 const payload = (status: number, message: unknown) => {
  expect(response.status).toHaveBeenCalledWith(status);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: status, path: '/rental/add', message, timestamp: expect.any(String) }));
  expect(Number.isNaN(Date.parse(response.json.mock.calls[0][0].timestamp))).toBe(false);
 };
 it('preserves a string HTTP exception message and status', () => {
   filter.catch(new HttpException('Unauthorized', 401), ctx);
   payload(401, 'Unauthorized');
 });
 it('extracts Nest validation message arrays without losing detail', () => {
   const error = new BadRequestException(['startDate must be a date', 'guests must be positive']);
   filter.catch(error, ctx);
   payload(400, ['startDate must be a date','guests must be positive']);
 });
 it('handles HTTP response objects without message fields', () => {
   filter.catch(new HttpException({ error: 'forbidden' }, 403), ctx);
   payload(403, { error: 'forbidden' });
 });
 it('maps domain failures to 400 rather than 500', () => {
   filter.catch(new ServiceError('Date already booked.'), ctx);
   payload(400, 'Date already booked.');
 });
 it('does not expose infrastructure exception details to HTTP clients', () => {
   const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
   filter.catch(new Error('DATABASE_URL leaked secret'), ctx);
   payload(500, 'Internal server error');
   expect(spy).toHaveBeenCalledTimes(1);
   spy.mockRestore();
 });
});
