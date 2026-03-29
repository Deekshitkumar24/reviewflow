import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.delete('studentAccessToken');
  return res;
}
