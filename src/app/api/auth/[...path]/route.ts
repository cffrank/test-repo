import { authApiHandler } from "@neondatabase/auth/next/server";

export const runtime = 'edge';

export const { GET, POST, PUT, DELETE, PATCH } = authApiHandler();
