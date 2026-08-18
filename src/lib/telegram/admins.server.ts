import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Hard-coded owner: can never be locked out. */
export const OWNER_TELEGRAM_ID = 8358563622;

export async function listAdmins(): Promise<{ id: number; label: string | null }[]> {
  const { data, error } = await supabaseAdmin
    .from("telegram_admins")
    .select("telegram_id,label")
    .order("added_at", { ascending: true });
  if (error || !data) return [{ id: OWNER_TELEGRAM_ID, label: "owner" }];
  const rows = (data as Record<string, any>[]).map((r) => ({
    id: Number(r["telegram_id"]),
    label: (r["label"] ?? null) as string | null,
  }));
  if (!rows.some((r) => r.id === OWNER_TELEGRAM_ID)) {
    rows.unshift({ id: OWNER_TELEGRAM_ID, label: "owner" });
  }
  return rows;
}

export async function isAdminUser(id: unknown): Promise<boolean> {
  const num = Number(id);
  if (!Number.isFinite(num)) return false;
  if (num === OWNER_TELEGRAM_ID) return true;
  const { data } = await supabaseAdmin
    .from("telegram_admins")
    .select("telegram_id")
    .eq("telegram_id", num)
    .maybeSingle();
  return Boolean(data);
}

export async function addAdmin(id: number, label?: string) {
  const { error } = await supabaseAdmin
    .from("telegram_admins")
    .upsert({ telegram_id: id, label: label ?? null } as any, { onConflict: "telegram_id" });
  if (error) throw new Error(error.message);
}

export async function removeAdmin(id: number) {
  if (id === OWNER_TELEGRAM_ID) throw new Error("owner");
  const { error } = await supabaseAdmin
    .from("telegram_admins")
    .delete()
    .eq("telegram_id", id);
  if (error) throw new Error(error.message);
}
