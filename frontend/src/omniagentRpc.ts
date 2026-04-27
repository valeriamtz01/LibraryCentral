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

  connect(onNotify: (n: JsonRpcNotification) => void): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.onNotify = onNotify;
      return Promise.resolve();
    }

    this.onNotify = onNotify;
    const url = resolveOmniAgentWsUrl();
    this.ws = new WebSocket(url);

    return new Promise((resolve, reject) => {
      const ws = this.ws;
      if (!ws) return reject(new Error("WebSocket not created"));

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Failed to connect to OmniAgent server"));
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
        this.pending.clear();
      };
    });
  }

  call(method: string, params?: Record<string, unknown>): Promise<any> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("OmniAgent WebSocket is not connected"));
    }
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
      ws.send(JSON.stringify(req));
    });
  }
}
