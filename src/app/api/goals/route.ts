import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { toDateKey } from "@/lib/utils/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Acesso negado." }, { status: 403, headers: noStore });

    const { searchParams } = new URL(request.url);
    const dateKey = searchParams.get("date") || toDateKey(new Date().toISOString());
    
    let query = supabaseAdmin
      .from("daily_goals")
      .select("goal")
      .eq("date_key", dateKey);

    if (!["GLOBAL_ADMIN", "TI_ADMIN"].includes(session.role)) {
        query = query.eq("store_id", session.storeId);
    } else {
        // Para admin global, a meta manual pode não fazer muito sentido ou seria a soma. 
        // Por hora, se for global_admin, podemos tentar somar se houver.
        const { data: allGoals, error: errAll } = await query;
        if (errAll) throw errAll;
        if (!allGoals || allGoals.length === 0) return NextResponse.json({ goal: null }, { headers: noStore });
        const total = allGoals.reduce((acc, curr) => acc + curr.goal, 0);
        return NextResponse.json({ goal: total }, { headers: noStore });
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);

    return NextResponse.json({ goal: data?.goal ?? null }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar meta manual." },
      { status: 500, headers: noStore },
    );
  }
}
