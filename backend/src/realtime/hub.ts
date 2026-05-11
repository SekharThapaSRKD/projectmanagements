export type RealtimeEventType = 
  | 'state.invalidated' 
  | 'document:created' 
  | 'document:updated' 
  | 'document:deleted' 
  | 'document:fileAdded' 
  | 'document:fileRemoved'
  | string;

export interface RealtimeEvent {
  type: RealtimeEventType;
  data?: any;
  timestamp?: string;
}

type Subscriber = (event: RealtimeEvent) => void;

export class RealtimeHub {
  private readonly subscribers = new Set<Subscriber>();

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  broadcast(event: RealtimeEvent) {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };

    for (const subscriber of this.subscribers) {
      subscriber(enrichedEvent);
    }
  }

  size() {
    return this.subscribers.size;
  }
}

export const createRealtimeHub = () => new RealtimeHub();