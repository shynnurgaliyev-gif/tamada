import { NextResponse } from 'next/server';
import type { HealthResponse } from '@tamada/types';

export function GET() {
  const body: HealthResponse = {
    status: 'ok',
    service: 'tamada-web',
    env: process.env['NODE_ENV'] ?? 'development',
  };
  return NextResponse.json(body);
}
