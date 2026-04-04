import { WebSocket } from "uWebSockets.js";
type uWebSocket = WebSocket<{ uuid: string }>;
import { Site } from "./etc";

export interface ClientSubscription {
  site: Site;
  input: string;
}

export interface ClientMessage extends ClientSubscription {
  action: "unsubscribe" | "subscribe";
}

export interface ClientInfo {
  uuid: string;
  subscriptions: ClientSubscription[];
  connection: uWebSocket;
  lastPing: number;
}
