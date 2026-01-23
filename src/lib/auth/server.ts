import { createAuthServer, neonAuth as getNeonSession } from "@neondatabase/auth/next/server";

// Lazy initialize auth server to avoid build-time errors when NEON_AUTH_BASE_URL is not set
let _authServer: ReturnType<typeof createAuthServer> | null = null;

export function getAuthServer() {
  if (!_authServer) {
    _authServer = createAuthServer();
  }
  return _authServer;
}

// Keep for backwards compatibility but mark as getter
export const authServer = {
  get instance() {
    return getAuthServer();
  }
};

// Export neonAuth function for use in API routes
// This wraps the session fetch to provide auth context with user() method
export function neonAuth() {
  return {
    async user() {
      const { user } = await getNeonSession();
      return user;
    },
    async session() {
      const { session } = await getNeonSession();
      return session;
    }
  };
}
