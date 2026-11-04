
import { NextRequest, NextResponse } from "next/server";
import {
  createManagerSession,
  verifyManager,
} from "../../../lib/manager-auth";

export async function POST(request: NextRequest) {
  try {
  const body: unknown = await request.json();

if (typeof body !== "object" || body === null) {
  return NextResponse.json(
    { error: "Invalid request." },
    { status: 400 }
  );
}

const payload = body as Record<string, unknown>;

const email =
  typeof payload.email === "string" ? payload.email : "";

const password =
  typeof payload.password === "string" ? payload.password : "";
    if (!email || !password || password.length > 200) {
      return NextResponse.json(
        { error: "Enter a valid email and password." },
        { status: 400 }
      );
    }

    const manager = await verifyManager(email, password);

    if (!manager) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await createManagerSession(manager);

    const response = NextResponse.json({
      success: true,
      manager: {
        email: manager.email,
        role: manager.role,
      },
    });

    response.cookies.set("tc_manager_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to complete login." },
      { status: 500 }
    );
  }
}
