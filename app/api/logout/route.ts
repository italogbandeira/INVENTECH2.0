import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ sucesso: true });

  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}