import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getRemarcacoesByBarcode } from "@/lib/remarcacoes/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

// ── GET /api/remarcacoes/search?barcode=xxx ──────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Sessão inválida." }, { status: 403, headers: noStore });
    }

    const url = new URL(request.url);
    const barcode = url.searchParams.get("barcode")?.trim();

    if (!barcode) {
      return NextResponse.json({ message: "Parâmetro 'barcode' é obrigatório." }, { status: 400, headers: noStore });
    }

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    const remarcacoes = await getRemarcacoesByBarcode(barcode, storeId);

    return NextResponse.json({ remarcacoes }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro na busca." },
      { status: 500, headers: noStore },
    );
  }
}
