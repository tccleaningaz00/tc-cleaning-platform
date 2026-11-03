
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const workerUrl = process.env.TC_CLEANING_API_URL;
  const secret = process.env.TC_CLEANING_API_SECRET;

  if (!workerUrl || !secret) {
    return NextResponse.json(
      { error: "Quote requests are temporarily unavailable." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const result = await response.json();

    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "We could not submit your request. Please try again." },
      { status: 502 }
    );
  }
}
