import { Module } from '@nestjs/common';
import { PropertyController } from '../../../web/controller/property.controller';
@Module({controllers:[PropertyController]})
export class PropertyModule {}
