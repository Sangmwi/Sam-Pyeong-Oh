/**
 * GET /api/threads/[id] - Get thread by ID
 * PATCH /api/threads/[id] - Update thread
 * DELETE /api/threads/[id] - Delete thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, forbiddenResponse } from '@/lib/auth-middleware';
import { updateThreadSchema } from '@sam-pyeong-oh/shared';
import type { APIResponse, ThreadDTO, UpdateThreadDTO } from '@sam-pyeong-oh/shared';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const threadId = parseInt(id);

    if (isNaN(threadId)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: 'Invalid thread ID' },
        },
        { status: 400 }
      );
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!thread) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: 'Thread not found' },
        },
        { status: 404 }
      );
    }

    if (thread.userId !== user.userId) {
      return forbiddenResponse('You do not have access to this thread');
    }

    const response: ThreadDTO = {
      id: thread.id,
      userId: thread.userId,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      messageCount: thread._count.messages,
    };

    return NextResponse.json<APIResponse<ThreadDTO>>(
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
    console.error('GET /api/threads/[id] error:', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const threadId = parseInt(id);
    const body: UpdateThreadDTO = await req.json();

    if (isNaN(threadId)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: 'Invalid thread ID' },
        },
        { status: 400 }
      );
    }

    // Validate input
    const validation = updateThreadSchema.safeParse(body);
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

    // Check ownership
    const existingThread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!existingThread) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: 'Thread not found' },
        },
        { status: 404 }
      );
    }

    if (existingThread.userId !== user.userId) {
      return forbiddenResponse('You do not have permission to update this thread');
    }

    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: validation.data,
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
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('PATCH /api/threads/[id] error:', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const threadId = parseInt(id);

    if (isNaN(threadId)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: 'Invalid thread ID' },
        },
        { status: 400 }
      );
    }

    // Check ownership
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: 'Thread not found' },
        },
        { status: 404 }
      );
    }

    if (thread.userId !== user.userId) {
      return forbiddenResponse('You do not have permission to delete this thread');
    }

    await prisma.thread.delete({
      where: { id: threadId },
    });

    return NextResponse.json<APIResponse<{ id: number }>>(
      {
        success: true,
        data: { id: threadId },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('DELETE /api/threads/[id] error:', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
