
import { NextRequest, NextResponse } from "next/server";
import {
  verifyManager,
  createManagerSession,
} from "../../../lib/manager-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      !("password" in body)
    ) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const email = typeof body.email === "string" ? body.email : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
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

    const session = await createManagerSession(manager);

    const response = NextResponse.json({
      success: true,
      manager: {
        email: manager.email,
        role: manager.role,
      },
    });

    response.cookies.set("tc_manager_session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Manager login error:", error);

    return NextResponse.json(
      { error: "Unable to process login. Please try again." },
      { status: 500 }
    );
  }
}
