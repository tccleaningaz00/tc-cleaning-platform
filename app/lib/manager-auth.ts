
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type ManagerRole = "owner_admin" | "viewer";

export type Manager = {
  email: string;
  role: ManagerRole;
};

// Both managers have identical permissions.
const MANAGERS = [
  {
    email: "criscon@tccleaningaz.com",
    role: "owner_admin" as const,
    passwordHash: () => process.env.MANAGER_CRIS_PASSWORD_HASH,
  },
  {
    email: "robert@tccleaningaz.com",
    role: "owner_admin" as const,
    passwordHash: () => process.env.MANAGER_ROBERTO_PASSWORD_HASH,
  },
  {
    email: "fea20091@live.com",
    role: "owner_admin" as const,
    passwordHash: () => process.env.MANAGER_NORMA_PASSWORD_HASH,
  },
];

function getSessionSecret() {
  const secret = process.env.MANAGER_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "MANAGER_SESSION_SECRET must contain at least 32 characters."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function verifyManager(
  email: string,
  password: string
): Promise<Manager | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const account = MANAGERS.find(
    (manager) => manager.email === normalizedEmail
  );

  if (!account) return null;

  const passwordHash = account.passwordHash();

  if (!passwordHash) return null;

  try {
    const passwordIsValid = await bcrypt.compare(password, passwordHash);

    if (!passwordIsValid) return null;

    return {
  email: account.email,
  role: account.role,
};
  } catch {
    return null;
  }
}

export async function createManagerSession(
  manager: Manager
): Promise<string> {
  return new SignJWT({ role: manager.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(manager.email)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSessionSecret());
}

export async function verifyManagerSession(
  token: string
): Promise<Manager | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });

    const email = payload.sub;
    const role = payload.role;

    const authorizedAccount = MANAGERS.some(
      (manager) => manager.email === email
    );

    if (!authorizedAccount || role !== "owner_admin") {
      return null;
    }

  return {
  email: email!,
  role: "owner_admin",
};
  } catch {
    return null;
  }
}
