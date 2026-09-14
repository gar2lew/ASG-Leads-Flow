// ============================================
// ASG Leads — Google API Authentication
// ============================================

import { google } from 'googleapis';
import type { JWT } from 'google-auth-library';

let cachedAuth: JWT | null = null;

/**
 * Get Google Sheets API authentication (service account)
 * Uses GOOGLE_SERVICE_ACCOUNT_KEY environment variable
 */
export async function getGoogleAuth(): Promise<JWT> {
  if (cachedAuth) return cachedAuth;

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch (err) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Service account key missing client_email or private_key');
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  await auth.authorize();
  cachedAuth = auth;
  return auth;
}

/**
 * Clear cached auth (for testing)
 */
export function clearAuthCache(): void {
  cachedAuth = null;
}
