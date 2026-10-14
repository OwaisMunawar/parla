import { type ReminderCopy } from '../lib/reminder';

export interface ReminderScheduler {
  requestPermission(): Promise<boolean>;
  /** Replaces any existing daily reminder. */
  schedule(time: { hour: number; minute: number }, copy: ReminderCopy): Promise<void>;
  cancel(): Promise<void>;
}

/** For tests and platforms without notifications: remembers what it would have scheduled. */
export function createNoopReminderScheduler(): ReminderScheduler & { scheduled: ReminderCopy[] } {
  const scheduled: ReminderCopy[] = [];
  return {
    scheduled,
    requestPermission: async () => true,
    schedule: async (_time, copy) => {
      scheduled.push(copy);
    },
    cancel: async () => {
      scheduled.length = 0;
    },
  };
}
