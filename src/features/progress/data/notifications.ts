import * as Notifications from 'expo-notifications';

import { type ReminderScheduler } from './reminderScheduler';

const REMINDER_ID = 'parla-daily-reminder';

export function createExpoReminderScheduler(): ReminderScheduler {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  return {
    async requestPermission() {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      return (await Notifications.requestPermissionsAsync()).granted;
    },
    async schedule(time, copy) {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => undefined);
      // A DAILY trigger fires at the wall-clock time in whatever zone the
      // phone is in, which is what "remind me at 7 pm" means to a traveller.
      await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_ID,
        content: { title: copy.title, body: copy.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        },
      });
    },
    async cancel() {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    },
  };
}
