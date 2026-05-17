import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const DAILY_REMINDER_IDENTIFIER = 'daily-lesson-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function requestNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();

  if (
    existing.granted ||
    existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function cancelDailyLessonReminder() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter(
    (item) => item.content.data?.identifier === DAILY_REMINDER_IDENTIFIER
  );

  await Promise.all(
    matching.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)
    )
  );
}

export async function scheduleDailyLessonReminder(params: {
  hour: number;
  minute: number;
  childName?: string | null;
}) {
  const { hour, minute, childName } = params;

  await setupNotificationChannel();
  await cancelDailyLessonReminder();

  const granted = await requestNotificationPermission();

  if (!granted) {
    throw new Error('Notification permission not granted.');
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ABA at Home',
      body: childName
        ? `Time for today’s lesson with ${childName}.`
        : `Time for today’s ABA lesson.`,
      sound: true,
      data: {
        identifier: DAILY_REMINDER_IDENTIFIER,
        type: 'daily_lesson_reminder',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function completeTodayLessonAndRefreshReminder(params: {
  enabled: boolean;
  hour: number;
  minute: number;
  childName?: string | null;
}) {
  const { enabled, hour, minute, childName } = params;

  await cancelDailyLessonReminder();

  if (!enabled) return;

  await scheduleDailyLessonReminder({
    hour,
    minute,
    childName,
  });
}