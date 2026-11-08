export type AnalyticsEvent =
  | 'app_open'
  | 'task_create'
  | 'task_complete'
  | 'reminder_open';

type EventProps = Record<string, string | number | boolean | null>;

interface RecordedEvent {
  name: AnalyticsEvent;
  props: EventProps;
  at: string;
}

const EVENTS_KEY = 'lighttodo.events.v1';
const MAX_EVENTS = 50;

/**
 * The MVP only needs four events (PRD §8). There is no backend yet, so events
 * are kept locally for inspection and emitted on the window for a future sink.
 */
export function track(name: AnalyticsEvent, props: EventProps = {}): void {
  const event: RecordedEvent = { name, props, at: new Date().toISOString() };
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const events = Array.isArray(parsed) ? parsed.filter(isRecordedEvent) : [];
    events.push(event);
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Analytics must never break the app.
  }
  try {
    window.dispatchEvent(new CustomEvent('lighttodo:track', { detail: event }));
  } catch {
    // ignore
  }
}

export function readEvents(): RecordedEvent[] {
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isRecordedEvent) : [];
  } catch {
    return [];
  }
}

function isRecordedEvent(value: unknown): value is RecordedEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RecordedEvent).name === 'string' &&
    typeof (value as RecordedEvent).at === 'string'
  );
}
