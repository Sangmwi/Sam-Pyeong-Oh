/**
 * API Client with Auto-Authorization
 *
 * Fetch wrapper that automatically attaches JWT token from Zustand store
 */

import { useAuthStore } from '@/store/auth';
import type { APIResponse } from '@sam-pyeong-oh/shared';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private getAuthHeader(): string | null {
    const { token, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated()) return null;
    return `Bearer ${token}`;
  }

  async request<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { skipAuth, headers, ...restOptions } = options;

    const authHeader = skipAuth ? null : this.getAuthHeader();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
        ...headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'Unknown error' },
      }));
      throw new Error(error.error?.message || 'API request failed');
    }

    const data: APIResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }

  async get<T = unknown>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: FetchOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: FetchOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
