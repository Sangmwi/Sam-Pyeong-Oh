/**
 * POST /api/auth/verify
 *
 * Verify JWT token and create/update user in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateToken, getTokenExpiry } from '@/lib/jwt';
import { verifyTokenSchema } from '@sam-pyeong-oh/shared';
import type { APIResponse, AuthTokenDTO } from '@sam-pyeong-oh/shared';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = verifyTokenSchema.safeParse(body);
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

    // In a real app, you would verify OAuth token with provider here
    // For now, we'll create a mock user for demonstration
    const mockUserId = 'user_' + Date.now();
    const mockEmail = 'user@example.com';
    const mockProvider: 'google' | 'kakao' = 'google';

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: {
        provider_providerId: {
          provider: mockProvider,
          providerId: mockUserId,
        },
      },
      create: {
        email: mockEmail,
        provider: mockProvider,
        providerId: mockUserId,
        name: 'Test User',
      },
      update: {
        updatedAt: new Date(),
      },
    });

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      provider: mockProvider,
    });

    const expiresAt = getTokenExpiry();

    const response: AuthTokenDTO = {
      token,
      userId: user.id,
      expiresAt,
    };

    return NextResponse.json<APIResponse<AuthTokenDTO>>(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}
