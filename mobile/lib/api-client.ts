import type { AuthUser } from './api';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error('API_BASE_URL environment variable is not defined');
}

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

let refreshInFlight: Promise<RefreshResponse> | null = null;

async function requestRefresh(): Promise<RefreshResponse> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token stored');
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh session');
  }

  const result: RefreshResponse = await response.json();
  await saveTokens(result.accessToken, result.refreshToken);

  return result;
}

export function refreshTokens(): Promise<RefreshResponse> {
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { auth = true, headers, ...rest } = options;

  let accessToken = auth ? await getAccessToken() : null;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (response.status !== 401 || !auth) {
    return response;
  }

  try {
    const refreshResult = await refreshTokens();
    accessToken = refreshResult.accessToken;
  } catch {
    await clearTokens();
    return response;
  }

  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}