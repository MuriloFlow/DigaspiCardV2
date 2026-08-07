import { sendErrorToDiscord } from "./src/lib/utils/error-handler";

async function runTest() {
  console.log("Simulando erro de Fetch (Conexão)...");
  await sendErrorToDiscord({
    error: new Error("Failed to fetch: Connection reset by peer (ECONNRESET)"),
    context: "ClientSide: Buscando lista de colaboradores",
    extra: { url: "/api/collaborators", status: 0, user_id: "usr_123456" }
  });

  console.log("Simulando erro de Banco de Dados (Supabase)...");
  const dbError: any = new Error("new row for relation \"records\" violates check constraint \"positive_amount\"");
  dbError.code = "23514";
  await sendErrorToDiscord({
    error: dbError,
    context: "ServerSide: Criando registro de cartão",
    extra: { payload: { operator: "João", amount: -50 } }
  });

  console.log("Simulando Erro Crítico (Sistema/Runtime)...");
  const sysError = new TypeError("Cannot read properties of undefined (reading 'map')");
  // Artificial stack trace
  sysError.stack = `TypeError: Cannot read properties of undefined (reading 'map')
    at RankingView (src/components/records/ranking-view.tsx:150:23)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:16305:18)
    at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:20074:13)
    at beginWork (node_modules/react-dom/cjs/react-dom.development.js:21587:16)`;

  await sendErrorToDiscord({
    error: sysError,
    context: "React: Renderizando Dashboard",
    extra: { component: "RankingView", state: "loading=false" }
  });

  console.log("✅ Webhooks enviados com sucesso!");
}

runTest().catch(console.error);
