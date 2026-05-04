import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { api } from "../api";
import { OmniAgentRpcClient } from "../omniagentRpc";
import "./Chatbot.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

function formatChicagoDateTime(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

function formatToolResult(output: string): string | null {
  const trimmed = (output || "").trim();
  if (!trimmed) return null;

  let parsed: any = null;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object") {
    if (parsed.error === "AUTH_REQUIRED" || parsed.message === "AUTH_REQUIRED") {
      return "Your session expired. Please log in again.";
    }
    if (parsed.error === "TOOL_REJECTED") {
      return "I couldn’t complete that.";
    }

    const checkouts = parsed.checkouts;
    if (Array.isArray(checkouts)) {
      if (!checkouts.length) return "You don’t have any active equipment checkouts.";
      const lines = ["Here’s what you currently have checked out:"];
      for (const c of checkouts.slice(0, 10)) {
        const name = c?.item_name ?? c?.item?.name ?? "(unknown item)";
        const due = c?.due_at ? formatChicagoDateTime(String(c.due_at)) : null;
        lines.push(`- ${name}${due ? ` — due ${due}` : ""}`);
      }
      if (checkouts.length > 10) lines.push(`(+${checkouts.length - 10} more)`);
      return lines.join("\n");
    }

    const reservations = parsed.reservations;
    if (Array.isArray(reservations)) {
      const upcoming = reservations.filter((r) => r && r.status !== "CANCELLED");
      if (!upcoming.length) return "You don’t have any upcoming reservations.";
      const lines = ["Here are your upcoming reservations:"];
      for (const r of upcoming.slice(0, 10)) {
        const roomName = r?.room_name ?? r?.room?.name ?? r?.room ?? "(room)";
        const start = r?.start_time ? formatChicagoDateTime(String(r.start_time)) : null;
        const end = r?.end_time ? formatChicagoDateTime(String(r.end_time)) : null;
        if (start && end) lines.push(`- ${roomName} — ${start} to ${end}`);
        else if (start) lines.push(`- ${roomName} — ${start}`);
        else lines.push(`- ${roomName}`);
      }
      if (upcoming.length > 10) lines.push(`(+${upcoming.length - 10} more)`);
      return lines.join("\n");
    }

    const reservation = parsed.reservation;
    if (reservation && typeof reservation === "object") {
      return "All set.";
    }

    const checkout = parsed.checkout;
    if (checkout && typeof checkout === "object") {
      return "All set.";
    }

    const waitlist = parsed.waitlist;
    if (waitlist && typeof waitlist === "object") {
      return "You’ve been added to the waitlist.";
    }
  }

  return trimmed;
}

