/**
 * GET /api/threads/[id]/messages - Get messages for thread
 * POST /api/threads/[id]/messages - Create new message
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createMessageSchema,
  type APIResponse,
  type CreateMessageDTO,
  type MessageDTO,
} from "@sam-pyeong-oh/shared";
import { forbiddenResponse, requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const threadId = parseInt(id);

    if (isNaN(threadId)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: "Invalid thread ID" },
        },
        { status: 400 }
      );
    }

    // Check thread ownership
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: "Thread not found" },
        },
        { status: 404 }
      );
    }

    if (thread.userId !== user.userId) {
      return forbiddenResponse("You do not have access to this thread");
    }

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    const response: MessageDTO[] = messages.map(
      (msg: (typeof messages)[number]): MessageDTO => ({
        id: msg.id,
        threadId: msg.threadId,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })
    );

    return NextResponse.json<APIResponse<MessageDTO[]>>(
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
    console.error("GET /api/threads/[id]/messages error:", error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const threadId = parseInt(id);
    const body: CreateMessageDTO = await req.json();

    if (isNaN(threadId)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: "Invalid thread ID" },
        },
        { status: 400 }
      );
    }

    // Check thread ownership
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { message: "Thread not found" },
        },
        { status: 404 }
      );
    }

    if (thread.userId !== user.userId) {
      return forbiddenResponse("You do not have permission to add messages to this thread");
    }

    // Validate input
    const validation = createMessageSchema.safeParse({
      ...body,
      threadId,
    });

    if (!validation.success) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            message: "Invalid request body",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        threadId,
        role: validation.data.role,
        content: validation.data.content,
      },
    });

    const response: MessageDTO = {
      id: message.id,
      threadId: message.threadId,
      role: message.role as "user" | "assistant" | "system",
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };

    return NextResponse.json<APIResponse<MessageDTO>>(
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
    console.error("POST /api/threads/[id]/messages error:", error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
