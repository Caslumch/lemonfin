import { Controller, Post, Body, UseGuards, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ChatCompletionUseCase } from './use-cases/chat-completion.use-case';
import { chatMessageSchema, type ChatMessageInput } from './dtos/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatCompletion: ChatCompletionUseCase) {}

  @Post('completions')
  async complete(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(chatMessageSchema)) body: ChatMessageInput,
    @Res() res: Response,
  ) {
    const now = Date.now();
    this.logger.log(`→ POST /chat/completions [user:${user.id}]`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const text of this.chatCompletion.execute(user.id, body)) {
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      }
      this.logger.log(
        `← POST /chat/completions 200 ${Date.now() - now}ms [user:${user.id}]`,
      );
    } catch (error) {
      this.logger.error(
        `← POST /chat/completions 500 ${Date.now() - now}ms [user:${user.id}] - ${error}`,
      );
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: 'Erro ao processar sua mensagem.' })}\n\n`,
      );
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
