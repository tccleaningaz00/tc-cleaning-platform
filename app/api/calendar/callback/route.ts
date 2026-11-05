
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleOAuthClient } from "../../../lib/google-calendar";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const savedState = cookieStore.get("tc_google_oauth_state")?.value;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  const redirectUrl = new URL("/manager/dashboard", request.url);

  const finish = (status: string) => {
    redirectUrl.searchParams.set("calendar", status);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set("tc_google_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/calendar/callback",
      maxAge: 0,
    });

    return response;
  };

  if (googleError || !code || !savedState || returnedState !== savedState) {
    return finish("error");
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error("Google did not return a refresh token.");
      return finish("error");
    }

    const workerUrl = process.env.TC_CLEANING_API_URL;
    const apiSecret = process.env.TC_CLEANING_API_SECRET;

    if (!workerUrl || !apiSecret) {
      console.error("Calendar Worker configuration is missing.");
      return finish("error");
    }

    const endpoint = new URL(workerUrl);
    endpoint.pathname = endpoint.pathname.replace(/\/quote\/?$/, "");
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/calendar-token`;

    const workerResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: tokens.refresh_token,
      }),
      cache: "no-store",
    });

    if (!workerResponse.ok) {
      console.error(
        "Calendar token storage failed:",
        workerResponse.status
      );
      return finish("error");
    }

    return finish("connected");
  } catch (error) {
    console.error("Google Calendar callback failed:", error);
    return finish("error");
  }
}
