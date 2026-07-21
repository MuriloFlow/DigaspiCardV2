const DISCORD_WEBHOOK = "https://ptb.discord.com/api/webhooks/1529084073723695166/DCaxwJSS0vBsTVLsH5R5VAEPBz642LRMXyI812-iPeS7y7XWn_ts6FEs-hVDK7e6L7hm";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// ─── Classificação de erros ───────────────────────────────────────────────────

export type ClassifiedError = {
  /** Mensagem amigável para o usuário */
  userMessage: string;
  /** Nível: "user" = culpa do usuário, "system" = bug/infra */
  level: "user" | "system";
};

/**
 * Classifica qualquer erro vindo do Supabase ou da aplicação.
 * Retorna mensagem amigável + nível de severidade.
 */
export function classifyError(error: unknown, context?: string): ClassifiedError {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code ?? "";

  // ── Duplicatas ────────────────────────────────────────────────────────────
  if (code === "23505" || msg.includes("duplicate key") || msg.includes("already exists")) {
    if (msg.includes("username") || msg.includes("app_users_username_key")) {
      return { userMessage: "Esse login de usuário já está em uso. Escolha outro.", level: "user" };
    }
    if (msg.includes("stores_name_key") || msg.includes("stores")) {
      return { userMessage: "Já existe uma unidade com esse nome na rede.", level: "user" };
    }
    if (msg.includes("collaborators") || msg.includes("name")) {
      return { userMessage: "Já existe um colaborador com esse nome nesta unidade.", level: "user" };
    }
    return { userMessage: "Esse registro já existe. Verifique os dados e tente novamente.", level: "user" };
  }

  // ── Violação de check constraint ──────────────────────────────────────────
  if (code === "23514" || msg.includes("violates check constraint")) {
    if (msg.includes("sub_role_check")) {
      return { userMessage: "Subcargo inválido. Recarregue a página e tente novamente.", level: "system" };
    }
    if (msg.includes("role_check")) {
      return { userMessage: "Nível de acesso inválido. Recarregue a página e tente novamente.", level: "system" };
    }
    return { userMessage: "Valor inválido para este campo. Recarregue a página.", level: "system" };
  }

  // ── Foreign key / referência quebrada ────────────────────────────────────
  if (code === "23503" || msg.includes("foreign key")) {
    return { userMessage: "Operação inválida: este registro está vinculado a outros dados.", level: "user" };
  }

  // ── Not null ─────────────────────────────────────────────────────────────
  if (code === "23502" || msg.includes("null value")) {
    return { userMessage: "Preencha todos os campos obrigatórios.", level: "user" };
  }

  // ── Auth / sessão ─────────────────────────────────────────────────────────
  if (msg.includes("JWT") || msg.includes("session") || msg.includes("Acesso negado")) {
    return { userMessage: "Sessão expirada. Faça login novamente.", level: "user" };
  }

  // ── Erro desconhecido / infra ─────────────────────────────────────────────
  return { userMessage: "Entrar em contato com o desenvolvedor.", level: "system" };
}

// ─── Discord Webhook ──────────────────────────────────────────────────────────

