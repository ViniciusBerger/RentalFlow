import { Body, ConflictException, Controller, Delete, ForbiddenException, Get, Inject, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { and, eq, gt, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../infra/persistence/database.module';
import { PropertySchema } from '../../infra/persistence/schemas/property-schema';
import { RentalSchema } from '../../infra/persistence/schemas/rental-schema';
import { AuthGuard } from '../../infra/adapters/guards/auth.guard';
import { OnboardingGuard } from '../../infra/adapters/guards/onboarding.guard';

const icons = ['building','house','apartment','waves','sun','tree','mountain','key'] as const;
export class PropertyInput {
  @IsString() @Length(2,120) name!: string;
  @IsOptional() @IsString() @Length(0,300) address?: string;
  @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color!: string;
  @IsString() @IsIn(icons) icon!: string;
}
export class PropertyPatch {
  @IsOptional() @IsString() @Length(2,120) name?: string;
  @IsOptional() @IsString() @Length(0,300) address?: string;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string;
  @IsOptional() @IsString() @IsIn(icons) icon?: string;
}

@Controller('properties')
@UseGuards(AuthGuard, OnboardingGuard)
export class PropertyController {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}
  private owner(req: any): string {return req.user.uid;}

  /** Idempotent and concurrency-safe default for newly onboarded accounts too. */
  @Get()
  async list(@Req() req: any) {
    const userId=this.owner(req);
    await this.db.insert(PropertySchema).values({userId,name:'Imóvel principal',isDefault:true})
      .onConflictDoNothing({target: PropertySchema.userId, where: sql`${PropertySchema.isDefault} = true`});
    return this.db.select().from(PropertySchema).where(eq(PropertySchema.userId,userId));
  }

  @Post()
  async create(@Req() req: any, @Body() body: PropertyInput) {
    const [created]=await this.db.insert(PropertySchema).values({userId:this.owner(req),...body}).returning();
    return created;
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: PropertyPatch) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundException('Property not found');
    if (!Object.keys(body).length) throw new ConflictException('No property changes');
    const [updated]=await this.db.update(PropertySchema).set(body)
      .where(and(eq(PropertySchema.id,id),eq(PropertySchema.userId,this.owner(req)),eq(PropertySchema.isActive,true))).returning();
    if(!updated) throw new NotFoundException('Property not found');
    return updated;
  }

  /** Soft archive only. Keep history and colors; don't orphan future bookings. */
  @Delete(':id')
  async archive(@Req() req: any, @Param('id') id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundException('Property not found');
    const userId=this.owner(req);
    const owned=await this.db.select().from(PropertySchema).where(and(eq(PropertySchema.id,id),eq(PropertySchema.userId,userId),eq(PropertySchema.isActive,true)));
    if(!owned[0]) throw new NotFoundException('Property not found');
    if(owned[0].isDefault) throw new ForbiddenException('Cannot archive primary property');
    const [future]=await this.db.select({count:sql<number>`COUNT(*)::int`}).from(RentalSchema).where(and(eq(RentalSchema.userId,userId),eq(RentalSchema.propertyId,id),eq(RentalSchema.isActive,true),gt(RentalSchema.endDate,sql`CURRENT_DATE`)));
    if(Number(future?.count??0)>0) throw new ConflictException('Property has active or future bookings');
    await this.db.update(PropertySchema).set({isActive:false}).where(and(eq(PropertySchema.id,id),eq(PropertySchema.userId,userId)));
    return {archived:true};
  }
}
