/**
 * A controllable fake of a socket.io-client socket for component tests.
 *
 * Components call `socket.on(event, handler)`; tests drive the component by
 * pushing a server-side event with `socket.serverEmit(event, payload)`, which
 * invokes the registered handlers synchronously.
 */
export interface MockSocket {
  handlers: Record<string, Array<(payload: unknown) => void>>;
  on: (event: string, cb: (payload: unknown) => void) => void;
  off: (event: string, cb?: (payload: unknown) => void) => void;
  emit: (...args: unknown[]) => void;
  disconnect: () => void;
  connect: () => void;
  /** Test helper: simulate the server pushing `event` to this client. */
  serverEmit: (event: string, payload?: unknown) => void;
}

export function createMockSocket(): MockSocket {
  const handlers: MockSocket['handlers'] = {};
  return {
    handlers,
    on(event, cb) {
      (handlers[event] ||= []).push(cb);
    },
    off(event, cb) {
      if (!handlers[event]) return;
      if (cb) handlers[event] = handlers[event].filter((h) => h !== cb);
      else delete handlers[event];
    },
    emit() {},
    disconnect() {},
    connect() {},
    serverEmit(event, payload) {
      (handlers[event] || []).forEach((cb) => cb(payload));
    },
  };
}