export async function sendErrorToDiscord(opts: {
  error: unknown;
  context: string;
  extra?: Record<string, unknown>;
}): Promise<void> {
  try {
    const msg = opts.error instanceof Error ? opts.error.message : String(opts.error);
    const stack = opts.error instanceof Error ? (opts.error.stack ?? "N/A") : "N/A";
    const code = (opts.error as any)?.code ?? "—";
    const now = new Date().toISOString();
    const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "Desenvolvimento";
    const region = process.env.VERCEL_REGION || "Local (Dev)";

    const trackingId = crypto.randomUUID();
    let userContext = "Deslogado / API Automática";
    let storeContext = "—";

    try {
      const session = await getSession();
      if (session) {
        userContext = `@${session.username} (${session.role})`;
        if (session.storeId) {
          const { data } = await supabaseAdmin.from("stores").select("name").eq("id", session.storeId).single();
          storeContext = data?.name ? `${data.name} (${session.storeId.split('-')[0]})` : session.storeId;
        } else {
          storeContext = "Admin Global (Sem unidade)";
        }
      }
    } catch {
      // Falha silenciosa se não conseguir pegar sessão
    }

    const fields: { name: string; value: string; inline?: boolean }[] = [
      { name: "📍 Contexto", value: `\`\`\`${opts.context}\`\`\``, inline: false },
      { name: "❌ Mensagem", value: `\`\`\`${msg.slice(0, 900)}\`\`\``, inline: false },
      { name: "👤 Usuário", value: `\`${userContext}\``, inline: true },
      { name: "🏬 Unidade", value: `\`${storeContext}\``, inline: true },
      { name: "1️⃣ Código PG", value: `\`${code}\``, inline: true },
      { name: "🌍 Ambiente", value: `\`${env}\``, inline: true },
      { name: "🗺️ Região", value: `\`${region}\``, inline: true },
      { name: "🔍 Tracking ID", value: `\`${trackingId}\``, inline: true },
    ];

    if (opts.extra && Object.keys(opts.extra).length > 0) {
      const extraStr = JSON.stringify(opts.extra, null, 2).slice(0, 900);
      fields.push({ name: "📦 Dados Extras", value: `\`\`\`json\n${extraStr}\`\`\``, inline: false });
    }

    const embeds: any[] = [
      {
        title: "🚨 Erro de Sistema Detectado",
        description: `Um erro inesperado ocorreu na aplicação e precisa de atenção.`,
        color: 0xff4444,
        fields,
        footer: { text: `MuriloFlow ERP • ${now}` },
        timestamp: now,
      },
    ];

    const stackSlice = stack.split("\n").slice(0, 15).join("\n").slice(0, 3900);
    if (stackSlice && stackSlice !== "N/A" && !stackSlice.includes("Failed to fetch")) {
      embeds.push({
        title: "🧵 Stack Trace Detalhado",
        description: `\`\`\`\n${stackSlice}\`\`\``,
        color: 0x2b2d31,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const truncatedMsg = msg.slice(0, 5000);
    
    // ANTI-FLOOD: Check if there's an open error with the same message
    try {
      const { data: existing } = await supabaseAdmin
        .from("system_errors")
        .select("id")
        .eq("message", truncatedMsg)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Já existe um chamado aberto pra isso, aborta pra não floodar o TI!
        return;
      }
    } catch {
      // Ignora erro do select
    }

    // Tenta salvar no banco (não bloqueia se falhar)
    try {
      await supabaseAdmin.from("system_errors").insert({
        id: trackingId,
        message: truncatedMsg,
        context: opts.context,
        stack_trace: stackSlice && stackSlice !== "N/A" ? stackSlice : null,
        user_info: userContext,
        store_info: storeContext,
        status: "open",
      });
    } catch {
      // Falha silenciosa pra garantir que o webhook chegue
    }

    // Webhooks comuns do Discord não suportam botões (components). 
    // Precisamos colocar o link no corpo do embed.
    fields.push({
      name: "🛠️ Ação Rápida",
      value: `[**👉 Clique aqui para Validar e Corrigir o Erro**](${baseUrl}/dev/${trackingId}/validate)`,
      inline: false
    });

    const payload = {
      username: "MuriloFlow · Error Bot",
      avatar_url: "https://cdn.discordapp.com/emojis/1234567890.webp",
      embeds,
    };

    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silencioso — nunca deixar o webhook quebrar o fluxo principal
  }
}

// ─── Handler unificado ─────────────────────────────────────────────────────────

/**
 * Processa um erro: classifica, dispara webhook se necessário e retorna mensagem amigável.
 */
export async function handleError(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>,
): Promise<string> {
  const classified = classifyError(error);

  // Erros de sistema disparam o webhook Discord
  if (classified.level === "system") {
    void sendErrorToDiscord({ error, context, extra });
  }

  return classified.userMessage;
}
