import { authApiHandler } from "@neondatabase/auth/next/server";
import { NextRequest } from "next/server";

export const runtime = 'edge';

// Lazy initialize to avoid build-time errors when NEON_AUTH_BASE_URL is not set
let _handlers: ReturnType<typeof authApiHandler> | null = null;

function getHandlers() {
  if (!_handlers) {
    _handlers = authApiHandler();
  }
  return _handlers;
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return getHandlers().GET(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return getHandlers().POST(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return getHandlers().PUT(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return getHandlers().DELETE(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return getHandlers().PATCH(req, context);
}
