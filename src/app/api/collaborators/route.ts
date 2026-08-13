import { NextResponse } from "next/server";
import {
  listCollaborators,
  getCollaboratorRecords,
  mergeCollaborators,
  unmergeCollaborator,
  renameCollaborator,
  deleteCollaborator,
  createCollaborator,
  findSimilarCollaborators,
  toggleCollaboratorActive,
  hardDeleteCollaborator,
  transferCollaborator,
} from "@/lib/records/repository";
import { getSession } from "@/lib/auth/session";
import { handleError } from "@/lib/utils/error-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden();

    const url = new URL(request.url);
    const queryStoreId = url.searchParams.get("storeId");

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    if ((["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) && queryStoreId) {
      storeId = queryStoreId;
    }

    const collaborators = await listCollaborators(storeId);
    return NextResponse.json({ collaborators }, { headers: noStore });
  } catch (error) {
    const msg = await handleError(error, "collaborators:GET");
    return NextResponse.json({ message: msg }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400, headers: noStore });
  }

  const action = body.action as string;

  try {
    const session = await getSession();
    if (!session) return forbidden();

    // Controle de acesso por ação
    const isEmployee = session.role === "EMPLOYEE";
    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    if (action === "create") {
      if (isEmployee) return forbidden("Funcionários não podem criar colaboradores.");

      // GLOBAL_ADMIN e REGIONAL_MANAGER podem especificar a loja. MANAGER usa a própria loja.
      const targetStoreId = isGlobalOrRegional
        ? (body.storeId as string)
        : session.storeId;

      if (!targetStoreId) {
        return NextResponse.json(
          { message: "Unidade (loja) é obrigatória para criar um colaborador." },
          { status: 400, headers: noStore },
        );
      }

      await createCollaborator(body.name as string, targetStoreId, body.subRole as string);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "records") {
      const records = await getCollaboratorRecords(body.collaboratorId as string);
      return NextResponse.json({ records }, { headers: noStore });
    }

    if (action === "merge") {
      if (isEmployee) return forbidden();
      await mergeCollaborators(body.keepId as string, body.mergeId as string);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "unmerge") {
      if (isEmployee) return forbidden();
      await unmergeCollaborator(body.mergeId as string);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "rename") {
      if (isEmployee) return forbidden();
      await renameCollaborator(body.id as string, body.newName as string);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "delete") {
      if (isEmployee) return forbidden();
      await deleteCollaborator(body.id as string);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "toggle-active") {
      if (isEmployee) return forbidden();
      await toggleCollaboratorActive(body.id as string, body.isActive as boolean);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "transfer") {
      if (isEmployee) return forbidden();
      await transferCollaborator(body.id as string, body.newStoreId as string);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "hard-delete") {
      if (isEmployee) return forbidden();
      await hardDeleteCollaborator(body.id as string, storeId);
      const collaborators = await listCollaborators(storeId);
      return NextResponse.json({ collaborators, success: true }, { headers: noStore });
    }

    if (action === "similar") {
      const results = await findSimilarCollaborators(body.name as string, storeId);
      return NextResponse.json({ results }, { headers: noStore });
    }

    return NextResponse.json({ message: "Ação desconhecida." }, { status: 400, headers: noStore });
  } catch (error) {
    const msg = await handleError(error, `collaborators:POST:${action}`);
    return NextResponse.json({ message: msg }, { status: 400, headers: noStore });
  }
}
