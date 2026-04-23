import { NextResponse } from "next/server";

export async function GET() {
  const raw = process.env.DATABASE_URL ?? "";

  return NextResponse.json({
    hasDatabaseUrl: Boolean(raw),
    preview: raw.replace(/:\/\/.*?:.*?@/, "://***:***@"),
  });
}