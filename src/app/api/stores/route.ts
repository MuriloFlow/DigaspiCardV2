import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("id, name")
      .order("name");

    if (error) throw new Error(error.message);

    return NextResponse.json({ stores: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro." },
      { status: 500 },
    );
  }
}
