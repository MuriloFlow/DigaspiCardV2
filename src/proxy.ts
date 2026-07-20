import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "default_super_secret_key_123456";
const key = new TextEncoder().encode(secretKey);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Rotas públicas e estáticas
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname.includes("favicon") ||
    pathname.includes(".png")
  ) {
    return NextResponse.next();
  }

  // Verifica Sessão
  const sessionToken = req.cookies.get("session")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(sessionToken, key, { algorithms: ["HS256"] });
    const role = payload.role as string;
    
    // Controle de acesso baseado em Roles
    // Apenas Administradores ou Gerentes podem acessar colaboradores
    if (pathname.startsWith("/colaboradores") && role === "EMPLOYEE") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const res = NextResponse.next();
    // Injetar dados no header se precisar ler do server component
    res.headers.set("x-user-role", role);
    return res;
  } catch (error) {
    // Token inválido ou expirado
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("session");
    return res;
  }
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
