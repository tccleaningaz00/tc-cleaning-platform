
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyManagerSession } from "../../../lib/manager-auth";
import {
  generateOAuthState,
  getGoogleAuthorizationUrl,
} from "../../../lib/google-calendar";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("tc_manager_session")?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL("/manager/login", request.url)
    );
  }

  const manager = await verifyManagerSession(token);

  if (!manager) {
    return NextResponse.redirect(
      new URL("/manager/login", request.url)
    );
  }

  const state = generateOAuthState();
  const authorizationUrl = getGoogleAuthorizationUrl(state);

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("tc_google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/calendar/callback",
    maxAge: 600,
  });

  return response;
}
