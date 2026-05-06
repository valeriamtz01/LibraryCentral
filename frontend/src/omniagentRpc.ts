type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string; result: any }
  | { jsonrpc: "2.0"; id: string; error: { code: number; message: string; data?: any } };

type JsonRpcNotification = { jsonrpc: "2.0"; method: string; params?: any };

function resolveOmniAgentWsUrl(): string {
  const env = import.meta.env.VITE_OMNIAGENT_WS_URL as string | undefined;
  if (env) return env;

  if (typeof window !== "undefined") {
    const host = window.location.host;
    const codespacesMatch = host.match(/^(.*)-\d+\.app\.github\.dev$/);
    if (codespacesMatch) {
      const prefix = codespacesMatch[1];
      return `wss://${prefix}-9000.app.github.dev/ws`;
    }

    const hostname = window.location.hostname;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${hostname}:9000/ws`;
  }

  return "ws://127.0.0.1:9000/ws";
}

export class OmniAgentRpcClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, (resp: JsonRpcResponse) => void>();
  private onNotify: ((n: JsonRpcNotification) => void) | null = null;
  private connecting: Promise<void> | null = null;
  private outbox: Array<{ req: JsonRpcRequest; resolve: (v: any) => void; reject: (e: Error) => void }> = [];
  private reconnectAttempts = 0;
  private shouldReconnect = true;

  connect(onNotify: (n: JsonRpcNotification) => void): Promise<void> {
    this.onNotify = onNotify;
    this.shouldReconnect = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connecting) return this.connecting;

    const url = resolveOmniAgentWsUrl();
    this.connecting = this.open(url);
    return this.connecting;
  }

  private open(url: string): Promise<void> {
    this.ws = new WebSocket(url);
    return new Promise((resolve, reject) => {
      const ws = this.ws;
      if (!ws) return reject(new Error("WebSocket not created"));

      ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.connecting = null;
        this.flushOutbox();
        resolve();
      };
      ws.onerror = () => {
        if (ws.readyState !== WebSocket.OPEN) {
          this.connecting = null;
          reject(new Error("Failed to connect to OmniAgent server"));
        }
      };
      ws.onmessage = (evt) => {
        let parsed: any;
        try {
          parsed = JSON.parse(String(evt.data));
        } catch {
          return;
        }

        if (parsed?.id) {
          const cb = this.pending.get(String(parsed.id));
          if (cb) {
            this.pending.delete(String(parsed.id));
            cb(parsed as JsonRpcResponse);
          }
          return;
        }
        if (parsed?.method) {
          this.onNotify?.(parsed as JsonRpcNotification);
        }
      };
      ws.onclose = () => {
        this.ws = null;
        this.connecting = null;

        for (const [, cb] of this.pending) {
          cb({ jsonrpc: "2.0", id: "", error: { code: -32000, message: "Disconnected" } } as any);
        }
        this.pending.clear();

        if (this.shouldReconnect) {
          this.scheduleReconnect(url);
        }
      };
    });
  }

  private scheduleReconnect(url: string) {
    if (this.connecting) return;
    this.reconnectAttempts += 1;
    const delayMs = Math.min(10_000, 400 * Math.pow(2, Math.min(6, this.reconnectAttempts - 1)));
    this.connecting = new Promise((resolve) => {
      setTimeout(() => {
        this.open(url)
          .then(resolve)
          .catch(() => {
            this.connecting = null;
            this.scheduleReconnect(url);
            resolve();
          });
      }, delayMs);
    });
  }

  private flushOutbox() {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const items = this.outbox;
    this.outbox = [];
    for (const item of items) {
      try {
        ws.send(JSON.stringify(item.req));
      } catch (e: any) {
        item.reject(new Error(e?.message || "Send failed"));
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.connecting = null;
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.pending.clear();
    for (const item of this.outbox) item.reject(new Error("Disconnected"));
    this.outbox = [];
  }

  call(method: string, params?: Record<string, unknown>): Promise<any> {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const req: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, (resp) => {
        if ((resp as any).error) {
          const err = (resp as any).error;
          reject(new Error(err?.message || "RPC error"));
          return;
        }
        resolve((resp as any).result);
      });

      const ws = this.ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(req));
        return;
      }

      this.outbox.push({ req, resolve, reject });
      void this.connect(this.onNotify || (() => {})).catch(reject);
    });
  }
}
