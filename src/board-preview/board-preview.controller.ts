import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

const CRAWLER_PATTERNS = [
  'Twitterbot',
  'facebookexternalhit',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'LinkedInBot',
  'iMessageSocialAgent',
  'SocialMediaAgent',
  'Googlebot',
  'bingbot',
  'curl',
  'python-requests',
];

function isCrawler(userAgent: string): boolean {
  return CRAWLER_PATTERNS.some((pattern) =>
    userAgent.toLowerCase().includes(pattern.toLowerCase()),
  );
}

@Controller('b')
export class BoardPreviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':boardId')
  async boardPreview(
    @Param('boardId') boardId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ua = req.headers['user-agent'] ?? '';
    const frontendBase =
      process.env.FRONTEND_BASE_URL ?? 'https://prymr.xyz';
    const boardUrl = `${frontendBase}/b/${boardId}`;

    if (!isCrawler(ua)) {
      return res.redirect(302, boardUrl);
    }

    const boardImage = await this.prisma.boardImages.findFirst({
      where: { boardId, isDeleted: false },
      select: {
        imageUrl: true,
        title: true,
        description: true,
        board: {
          select: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const creatorName = boardImage?.board?.user
      ? `${boardImage.board.user.firstName ?? ''} ${boardImage.board.user.lastName ?? ''}`.trim()
      : 'Prymr';

    const title = boardImage?.title
      ? `${boardImage.title} by ${creatorName}`
      : `A board by ${creatorName}`;

    const description =
      boardImage?.description ?? 'View and appreciate this board on Prymr.';

    const ogImage = boardImage?.imageUrl ?? '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(boardUrl)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(boardUrl)}" />
</head>
<body></body>
</html>`;

    return res.status(200).header('Content-Type', 'text/html').send(html);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
