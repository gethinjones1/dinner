import Constants from 'expo-constants';

// Set EXPO_PUBLIC_API_URL to point at a deployed server. In development we
// default to port 4000 on the machine running `expo start`, which is also
// reachable from a phone using Expo Go on the same Wi-Fi network.
function defaultApiUrl() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4000`;
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl()).replace(/\/$/, '');

export type User = { id: number; username: string; timezone: string };

export type Post = {
  id: number;
  userId: number;
  username: string;
  day: string;
  caption: string;
  imageUrl: string;
  createdAt: string;
};

export type Session = { token: string; user: User };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  { token, method = 'GET', json, body }: { token?: string; method?: string; json?: unknown; body?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (json !== undefined) headers['content-type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : body,
    });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_URL}`);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const imageUri = (post: Post) => API_URL + post.imageUrl;
