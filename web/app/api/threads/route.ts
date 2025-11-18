/**
 * GET /api/threads - List user's threads
 * POST /api/threads - Create new thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { createThreadSchema } from '@sam-pyeong-oh/shared';
import type { APIResponse, ThreadDTO, CreateThreadDTO } from '@sam-pyeong-oh/shared';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const threads = await prisma.thread.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const response: ThreadDTO[] = threads.map((thread) => ({
      id: thread.id,
      userId: thread.userId,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      messageCount: thread._count.messages,
    }));

    return NextResponse.json<APIResponse<ThreadDTO[]>>(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/threads error:', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body: CreateThreadDTO = await req.json();

    // Validate input
    const validation = createThreadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const thread = await prisma.thread.create({
      data: {
        userId: user.userId,
        title: validation.data.title,
      },
    });

    const response: ThreadDTO = {
      id: thread.id,
      userId: thread.userId,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    };

    return NextResponse.json<APIResponse<ThreadDTO>>(
      {
        success: true,
        data: response,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('POST /api/threads error:', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
