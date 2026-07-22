import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secretKey = process.env.JWT_SECRET || "default_super_secret_key_123456";
const key = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  id: string;
  username: string;
  role: "EMPLOYEE" | "MANAGER" | "GLOBAL_ADMIN" | "TI_ADMIN" | "REGIONAL_MANAGER" | "VM";
  storeId: string | null;
  expiresAt: Date;
};

export async function encrypt(payload: Omit<SessionPayload, "expiresAt"> & { expiresAt: Date }) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, "expiresAt">) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({ ...payload, expiresAt });

  (await cookies()).set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const session = (await cookies()).get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function destroySession() {
  (await cookies()).delete("session");
}

export async function createDevSession(payload: Omit<SessionPayload, "expiresAt">) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ ...payload, expiresAt });

  (await cookies()).set("dev_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getDevSession() {
  const session = (await cookies()).get("dev_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function destroyDevSession() {
  (await cookies()).delete("dev_session");
}
