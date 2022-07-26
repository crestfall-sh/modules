import net from 'net';
import EventEmitter from 'events';

export interface record {
  resolve: Function;
  reject: Function;
  command?: string;
  parameters?: string[];
}

export interface client {
  connection: net.Socket;
  events: EventEmitter;
  records: record[];
  ready: boolean;
  subscribed: boolean;
  subscribed_channels: Set<string>;
}