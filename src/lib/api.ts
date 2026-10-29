export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string>;
  payload: any;

  constructor(message: string, status: number, code?: string, payload?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = payload?.details;
    this.payload = payload;
  }
}

export async function apiRequest<T = any>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      'Could not reach the NKAY server. Check your connection and try again.',
      0,
      'NETWORK_ERROR'
    );
  }

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    throw new ApiError(
      data?.error || `Request failed with status ${response.status}.`,
      response.status,
      data?.code,
      data
    );
  }

  return data as T;
}

export function formatGhs(value: number): string {
  return `GH₵ ${Number(value || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
