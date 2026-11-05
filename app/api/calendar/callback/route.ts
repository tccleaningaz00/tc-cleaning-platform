
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

  const finish = (status: string, reason?: string) => {
    redirectUrl.searchParams.set("calendar", status);
    if (reason) redirectUrl.searchParams.set("calendar_reason", reason);
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

  if (googleError) {
    console.warn("Google Calendar callback stopped: Google denied authorization.");
    return finish("error", "google_denied");
  }

  if (!code || !savedState || returnedState !== savedState) {
    console.error("Google Calendar callback stopped: OAuth state validation failed.", {
      hasCode: Boolean(code),
      hasStateCookie: Boolean(savedState),
      stateMatched: Boolean(savedState && returnedState === savedState),
      callbackHost: url.host,
    });
    return finish("error", "state");
  }

  let stage = "code_exchange";
  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    console.info("Google Calendar OAuth code exchange completed.", {
      refreshTokenReturned: Boolean(tokens.refresh_token),
    });

    if (!tokens.refresh_token) {
      console.error("Google Calendar callback stopped: no refresh token returned.");
      return finish("error", "no_refresh_token");
    }

    stage = "worker_configuration";
    const workerUrl = process.env.TC_CLEANING_API_URL;
    const apiSecret = process.env.TC_CLEANING_API_SECRET;

    if (!workerUrl || !apiSecret) {
      console.error("Google Calendar callback stopped: Worker configuration is unavailable.");
      return finish("error", "worker_configuration");
    }

    const endpoint = new URL(workerUrl);
    endpoint.pathname = endpoint.pathname.replace(/\/quote\/?$/, "");
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/calendar-token`;

    stage = "worker_token_storage";
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
    console.info("Google Calendar Worker token-storage request completed.", {
      status: workerResponse.status,
    });

    if (!workerResponse.ok) {
      console.error("Google Calendar token storage was rejected by Worker.", {
        status: workerResponse.status,
      });
      return finish("error", "worker_rejected");
    }

    const workerResult: unknown = await workerResponse.json();
    if (
      typeof workerResult !== "object" ||
      workerResult === null ||
      !("success" in workerResult) ||
      workerResult.success !== true
    ) {
      console.error("Google Calendar Worker returned an unexpected storage response.");
      return finish("error", "worker_response");
    }

    console.info("Google Calendar refresh token was accepted for encrypted storage.");
    return finish("connected");
  } catch (error) {
    console.error("Google Calendar callback failed.", {
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return finish("error", stage);
  }
}
