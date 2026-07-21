import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { createDevSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Usuário e senha são obrigatórios." }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("dev_users")
      .select("id, username, password_hash, role, is_active")
      .eq("username", username)
      .single();

    if (error || !user) {
      return NextResponse.json({ message: "Credenciais de TI inválidas." }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ message: "Usuário de TI inativo." }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ message: "Credenciais de TI inválidas." }, { status: 401 });
    }

    await createDevSession({
      id: user.id,
      username: user.username,
      role: user.role,
      storeId: null,
    });

    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    return NextResponse.json({ message: "Ocorreu um erro no servidor." }, { status: 500 });
  }
}
