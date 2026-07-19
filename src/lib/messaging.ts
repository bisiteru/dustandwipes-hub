// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Messaging data layer (Phase B)
//
//  Deliberately NOT the dw_* (id, record jsonb) whole-table-sync pattern.
//  Conversations and messages are real relational tables with pagination and
//  realtime subscriptions — messages arrive by the thousands and the app must
//  never load-everything/sync-everything here. This module is the only place
//  that talks to dw_conversations / dw_messages; it uses @supabase/supabase-js
//  (already a dependency) for typed queries + realtime, while the rest of the
//  app keeps its existing raw-REST lib/supabase.ts unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";

export interface Conversation {
  id: string;
  contact_name: string;
  contact_phone: string;
  channel: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  lead_id: string;
  ai_enabled: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: "in" | "out";
  body: string;
  status: string;          // received | sent | delivered | read | failed
  sender_name: string;
  ai_generated: boolean;
  wa_message_id: string;
  created_at: string;
}

// Lazy singleton — created on first use so env-var absence doesn't crash boot.
let _client: SupabaseClient | null = null;
export function messagingClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

const PAGE = 30;

/** Newest-first page of conversation threads. */
export async function listConversations(offset = 0, limit = PAGE): Promise<Conversation[]> {
  const c = messagingClient();
  if (!c) return [];
  const { data, error } = await c
    .from("dw_conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) { console.warn("[msg] listConversations:", error.message); return []; }
  return (data || []) as Conversation[];
}

/**
 * Messages for one thread, newest page first, returned oldest→newest for
 * natural chat rendering. Pass `before` (ISO) to fetch the previous page when
 * the user scrolls up.
 */
export async function listMessages(conversationId: string, before?: string, limit = PAGE): Promise<Message[]> {
  const c = messagingClient();
  if (!c) return [];
  let q = c
    .from("dw_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) { console.warn("[msg] listMessages:", error.message); return []; }
  return ((data || []) as Message[]).reverse();
}

/**
 * Find-or-create the thread for a phone/channel identity. Used by the inbox
 * "new conversation" action and by the inbound webhook (server side mirrors
 * this logic in SQL).
 */
export async function upsertConversation(phone: string, name: string, channel = "whatsapp"): Promise<Conversation | null> {
  const c = messagingClient();
  if (!c) return null;
  const { data: existing } = await c
    .from("dw_conversations")
    .select("*")
    .eq("contact_phone", phone)
    .eq("channel", channel)
    .maybeSingle();
  if (existing) return existing as Conversation;
  const row = {
    id: `cv${Date.now()}`,
    contact_name: name || phone,
    contact_phone: phone,
    channel,
  };
  const { data, error } = await c.from("dw_conversations").insert(row).select().single();
  if (error) { console.warn("[msg] upsertConversation:", error.message); return null; }
  return data as Conversation;
}

/**
 * Record an outbound message and bump the thread. Actual WhatsApp dispatch is
 * the send-whatsapp edge function's job (env-gated on provider credentials);
 * we invoke it fire-and-forget so the inbox works end-to-end locally even
 * before credentials are configured — messages just stay status "sent".
 */
export async function sendMessage(conversationId: string, body: string, senderName: string, aiGenerated = false): Promise<Message | null> {
  const c = messagingClient();
  if (!c || !body.trim()) return null;
  const msg = {
    id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    conversation_id: conversationId,
    direction: "out" as const,
    body: body.trim(),
    status: "sent",
    sender_name: senderName,
    ai_generated: aiGenerated,
  };
  const { data, error } = await c.from("dw_messages").insert(msg).select().single();
  if (error) { console.warn("[msg] sendMessage:", error.message); return null; }
  await c.from("dw_conversations").update({
    last_message_at: new Date().toISOString(),
    last_message_preview: body.trim().slice(0, 80),
  }).eq("id", conversationId);
  // Provider dispatch — no-op 501 until WHATSAPP_* secrets are configured.
  fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ messageId: msg.id, conversationId }),
  }).catch(() => {});
  return data as Message;
}

/** Zero the unread counter when a thread is opened. */
export async function markRead(conversationId: string): Promise<void> {
  const c = messagingClient();
  if (!c) return;
  await c.from("dw_conversations").update({ unread_count: 0 }).eq("id", conversationId);
}

/** Toggle the per-thread AI auto-responder. */
export async function setAiEnabled(conversationId: string, enabled: boolean): Promise<void> {
  const c = messagingClient();
  if (!c) return;
  await c.from("dw_conversations").update({ ai_enabled: enabled }).eq("id", conversationId);
}

/**
 * Realtime: fire `onMessage` for every new message row, `onConversation` for
 * thread inserts/updates (ordering, unread badges). Returns an unsubscribe.
 */
export function subscribeMessaging(
  onMessage: (m: Message) => void,
  onConversation: (cv: Conversation) => void,
): () => void {
  const c = messagingClient();
  if (!c) return () => {};
  const ch: RealtimeChannel = c
    .channel("dw-messaging")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "dw_messages" },
      p => onMessage(p.new as Message))
    .on("postgres_changes", { event: "*", schema: "public", table: "dw_conversations" },
      p => onConversation(p.new as Conversation))
    .subscribe();
  return () => { c.removeChannel(ch); };
}
