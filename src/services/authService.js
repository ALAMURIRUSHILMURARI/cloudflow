/**
 * CloudFlow Authentication Service
 * 
 * ARCHITECTURAL DESIGN & AWS ROADMAP:
 * Current: Mock Authentication Layer with simulated network latency and session persistence.
 * Future AWS Integration:
 *   - AWS Cognito User Pool with SRP (Secure Remote Password) protocol
 *   - JWT Token exchange (IdToken, AccessToken, RefreshToken)
 *   - Role-Based Access Control (RBAC) via Cognito User Pool Groups (Employee, Manager, Admin)
 * 
 * Target AWS Endpoint:
 *   POST https://cognito-idp.${VITE_AWS_REGION}.amazonaws.com/
 */

import { MOCK_USERS } from '../data/mockData';

const AUTH_STORAGE_KEY = 'cloudflow_auth_session';

class AuthService {
  /**
   * Authenticate user against credentials.
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{ user: object, token: string }>}
   */
  async login(email, password) {
    // Simulated network delay (300ms)
    await new Promise((resolve) => setTimeout(resolve, 300));

    const normalizedEmail = email.trim().toLowerCase();
    const user = MOCK_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      // Allow demo login even if email is not an exact match by fallback to employee profile if requested
      throw new Error(`Invalid credentials. Demo accounts: employee@cloudflow.demo, manager@cloudflow.demo, admin@cloudflow.demo`);
    }

    // In a real AWS Cognito environment, Cognito returns AccessToken & IdToken
    const session = {
      user,
      token: `mock-jwt-token-cognito-${user.roleKey}-${Date.now()}`,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  /**
   * Terminate active user session.
   */
  async logout() {
    await new Promise((resolve) => setTimeout(resolve, 150));
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return true;
  }

  /**
   * Retrieve active session from localStorage.
   */
  getCurrentSession() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Update user profile information.
   */
  async updateProfile(updates) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const session = this.getCurrentSession();
    if (!session) throw new Error('No active session');

    const updatedUser = { ...session.user, ...updates };
    const updatedSession = { ...session, user: updatedUser };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession));
    return updatedUser;
  }

  /**
   * Request password reset link.
   */
  async forgotPassword(email) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      message: `Password reset verification link sent to ${email} (Simulated Amazon SES trigger)`
    };
  }
}

export const authService = new AuthService();
export default authService;
