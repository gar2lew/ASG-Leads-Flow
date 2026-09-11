// ============================================
// ASG Leads — Auth Types
// ============================================

export type AuthRole = "rep" | "manager" | "admin";
export type OfficeId = "perth" | "brisbane";
export type UserStatus = "active" | "disabled";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: AuthRole;
  officeIds: OfficeId[];
  primaryOfficeId: OfficeId | null;
  status: UserStatus;
  phone?: string | null;
  jobTitle?: string | null;
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | null;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface SignInResult {
  success: boolean;
  error?: AuthError;
}

export interface CustomClaims {
  role: AuthRole;
  officeIds: string[];
}

// Firebase error code → user-friendly message mapping
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "The email address is not valid.",
  "auth/user-disabled": "This account has been disabled. Contact an administrator.",
  "auth/user-not-found": "No account found with this email address.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Invalid email or password. Please try again.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/missing-password": "Please enter a password.",
  "auth/invalid-login-credentials": "Invalid email or password. Please try again.",
};

export function mapAuthError(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  return AUTH_ERROR_MESSAGES[code] ?? fallback;
}
