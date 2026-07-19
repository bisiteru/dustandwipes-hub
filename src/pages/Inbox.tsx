// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Conversations Inbox (Phase B2)
//  Unified messaging surface: one thread per contact, WhatsApp-first.
//  Self-contained page — talks to dw_conversations/dw_messages exclusively
//  through lib/messaging.ts (paginated + realtime), owns no App-level state.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MessageCircle, Send, Plus, ChevronLeft, Bot, RefreshCw } from "lucide-react";
import { G, GL, O, BLUE, inp } from "../lib/constants";
import { Card, Fld } from "../components/ui/primitives";
import { ModalWrap } from "../components/ui/ModalWrap";
import { useToast } from "../components/ui/Toaster";
import {
  Conversation, Message,
  listConversations, listMessages, upsertConversation,
  sendMessage, markRead, setAiEnabled, subscribeMessaging, messagingClient,
} from "../lib/messaging";
import type { CurrentUser } from "../lib/schemas";

export interface InboxPageProps { user: CurrentUser; }

const timeShort = (iso: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export function InboxPage({ user }: InboxPageProps) {
  const toast = useToast();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newModal, setNewModal] = useState<{ phone: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string>("");
  activeIdRef.current = active?.id || "";

  const configured = !!messagingClient();

  const refreshConvos = useCallback(async () => {
    setConvos(await listConversations());
  }, []);

  useEffect(() => { refreshConvos(); }, [refreshConvos]);

  // Realtime: append messages to the open thread; refresh thread ordering.
  useEffect(() => {
    const un = subscribeMessaging(
      m => {
        if (m.conversation_id === activeIdRef.current) {
          setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
          markRead(m.conversation_id);
        }
        refreshConvos();
      },
      () => refreshConvos(),
    );
    return un;
  }, [refreshConvos]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const openThread = async (cv: Conversation) => {
    setActive(cv);
    setLoadingMsgs(true);
    const page = await listMessages(cv.id);
    setMessages(page);
    setHasMore(page.length >= 30);
    setLoadingMsgs(false);
    markRead(cv.id);
    setConvos(prev => prev.map(c => (c.id === cv.id ? { ...c, unread_count: 0 } : c)));
  };

  const loadOlder = async () => {
    if (!active || messages.length === 0) return;
    const older = await listMessages(active.id, messages[0].created_at);
    setMessages(prev => [...older, ...prev]);
    setHasMore(older.length >= 30);
  };

  const doSend = async () => {
    if (!active || !draft.trim() || sending) return;
    setSending(true);
    const m = await sendMessage(active.id, draft, user.name);
    setSending(false);
    if (!m) { toast.error("Message failed to save — check your connection"); return; }
    setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
    setDraft("");
    refreshConvos();
  };

  const createThread = async () => {
    if (!newModal?.phone.trim()) return;
    const cv = await upsertConversation(newModal.phone.trim(), newModal.name.trim());
    if (!cv) { toast.error("Could not create conversation"); return; }
    setNewModal(null);
    await refreshConvos();
    openThread(cv);
  };

  const toggleAi = async () => {
    if (!active) return;
    const next = !active.ai_enabled;
    await setAiEnabled(active.id, next);
    setActive({ ...active, ai_enabled: next });
    toast.info(next ? "AI auto-responder ON for this thread" : "AI auto-responder OFF — you're replying manually");
  };

  const totalUnread = useMemo(() => convos.reduce((s, c) => s + (c.unread_count || 0), 0), [convos]);

  if (!configured) return (
    <Card className="p-8 text-center">
      <MessageCircle size={32} className="mx-auto mb-3 opacity-20" />
      <p className="text-sm text-gray-500">Messaging needs the Supabase environment variables to be configured.</p>
    </Card>
  );

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-4">

      {/* Thread list — hidden on mobile when a thread is open */}
      <div className={`${active ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 flex-shrink-0`}>
        <Card className="flex-1 flex flex-col overflow-hidden p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <MessageCircle size={15} style={{ color: G }} /> Inbox
              {totalUnread > 0 && <span className="px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: O, fontSize: "10px" }}>{totalUnread}</span>}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={refreshConvos} title="Refresh" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><RefreshCw size={13} /></button>
              <button onClick={() => setNewModal({ phone: "", name: "" })} title="New conversation" className="w-8 h-8 flex items-center justify-center rounded-lg text-white" style={{ background: G }}><Plus size={14} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {convos.length === 0 && (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-gray-400">No conversations yet.</p>
                <p className="text-xs text-gray-400 mt-1">Inbound WhatsApp messages will appear here once the number is connected — or start one with +.</p>
              </div>
            )}
            {convos.map(cv => (
              <button key={cv.id} onClick={() => openThread(cv)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${active?.id === cv.id ? "bg-gray-50" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">{cv.contact_name || cv.contact_phone}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeShort(cv.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-gray-500 truncate">{cv.last_message_preview || "—"}</p>
                  {cv.unread_count > 0 && <span className="px-1.5 rounded-full text-white font-bold flex-shrink-0" style={{ background: O, fontSize: "10px" }}>{cv.unread_count}</span>}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Thread view */}
      <div className={`${active ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
        <Card className="flex-1 flex flex-col overflow-hidden p-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">Select a conversation</p>
            </div>
          ) : (<>
            <div className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setActive(null)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><ChevronLeft size={16} /></button>
              <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ background: G }}>
                {(active.contact_name || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800 truncate">{active.contact_name || active.contact_phone}</p>
                <p className="text-xs text-gray-400">{active.contact_phone} · {active.channel}</p>
              </div>
              <button onClick={toggleAi} title={active.ai_enabled ? "AI responder ON — click to take over manually" : "AI responder OFF — click to re-enable"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                style={active.ai_enabled ? { background: GL, color: G, borderColor: G } : { color: "#9ca3af", borderColor: "#e5e7eb" }}>
                <Bot size={13} /> {active.ai_enabled ? "AI on" : "AI off"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/40">
              {hasMore && (
                <button onClick={loadOlder} className="block mx-auto text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-white">
                  Load earlier messages
                </button>
              )}
              {loadingMsgs && <p className="text-center text-xs text-gray-400 py-4">Loading…</p>}
              {!loadingMsgs && messages.length === 0 && <p className="text-center text-xs text-gray-400 py-8">No messages yet — say hello.</p>}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${m.direction === "out" ? "text-white rounded-br-md" : "bg-white border border-gray-100 text-gray-800 rounded-bl-md"}`}
                    style={m.direction === "out" ? { background: m.ai_generated ? BLUE : G } : {}}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-right mt-0.5 ${m.direction === "out" ? "text-white/70" : "text-gray-400"}`} style={{ fontSize: "10px" }}>
                      {m.ai_generated ? "AI · " : ""}{timeShort(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t flex items-end gap-2 flex-shrink-0">
              <textarea
                className={`${inp} flex-1 resize-none`} rows={1}
                placeholder="Type a message…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
              />
              <button onClick={doSend} disabled={!draft.trim() || sending}
                className="w-11 h-11 rounded-xl text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0" style={{ background: G }}>
                <Send size={16} />
              </button>
            </div>
          </>)}
        </Card>
      </div>

      {/* New conversation */}
      {newModal && (
        <ModalWrap title="New Conversation" onClose={() => setNewModal(null)}>
          <div className="space-y-4">
            <Fld label="Phone (WhatsApp)" required>
              <input className={inp} value={newModal.phone} onChange={e => setNewModal(p => p ? { ...p, phone: e.target.value } : p)} placeholder="e.g. 2348031234567" />
            </Fld>
            <Fld label="Contact name">
              <input className={inp} value={newModal.name} onChange={e => setNewModal(p => p ? { ...p, name: e.target.value } : p)} placeholder="Client or company" />
            </Fld>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <button onClick={() => setNewModal(null)} className="px-5 py-2 rounded-xl border text-gray-600 text-sm">Cancel</button>
            <button onClick={createThread} disabled={!newModal.phone.trim()} className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: G }}>Start</button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
