import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

/**
 * Retorna os usuários MANAGER e VM da loja do usuário logado.
 * Usado no modal de registro de cartão para incluir gerentes na lista de seleção.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Acesso negado." }, { status: 403, headers: noStore });

    const url = new URL(request.url);
    const queryStoreId = url.searchParams.get("storeId");

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    if ((["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) && queryStoreId) {
      storeId = queryStoreId;
    }

    let query = supabaseAdmin
      .from("app_users")
      .select("id, name, username, role")
      .in("role", ["MANAGER", "VM"])
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const managers = (data ?? []).map((u) => ({
      id: u.id,
      name: u.name || u.username,
      role: u.role as "MANAGER" | "VM",
    }));

    return NextResponse.json({ managers }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar gerentes." },
      { status: 500, headers: noStore },
    );
  }
}
