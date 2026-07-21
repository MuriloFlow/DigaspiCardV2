"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function resolveErrorTicket(trackingId: string) {
  const { error } = await supabaseAdmin
    .from("system_errors")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", trackingId);

  if (error) {
    throw new Error("Erro ao atualizar o ticket no banco de dados.");
  }
}

export async function checkErrorTicketStatus(trackingId: string) {
  const { data, error } = await supabaseAdmin
    .from("system_errors")
    .select("status, message, context, stack_trace, user_info, store_info, created_at")
    .eq("id", trackingId)
    .single();

  if (error || !data) {
    return { status: "not_found" };
  }
  return data;
}


export async function getSystemErrors(status?: "open" | "resolved") {
  let query = supabaseAdmin
    .from("system_errors")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Erro ao buscar tickets de erro.");
  }
  return data;
}

export async function getSupportTickets(status?: "open" | "resolved") {
  let query = supabaseAdmin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  try {
    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar chamados de TI (tabela pode não existir):", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Exceção ao buscar chamados de TI:", err);
    return [];
  }
}

export async function resolveSupportTicket(ticketId: string) {
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    throw new Error("Erro ao resolver o chamado de TI.");
  }
}
