"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

type CreateTicketData = {
  title: string;
  category: string;
  description: string;
  images: string[];
};

export async function createSupportTicket(data: CreateTicketData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Usuário não autenticado.");
  }

  const { title, category, description, images } = data;

  const userInfo = `${session.username} (${session.role})`;
  
  let storeInfo = "Desconhecida";
  if (session.storeId) {
    const { data: storeData } = await supabaseAdmin
      .from("stores")
      .select("name")
      .eq("id", session.storeId)
      .single();
    if (storeData) storeInfo = storeData.name;
  }

  // Salvar no banco
  const { data: ticketData, error } = await supabaseAdmin
    .from("support_tickets")
    .insert({
      title,
      category,
      description,
      images,
      user_info: userInfo,
      store_info: storeInfo,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !ticketData) {
    console.error("Erro insert:", error);
    throw new Error(`Falha no Banco: ${error?.message || "Desconhecido"}. (Se for coluna ausente, recrie a tabela no Supabase)`);
  }

  const trackingId = ticketData.id;

  // Enviar para Discord
  if (DISCORD_WEBHOOK_URL) {
    try {
      const devUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dev/tickets/${trackingId}/view`;

      const embed = {
        title: `🚨 Chamado de TI Aberto: ${category}`,
        description: `**Motivo:** ${title}`,
        color: 0x3b82f6, // Azul
        fields: [
          { name: "🧑‍💻 Solicitante", value: userInfo, inline: true },
          { name: "🏢 Loja", value: storeInfo, inline: true },
          { name: "📄 Descrição", value: `\`\`\`\n${description.substring(0, 500)}\n\`\`\``, inline: false },
          { name: "📸 Imagens Anexadas", value: `${images.length} imagem(ns)`, inline: true },
          { name: "🔗 Ticket ID", value: trackingId, inline: false },
        ],
        timestamp: new Date().toISOString(),
      };

      const payload: any = {
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "Ver Chamado e Resolver",
                url: devUrl,
              },
            ],
          },
        ],
      };

      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (discordErr) {
      console.error("Falha ao enviar webhook de suporte para o Discord:", discordErr);
    }
  }

  return trackingId;
}

export async function getUserOpenTickets() {
  const session = await getSession();
  if (!session) return [];

  const userInfo = `${session.username} (${session.role})`;

  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .eq("user_info", userInfo)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar chamados do usuario:", error);
    return [];
  }

  return data;
}

export async function getTicketMessages(ticketId: string) {
  const { data, error } = await supabaseAdmin
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    if (!error.message.includes("does not exist")) {
      console.error("Erro ao buscar mensagens do ticket:", error);
    }
    return [];
  }
  return data;
}

export async function sendTicketMessage(ticketId: string, content: string, images: string[] = [], asRole?: "TI" | "USER") {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado");

  const senderType = asRole || (session.role === "GLOBAL_ADMIN" || session.role === "MANAGER" ? "TI" : "USER");
  const senderName = senderType === "TI" ? `Suporte TI (${session.username})` : session.username;

  const { data, error } = await supabaseAdmin
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_type: senderType,
      sender_name: senderName,
      content,
      images,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Falha ao enviar mensagem: ${error.message}`);
  }

  return data;
}
