
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const SESSION_SECRET = process.env.MANAGER_SESSION_SECRET;

function getSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error("MANAGER_SESSION_SECRET must be at least 32 characters.");
  }

  return new TextEncoder().encode(SESSION_SECRET);
}

const MANAGERS = [
  {
    email: "criscon@tccleaningaz.com",
    role: "owner",
    passwordHash: process.env.CRIS_PASSWORD_HASH,
  },
  {
    email: "robert@tccleaningaz.com",
    role: "owner",
    passwordHash: process.env.ROBERTO_PASSWORD_HASH,
  },
];

export async function verifyManager(
  email: string,
  password: string
) {
  const manager = MANAGERS.find(
    (item) => item.email === email.trim().toLowerCase()
  );

  if (!manager || !manager.passwordHash) {
    return null;
  }

  const validPassword = await bcrypt.compare(
    password,
    manager.passwordHash
  );

  if (!validPassword) {
    return null;
  }

  return {
    email: manager.email,
    role: manager.role,
  };
}

export async function createManagerSession(
  manager: { email: string; role: string }
) {
  return new SignJWT({
    email: manager.email,
    role: manager.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyManagerSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    if (
      typeof payload.email !== "string" ||
      !["owner", "manager"].includes(String(payload.role))
    ) {
      return null;
    }

    return {
      email: payload.email,
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}
