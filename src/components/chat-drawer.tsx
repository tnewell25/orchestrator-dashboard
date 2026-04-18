"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Mic, MicOff, Send, X, Loader2 } from "lucide-react";
import { useChatHistory, useSendChat } from "@/lib/api";

const SESSION_KEY = "orchestrator-web-session-id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "web-default";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  // Stable per-browser session id so the agent's per-session memory
  // (W6 SessionBrief, conversation history) accumulates across visits.
  const fresh = `web-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

// Web Speech API typing — not in @types/dom yet for SpeechRecognition.
type RecognitionResult = { transcript: string; isFinal: boolean };
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<RecognitionResult>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const { data: messages, isLoading: historyLoading } = useChatHistory(sessionId);
  const send = useSendChat(sessionId);

  // Keyboard toggle: Cmd/Ctrl + /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Auto-scroll on new content
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, send.isPending]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft("");
    try {
      await send.mutateAsync(text);
    } catch (e) {
      // Restore draft on failure so the user can retry
      setDraft(text);
      console.error(e);
    }
  };

  const startRecording = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      alert("Voice input requires Chrome or Safari.");
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (alt) transcript += alt.transcript;
      }
      setDraft(transcript);
    };
    rec.onerror = (event) => {
      console.warn("speech error", event.error);
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    setRecording(true);
    rec.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const supportsVoice = typeof window !== "undefined" && !!getSpeechRecognition();
  const recentTurns = messages ?? [];

  return (
    <>
      {/* Floating action button — always reachable from any page */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
        title="Chat with the agent (Cmd+/)"
        aria-label="Open chat"
      >
        {open ? <X size={18} /> : <MessageSquare size={18} />}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-30 w-full sm:w-[380px] bg-white border-l border-zinc-200 shadow-xl flex flex-col">
          <header className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center text-white text-[10px] font-semibold">
                AI
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-800">Agent</p>
                <p className="text-[10px] text-zinc-400 font-mono truncate">{sessionId}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-500"
              aria-label="Close chat"
            >
              <X size={14} />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-zinc-50/60"
          >
            {historyLoading && recentTurns.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-6">Loading history...</p>
            )}
            {!historyLoading && recentTurns.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare size={20} className="inline text-zinc-300 mb-2" />
                <p className="text-xs text-zinc-500">
                  Talk to the agent. It can update deals, log meetings, set reminders, draft emails.
                </p>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Try: &quot;move Bosch Forge to negotiation&quot;
                </p>
              </div>
            )}
            {recentTurns.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-zinc-900 text-white"
                      : "bg-white border border-zinc-200 text-zinc-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {send.isPending && (
              <div className="flex justify-start">
                <div className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin text-zinc-400" />
                  <span className="text-[11px] text-zinc-500">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="p-2 border-t border-zinc-200 bg-white shrink-0"
          >
            <div className="flex items-end gap-1.5">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={recording ? "Listening..." : "Message the agent..."}
                rows={1}
                className="flex-1 resize-none px-2 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 max-h-32"
                style={{ minHeight: "2.25rem" }}
              />
              {supportsVoice && (
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={send.isPending}
                  className={`p-1.5 rounded shrink-0 ${
                    recording
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                  } disabled:opacity-50`}
                  title={recording ? "Stop recording" : "Voice input"}
                  aria-label={recording ? "Stop recording" : "Start voice input"}
                >
                  {recording ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}
              <button
                type="submit"
                disabled={!draft.trim() || send.isPending}
                className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white shrink-0 disabled:opacity-40"
                title="Send (Enter)"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 px-1">
              Enter to send · Shift+Enter newline · Cmd+/ to toggle
              {!supportsVoice && " · voice not supported in this browser"}
            </p>
          </form>
        </div>
      )}
    </>
  );
}
