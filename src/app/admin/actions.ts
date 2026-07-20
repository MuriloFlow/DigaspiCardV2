"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createStore(name: string) {
  if (!name.trim()) throw new Error("Nome da loja é obrigatório.");
  const { error } = await supabaseAdmin.from("stores").insert({ name: name.trim() });
  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function getAdminData() {
  const { data: stores } = await supabaseAdmin.from("stores").select("*").order("name");
  const { data: users } = await supabaseAdmin.from("app_users").select("id, username, role, name, is_active, store_id").order("username");
  return { stores: stores || [], users: users || [] };
}
