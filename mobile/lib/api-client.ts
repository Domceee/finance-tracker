import { clearTokens, getAccessToken, getRefreshToken, saveAccessToken } from './auth-storage';
import { refreshSession } from './api';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error('API_BASE_URL environment variable is not defined');
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

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

  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearTokens();
    return response;
  }

  try {
    const refreshResult = await refreshSession(refreshToken);
    accessToken = refreshResult.accessToken;
    await saveAccessToken(accessToken);
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