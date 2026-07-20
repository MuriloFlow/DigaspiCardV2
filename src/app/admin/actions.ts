"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createStore(name: string) {
  if (!name.trim()) throw new Error("Nome da loja é obrigatório.");
  const { data, error } = await supabaseAdmin.from("stores").insert({ name: name.trim() }).select("id").single();
  if (error) {
    if (error.code === '23505' || error.message.includes("stores_name_key")) {
      throw new Error(`A unidade "${name.trim()}" já está registrada na rede.`);
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin");
  return data.id;
}

export async function updateStore(id: string, name: string) {
  if (!name.trim()) throw new Error("Nome da loja é obrigatório.");
  const { error } = await supabaseAdmin.from("stores").update({ name: name.trim() }).eq("id", id);
  if (error) {
    if (error.code === '23505' || error.message.includes("stores_name_key")) {
      throw new Error(`A unidade "${name.trim()}" já está registrada na rede.`);
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin");
}

export async function createUser(data: { username: string; password_plain: string; role: string; name: string; store_id?: string | null }) {
  if (!data.username || !data.password_plain) throw new Error("Usuário e senha são obrigatórios.");
  
  const password_hash = await bcrypt.hash(data.password_plain, 10);
  
  const { error } = await supabaseAdmin.from("app_users").insert({
    username: data.username,
    password_hash,
    role: data.role,
    name: data.name,
    store_id: data.store_id || null
  });

  if (error) {
    if (error.code === '23505' || error.message.includes("app_users_username_key")) {
      throw new Error(`O login de usuário "${data.username}" já existe no sistema. Escolha outro.`);
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin");
}

export async function getAdminData() {
  const { data: stores } = await supabaseAdmin.from("stores").select("*").order("name");
  const { data: users } = await supabaseAdmin
    .from("app_users")
    .select("id, username, role, name, is_active, store_id, is_primary")
    .order("username");
  return { stores: stores || [], users: users || [] };
}

export async function updateUser(data: {
  id: string;
  name?: string;
  username?: string;
  password_plain?: string;
  role?: string;
  store_id?: string | null;
  is_active?: boolean;
  is_primary?: boolean;
}) {
  if (!data.id) throw new Error("ID do usuário é obrigatório.");

  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.username !== undefined) payload.username = data.username.trim();
  if (data.role !== undefined) payload.role = data.role;
  if (data.store_id !== undefined) payload.store_id = data.store_id || null;
  if (data.is_active !== undefined) payload.is_active = data.is_active;
  if (data.is_primary !== undefined) payload.is_primary = data.is_primary;

  // Só re-hasha a senha se uma nova for enviada
  if (data.password_plain && data.password_plain.trim().length > 0) {
    payload.password_hash = await bcrypt.hash(data.password_plain.trim(), 10);
  }

  const { error } = await supabaseAdmin.from("app_users").update(payload).eq("id", data.id);
  if (error) {
    if (error.code === '23505' || error.message.includes("app_users_username_key")) {
      throw new Error(`O login de usuário "${data.username}" já está sendo usado. Escolha outro.`);
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin");
}

export async function toggleUserActive(id: string, is_active: boolean) {
  const { error } = await supabaseAdmin.from("app_users").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function getGlobalMetrics() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
  const lastMonthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0, 23, 59, 59);

  const [storesRes, collabsRes, todayRes, monthRes, lastMonthRes] = await Promise.all([
    supabaseAdmin.from("stores").select("id, name", { count: "exact" }),
    supabaseAdmin.from("collaborators").select("id", { count: "exact" }).eq("is_active", true),
    supabaseAdmin.from("records").select("id", { count: "exact" }).gte("created_at", todayStart.toISOString()),
    supabaseAdmin.from("records").select("id", { count: "exact" }).gte("created_at", monthStart.toISOString()),
    supabaseAdmin.from("records").select("id", { count: "exact" }).gte("created_at", lastMonthStart.toISOString()).lte("created_at", lastMonthEnd.toISOString()),
  ]);

  const monthCount = monthRes.count ?? 0;
  const lastMonthCount = lastMonthRes.count ?? 0;
  const growth = lastMonthCount > 0 ? ((monthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

  return {
    totalStores: storesRes.count ?? 0,
    totalCollaborators: collabsRes.count ?? 0,
    cardsToday: todayRes.count ?? 0,
    cardsThisMonth: monthCount,
    cardsLastMonth: lastMonthCount,
    growthPercent: parseFloat(growth.toFixed(1)),
    stores: storesRes.data ?? [],
  };
}
