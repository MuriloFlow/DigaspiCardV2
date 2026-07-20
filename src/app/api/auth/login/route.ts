import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Usuário e senha são obrigatórios." }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, password_hash, role, is_active, store_id")
      .eq("username", username)
      .single();

    if (error || !user) {
      return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ message: "Usuário inativo." }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
    }

    // Criar sessão com storeId embutido no JWT
    await createSession({
      id: user.id,
      username: user.username,
      role: user.role,
      storeId: user.store_id ?? null,
    });

    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    return NextResponse.json({ message: "Ocorreu um erro no servidor." }, { status: 500 });
  }
}
