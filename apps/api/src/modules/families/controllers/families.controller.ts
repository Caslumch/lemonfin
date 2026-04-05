import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CreateFamilyUseCase } from '../use-cases/create-family.use-case';
import { GetMyFamilyUseCase } from '../use-cases/get-my-family.use-case';
import { JoinFamilyUseCase } from '../use-cases/join-family.use-case';
import { LeaveFamilyUseCase } from '../use-cases/leave-family.use-case';
import {
  createFamilySchema,
  joinFamilySchema,
  type CreateFamilyInput,
  type JoinFamilyInput,
} from '../dtos/family.dto';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamiliesController {
  constructor(
    private readonly createFamily: CreateFamilyUseCase,
    private readonly getMyFamily: GetMyFamilyUseCase,
    private readonly joinFamily: JoinFamilyUseCase,
    private readonly leaveFamily: LeaveFamilyUseCase,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createFamilySchema)) body: CreateFamilyInput,
  ) {
    return this.createFamily.execute(user.id, body);
  }

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.getMyFamily.execute(user.id);
  }

  @Post('join')
  join(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(joinFamilySchema)) body: JoinFamilyInput,
  ) {
    return this.joinFamily.execute(user.id, body.code);
  }

  @Delete('leave')
  leave(@CurrentUser() user: { id: string }) {
    return this.leaveFamily.execute(user.id);
  }
}
