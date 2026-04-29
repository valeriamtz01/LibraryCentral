import { useEffect, useMemo, useState } from "react";
import { Button } from "react-bootstrap";
import Chatbot from "./Chatbot";

export default function FloatingAssistant({ onMutation }: { onMutation?: () => void }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const storageKey = useMemo(() => {
    const suffix = token ? token.slice(-12) : "anon";
    return `omniagent_widget_open_v1_${suffix}`;
  }, [token]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "1") setOpen(true);
      if (v === "0") setOpen(false);
    } catch {
      return;
    }
  }, [storageKey, token]);

  useEffect(() => {
    if (!token) return;
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      return;
    }
  }, [open, storageKey, token]);

  if (!token) return null;

  const description = "AI-powered help for room bookings and equipment checkouts.";

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 1050 }}>
      {!open ? (
        <Button
          variant="primary"
          className="d-flex align-items-center"
          style={{ borderRadius: 999, padding: "10px 14px", gap: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}
          onClick={() => setOpen(true)}
        >
          <span
            className="d-flex align-items-center justify-content-center"
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "linear-gradient(135deg, #534AB7 0%, #185FA5 100%)",
              color: "#fff",
              flex: "0 0 auto",
            }}
          >
            <i className="bi bi-cpu" style={{ fontSize: 12, lineHeight: "12px" }} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>LC Assistant</span>
        </Button>
      ) : (
        <div
          className="border rounded"
          style={{ width: 360, background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", overflow: "hidden" }}
        >
          <div
            className="d-flex align-items-center justify-content-between px-3"
            style={{ background: "#f8f9fa", borderBottom: "1px solid #e9ecef", height: 58 }}
          >
            <div className="d-flex align-items-center" style={{ gap: 10, minWidth: 0 }}>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: 32,
                  height: 32,
                  background: "linear-gradient(135deg, #534AB7 0%, #185FA5 100%)",
                  color: "#fff",
                  flex: "0 0 auto",
                }}
              >
                <i className="bi bi-cpu" style={{ fontSize: 14, lineHeight: "14px" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: "16px" }}>LC Assistant</div>
                <div className="text-muted" style={{ fontSize: 11, lineHeight: "14px" }}>
                  {description}
                </div>
              </div>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => setOpen(false)}>
              ×
            </Button>
          </div>

          <div className="p-2" style={{ height: 380, display: "flex", flexDirection: "column" }}>
            <Chatbot onMutation={onMutation} listHeight={280} />
          </div>
        </div>
      )}
    </div>
  );
}
