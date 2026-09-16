export type SafeJsonResult<T> =
  | { success: true; data: T; response: Response }
  | { success: false; data: null; response: Response; rawText: string; parseError: string; status: number };

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit & { parseErrorMessage?: string }
): Promise<SafeJsonResult<T>> {
  const response = await fetch(input, init);

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (readErr: any) {
    return {
      success: false,
      data: null,
      response,
      rawText: '',
      parseError: `Failed to read response body: ${readErr?.message || String(readErr)}`,
      status: response.status,
    };
  }

  const ct = (response.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json') && !rawText.trim().startsWith('{') && !rawText.trim().startsWith('[')) {
    return {
      success: false,
      data: null,
      response,
      rawText,
      parseError:
        init?.parseErrorMessage ||
        `Response ${response.status} is not JSON (Content-Type: ${ct || 'missing'}). Body preview: ${rawText.slice(0, 180)}`,
      status: response.status,
    };
  }

  let data: T;
  try {
    data = JSON.parse(rawText) as T;
  } catch (parseErr: any) {
    return {
      success: false,
      data: null,
      response,
      rawText,
      parseError: `Failed to parse JSON: ${parseErr?.message || String(parseErr)}. Body preview: ${rawText.slice(0, 240)}`,
      status: response.status,
    };
  }

  return { success: true, data, response };
}

export function extractSafeData<T>(result: SafeJsonResult<T>): T | null {
  return result.success ? result.data : null;
}
