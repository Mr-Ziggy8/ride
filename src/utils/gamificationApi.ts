import type { User } from 'firebase/auth';

interface ErrorBody {
  error?: string;
}

async function callJson<T>(user: User, path: string, body?: unknown): Promise<T> {
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as T & ErrorBody;
  if (!response.ok) {
    throw new Error(json.error ?? 'request_failed');
  }
  return json;
}

export async function syncUserStats(user: User): Promise<void> {
  await callJson(user, '/api/sync-user-stats');
}

export async function createReferralCode(user: User): Promise<string> {
  const { code } = await callJson<{ code: string }>(user, '/api/create-referral-code');
  return code;
}

export async function redeemReferralCode(user: User, code: string): Promise<void> {
  await callJson(user, '/api/redeem-referral-code', { code });
}