export default function Chatbot({
  onMutation,
  listHeight = 340,
}: {
  onMutation?: () => void;
  listHeight?: number;
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const omni = useMemo(() => new OmniAgentRpcClient(), []);
  const omniSessionKey = useMemo(() => {
    const suffix = token ? token.slice(-12) : "anon";
    return `omniagent_session_id_v1_${suffix}`;
  }, [token]);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  if (!token) return null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed, ts: Date.now() }]);

    let assistantAdded = false;
    let lastToolOutput: string | null = null;
    let didMutate = false;

    try {
      let apiBase = (api.defaults.baseURL || "").replace(/\/$/, "");
      apiBase = apiBase.replace(/\/api$/, "");
      const jwt = token || "";
      const sessionId = localStorage.getItem(omniSessionKey);

      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const browserNowIso = new Date().toISOString();

      await omni.connect((n) => {
          if (n.method === "message_output") {
            const content = String(n.params?.content ?? "");
            if (!assistantAdded) {
              assistantAdded = true;
              setMessages((prev) => [...prev, { role: "assistant", content, ts: Date.now() }]);
            } else {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") next[next.length - 1] = { ...last, content };
                return next;
              });
            }
          }

        if (n.method === "tool_called") {
          const tool = String(n.params?.tool ?? "");
          if (
            tool === "create_equipment_checkout" ||
            tool === "cancel_equipment" ||
            tool === "create_room_reservation" ||
            tool === "cancel_reservation"
          ) {
            didMutate = true;
          }
        }

        if (n.method === "tool_result") {
          const output = String(n.params?.output ?? "");
          const formatted = formatToolResult(output);
          if (formatted) lastToolOutput = formatted;

          if (formatted === "Your session expired. Please log in again.") {
            try {
              localStorage.removeItem("token");
            } catch {
              return;
            }
          }

          const tool = String(n.params?.tool ?? "");
          if (
            tool === "create_equipment_checkout" ||
            tool === "cancel_equipment" ||
            tool === "create_room_reservation" ||
            tool === "cancel_reservation"
          ) {
            didMutate = true;
          }
        }

        if (n.method === "client_request") {
          const requestId = String(n.params?.request_id ?? "");
          if (requestId) {
            const fn = String(n.params?.function ?? "");
            if (fn === "ui.request_tool_approval") {
              void omni.call("client_response", {
                request_id: requestId,
                ok: true,
                result: { approved: true, always_approve: true },
              });
            } else {
              void omni.call("client_response", { request_id: requestId, ok: true, result: {} });
            }
          }
        }

        if (n.method === "run_end") {
          const errMsg = n.params?.error?.message ? String(n.params.error.message) : null;
          if (!assistantAdded) {
            setMessages((prev) => [
              ...prev,
              {
                  role: "assistant",
                  content: errMsg
                    ? `Error: ${errMsg}`
                    : lastToolOutput
                      ? lastToolOutput
                      : "No response.",
                  ts: Date.now(),
                },
              ]);
            } else if (errMsg) {
              setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}`, ts: Date.now() }]);
            }

          setBusy(false);
          if (didMutate) {
            setTimeout(() => {
              onMutation?.();
            }, 600);
          }
        }
      });

      const prompt = `SESSION_AUTH token=${jwt} base_url=${apiBase}\nCLIENT_CONTEXT now=${browserNowIso} tz=${browserTimeZone}\n\n${trimmed}`;
      const result = await omni.call("start_run", { prompt, session_id: sessionId || undefined });
      if (result?.session_id) {
        localStorage.setItem(omniSessionKey, String(result.session_id));
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e?.message || "Request failed"}`, ts: Date.now() },
      ]);
      setBusy(false);
    }
  }

  function fmtTime(ts: number): string {
    try {
      return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(ts));
    } catch {
      return "";
    }
  }

  const examples = [
    "Reserve room 2.100C today 3pm–4pm",
    "Reserve Computer 2.1 today 3pm–4pm",
    "What rooms do I have booked?",
    "What computers do I have booked?",
    "What equipment do I have checked out?",
  ];

  return (
    <div className="lc-chat">
      <div
        ref={listRef}
        className="lc-chat-list" // removed p2 so theres no padding for 'ready'
        style={{ height: listHeight }}
      >
        <div className="lc-chat-topbar">
          <div className="lc-chat-status">
            <div className="d-flex align-items-center" style={{ gap: 8 }}>
              <span className="lc-chat-dot" style={{ background: busy ? "#ffc107" : "#198754" }} />
              <div className="text-muted" style={{ fontSize: 11 }}>
                {busy ? "Thinking…" : "Ready"}
              </div>
            </div>
            {messages.length > 0 ? (
              <a
                role="button"
                className="lc-chat-clear"
                onClick={(e) => {
                  e.preventDefault();
                  setMessages([]);
                }}
              >
                Clear
              </a>
            ) : null}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="lc-chat-empty">
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Try an example:
            </div>
            <div className="d-flex flex-column" style={{ gap: 8, width: "100%" }}>
              {examples.map((ex) => (
                <a
                  key={ex}
                  role="button"
                  className="lc-chat-example"
                  onClick={(e) => {
                    e.preventDefault();
                    setDraft(ex);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                >
                  {ex}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div key={idx} className={`lc-chat-row ${isUser ? "lc-chat-row-user" : "lc-chat-row-assistant"}`}>
                  <div style={{ maxWidth: "88%" }}>
                    <div className={`lc-chat-bubble ${isUser ? "lc-chat-bubble-user" : "lc-chat-bubble-assistant"}`}>
                      {m.content}
                    </div>
                    <div className={`text-muted ${isUser ? "text-end" : "text-start"} lc-chat-meta`}>
                      {fmtTime(m.ts)}
                    </div>
                  </div>
                </div>
              );
            })}
            {busy ? (
              <div className="lc-chat-row lc-chat-row-assistant">
                <div style={{ maxWidth: "88%" }}>
                  <div className="lc-chat-bubble lc-chat-bubble-assistant">
                    <span className="lc-chat-typing">
                      <Spinner animation="border" size="sm" /> Thinking…
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="lc-chat-composer">
        <textarea
          ref={inputRef}
          className="form-control lc-chat-input"
          value={draft}
          placeholder="How can I help you?"
          disabled={busy}
          rows={1}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = draft;
              setDraft("");
              void send(text);
            }
          }}
        />
        <Button
          variant="primary"
          disabled={busy || !draft.trim()}
          className="lc-chat-send"
          onClick={() => {
            const text = draft;
            setDraft("");
            void send(text);
          }}
        >
          <span className="d-inline-flex align-items-center" style={{ gap: 8 }}>
            Send <i className="bi bi-send-fill" />
          </span>
        </Button>
      </div>
    </div>
  );
}
