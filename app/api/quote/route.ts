
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_REQUEST_SIZE = 16000;

export async function POST(request: NextRequest) {
  const workerUrl = process.env.TC_CLEANING_API_URL;
  const secret = process.env.TC_CLEANING_API_SECRET;

  if (!workerUrl || !secret) {
    return NextResponse.json(
      { error: "Quote requests are temporarily unavailable." },
      { status: 503 }
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "A JSON request is required." },
      { status: 415 }
    );
  }

  let endpoint: URL;

  try {
    endpoint = new URL(workerUrl);

    if (
      endpoint.protocol !== "https:" ||
      !endpoint.pathname.endsWith("/quote")
    ) {
      throw new Error("Invalid Worker URL");
    }
  } catch {
    return NextResponse.json(
      { error: "The quote service is not configured correctly." },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();

    if (new TextEncoder().encode(body).length > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "Your request is too large." },
        { status: 413 }
      );
    }

    try {
      JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: "Please check the submitted information." },
        { status: 400 }
      );
    }

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body,
      cache: "no-store",
    });

    const responseText = await response.text();

    let result: unknown;

    try {
      result = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "The quote service returned an invalid response." },
        { status: 502 }
      );
    }

    return NextResponse.json(result, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "We could not submit your request. Please try again." },
      { status: 502 }
    );
  }
}
