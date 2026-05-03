import { Module } from '@nestjs/common';
import { BoardPreviewController } from './board-preview.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BoardPreviewController],
})
export class BoardPreviewModule {}
