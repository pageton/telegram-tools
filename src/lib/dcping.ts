import { DC_PROD, DC_TEST } from './engine/types';

export interface DcPingResult {
  dcId: number;
  ip: string;
  port: number;
  status: 'pending' | 'connecting' | 'ok' | 'timeout' | 'error';
  latency: number | null; // ms
  error?: string;
  test?: boolean;
}

/**
 * Ping a single Telegram DC by opening a WebSocket connection and measuring
 * how long it takes to establish. Telegram DCs accept WSS on port 443.
 */
export function pingDc(dcId: number, timeoutMs = 5000, test = false): Promise<DcPingResult> {
  const table = test ? DC_TEST : DC_PROD;
  const dc = table[dcId];
  if (!dc) {
    return Promise.resolve({
      dcId,
      ip: 'unknown',
      port: 0,
      status: 'error',
      latency: null,
      error: `Unknown DC ${dcId}`,
      test,
    });
  }

  return new Promise((resolve) => {
    const start = performance.now();
    let resolved = false;

    const finish = (result: Partial<DcPingResult>) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      resolve({
        dcId,
        ip: dc.ip,
        port: dc.port,
        status: 'ok',
        latency: null,
        test,
        ...result,
      });
    };

    const timer = setTimeout(() => {
      finish({ status: 'timeout', latency: null, error: 'Connection timed out' });
    }, timeoutMs);

    const ws = new WebSocket(`wss://${dc.ip}:${dc.port}/apiws`);

    ws.onopen = () => {
      const latency = Math.round(performance.now() - start);
      finish({ status: 'ok', latency });
    };

    ws.onerror = () => {
      const latency = Math.round(performance.now() - start);
      if (latency < timeoutMs - 100) {
        finish({ status: 'ok', latency });
      } else {
        finish({ status: 'error', latency: null, error: 'Connection failed' });
      }
    };
  });
}

/**
 * Ping all production DCs in parallel.
 */
export async function pingAllDcs(timeoutMs = 5000): Promise<DcPingResult[]> {
  const prodIds = Object.keys(DC_PROD).map(Number);
  const testIds = Object.keys(DC_TEST).map(Number);
  const all = [
    ...prodIds.map((id) => pingDc(id, timeoutMs, false)),
    ...testIds.map((id) => pingDc(id, timeoutMs, true)),
  ];
  return Promise.all(all);
}
