import { EventEmitter } from 'node:events';

export type CalendarChangeAction = 'create' | 'update' | 'delete';

export type CalendarChangeRange = {
  starts_at: string;
  ends_at: string;
};

export type CalendarChangeEvent = {
  provider_id: string;
  action: CalendarChangeAction;
  entry_id: string;
  ranges: CalendarChangeRange[];
  changed_at: string;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function publishCalendarChange(event: Omit<CalendarChangeEvent, 'changed_at'>): CalendarChangeEvent {
  const payload: CalendarChangeEvent = {
    ...event,
    changed_at: new Date().toISOString(),
  };
  emitter.emit('calendar-change', payload);
  return payload;
}

export function onCalendarChange(listener: (event: CalendarChangeEvent) => void): () => void {
  emitter.on('calendar-change', listener);
  return () => emitter.off('calendar-change', listener);
}
