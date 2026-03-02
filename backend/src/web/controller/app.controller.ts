import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('MyRentalsAPI')
@Controller()
export class AppController {
    @Get("/")
        @ApiOperation({ summary: 'Health check' })
        health() {
            return {status: 200, message: "success"}
        }
}