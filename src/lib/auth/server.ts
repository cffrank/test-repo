import { createAuthServer, neonAuth as getNeonSession } from "@neondatabase/auth/next/server";

export const authServer = createAuthServer();

// Export neonAuth function for use in API routes
// This wraps the session fetch to provide auth context with user() method
export function neonAuth(_request: Request) {
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
