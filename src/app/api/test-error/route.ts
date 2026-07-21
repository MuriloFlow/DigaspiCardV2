import { NextResponse } from "next/server";
import { handleError } from "@/lib/utils/error-handler";

export async function GET(request: Request) {
  try {
    const fakeError = new Error("Teste manual de erro pelo desenvolvedor.");
    (fakeError as any).code = "DEV_TEST";
    
    // handleError chama classifyError, envia Discord se for system level.
    // Vamos chamar sendErrorToDiscord diretamente pra forçar
    const { sendErrorToDiscord } = require("@/lib/utils/error-handler");
    await sendErrorToDiscord({
      error: fakeError,
      context: "Teste via /api/test-error",
      extra: { teste: true }
    });

    return NextResponse.json({ success: true, message: "Webhook disparado!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
