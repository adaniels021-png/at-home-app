import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProGate from '../components/ProGate';
import { useChild } from '../lib/SelectedChildContext';

import { supabase } from '../lib/supabase';

type TimePeriod = 'morning' | 'afternoon' | 'evening';

type DayType =
  | 'everyday'
  | 'school_days'
  | 'weekends'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type RoutineTask = {
  task_name: string;
  sort_order: number;
  image_url?: string | null;
  default_icon?: string | null;
  is_custom_image?: boolean;
};

const DEFAULT_ROUTINES: Record<
  TimePeriod,
  Array<{ task_name: string; default_icon: string }>
> = {
  morning: [
    { task_name: 'Wake Up', default_icon: 'sunny' },
    { task_name: 'Brush Teeth', default_icon: 'sparkles' },
    { task_name: 'Get Dressed', default_icon: 'shirt' },
    { task_name: 'Breakfast', default_icon: 'restaurant' },
  ],
  afternoon: [
    { task_name: 'Lunch', default_icon: 'pizza' },
    { task_name: 'Play Time', default_icon: 'game-controller' },
    { task_name: 'Learning Time', default_icon: 'book' },
    { task_name: 'Quiet Time', default_icon: 'moon' },
  ],
  evening: [
    { task_name: 'Dinner', default_icon: 'restaurant-outline' },
    { task_name: 'Bath', default_icon: 'water' },
    { task_name: 'Pajamas', default_icon: 'bed' },
    { task_name: 'Bedtime', default_icon: 'moon' },
  ],
};

const PERIODS: TimePeriod[] = ['morning', 'afternoon', 'evening'];
const DAY_TYPES: Array<{ label: string; value: DayType }> = [
  { label: 'Every Day', value: 'everyday' },
  { label: 'School Days', value: 'school_days' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

function getEmojiForTask(taskName: string, fallbackIcon?: string | null): string {
  const normalized = taskName.toLowerCase();

  if (normalized.includes('wake')) return '🌞';
  if (normalized.includes('brush') || normalized.includes('tooth')) return '🪥';
  if (normalized.includes('dress') || normalized.includes('shirt')) return '👕';
  if (normalized.includes('breakfast')) return '🥣';
  if (normalized.includes('lunch')) return '🍎';
  if (normalized.includes('dinner')) return '🍽️';
  if (normalized.includes('play')) return '⚽';
  if (normalized.includes('learn') || normalized.includes('school')) return '📚';
  if (normalized.includes('quiet') || normalized.includes('rest')) return '🌙';
  if (normalized.includes('bath') || normalized.includes('wash')) return '🛁';
  if (normalized.includes('pajama')) return '🛏️';
  if (normalized.includes('bed')) return '🌙';
  if (normalized.includes('snack')) return '🍪';
  if (normalized.includes('potty') || normalized.includes('toilet')) return '🚽';
  if (normalized.includes('car')) return '🚗';
  if (normalized.includes('home')) return '🏠';

  if (fallbackIcon === 'sunny') return '🌞';
  if (fallbackIcon === 'sparkles') return '🪥';
  if (fallbackIcon === 'shirt') return '👕';
  if (fallbackIcon === 'restaurant') return '🥣';
  if (fallbackIcon === 'pizza') return '🍎';
  if (fallbackIcon === 'game-controller') return '⚽';
  if (fallbackIcon === 'book') return '📚';
  if (fallbackIcon === 'moon') return '🌙';
  if (fallbackIcon === 'restaurant-outline') return '🍽️';
  if (fallbackIcon === 'water') return '🛁';
  if (fallbackIcon === 'bed') return '🛏️';

  return '⭐';
}

function prettyPeriodLabel(period: TimePeriod): string {
  return period.charAt(0).toUpperCase() + period.slice(1);
}

function prettyDayType(day: DayType) {
  return DAY_TYPES.find((item) => item.value === day)?.label || 'Every Day';
}

export default function RoutinePrintablesScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('morning');
  const [selectedDayType, setSelectedDayType] = useState<DayType>('everyday');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const [routineData, setRoutineData] = useState<Record<TimePeriod, RoutineTask[]>>({
    morning: [],
    afternoon: [],
    evening: [],
  });

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'Child';
}, [selectedChild]);

  useEffect(() => {
    if (selectedChild?.id) {
      void loadAllRoutines();
    } else {
      setLoading(false);
    }
  }, [selectedChild, selectedDayType]);

  const loadAllRoutines = async () => {
    if (!selectedChild?.id) return;

    setLoading(true);

    try {
      const nextData: Record<TimePeriod, RoutineTask[]> = {
        morning: [],
        afternoon: [],
        evening: [],
      };

      for (const period of PERIODS) {
        const { data, error } = await supabase
          .from('custom_routines')
          .select(
            'task_name, sort_order, image_url, default_icon, is_custom_image'
          )
         .eq('child_id', selectedChild.id)
         .eq('routine_period', period)
         .eq('day_type', selectedDayType)
         .order('sort_order', { ascending: true });

        if (error) {
          const fallbackDefault = DEFAULT_ROUTINES[period].map((item, index) => ({
            task_name: item.task_name,
            sort_order: index + 1,
            image_url: null,
            default_icon: item.default_icon,
            is_custom_image: false,
          }));
          nextData[period] = fallbackDefault;
          continue;
        }

        if (data && data.length > 0) {
          nextData[period] = data as RoutineTask[];
        } else {
          nextData[period] = DEFAULT_ROUTINES[period].map((item, index) => ({
            task_name: item.task_name,
            sort_order: index + 1,
            image_url: null,
            default_icon: item.default_icon,
            is_custom_image: false,
          }));
        }
      }

      setRoutineData(nextData);
    } catch (error) {
      console.error('Load routine printables error:', error);
      Alert.alert('Load Error', 'Could not load routines for printing.');
    } finally {
      setLoading(false);
    }
  };

  const buildRoutineSectionHtml = (period: TimePeriod, tasks: RoutineTask[]) => {
    const sectionColor =
      period === 'morning' ? '#FEF3C7' : period === 'afternoon' ? '#DBEAFE' : '#EDE9FE';

    const headingEmoji =
      period === 'morning' ? '🌞' : period === 'afternoon' ? '☀️' : '🌙';

    const taskCardsHtml = tasks
      .map((task) => {
        const emoji = getEmojiForTask(task.task_name, task.default_icon);
        const imageHtml = task.image_url
          ? `<img src="${task.image_url}" class="task-image" />`
          : `<div class="emoji-box">${emoji}</div>`;

        return `
          <div class="task-card">
            <div class="task-top">
              ${imageHtml}
              <div class="task-name-wrap">
                <div class="task-name">${task.task_name}</div>
                ${
                  task.is_custom_image
                    ? `<div class="task-sub">Custom photo</div>`
                    : `<div class="task-sub">Routine task</div>`
                }
              </div>
              <div class="checkbox"></div>
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="routine-section">
        <div class="section-header" style="background:${sectionColor};">
          <div class="section-title">${headingEmoji} ${prettyPeriodLabel(period)} Routine</div>
        </div>
        <div class="task-list">
          ${taskCardsHtml}
        </div>
      </div>
    `;
  };

  const buildHtml = (mode: 'single' | 'all') => {
    const sections =
      mode === 'single'
        ? buildRoutineSectionHtml(selectedPeriod, routineData[selectedPeriod])
        : PERIODS.map((period) => buildRoutineSectionHtml(period, routineData[period])).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              margin: 24px;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
              color: #0F172A;
              margin: 0;
              padding: 0;
              background: #FFFFFF;
            }

            .page {
              padding: 0;
            }

            .hero {
              background: linear-gradient(135deg, #4F46E5, #7C3AED);
              color: white;
              border-radius: 24px;
              padding: 22px;
              margin-bottom: 18px;
            }

            .hero-title {
              font-size: 30px;
              font-weight: 800;
              margin-bottom: 8px;
            }

            .hero-subtitle {
              font-size: 15px;
              line-height: 1.5;
              color: #E0E7FF;
            }

            .name-pill {
              display: inline-block;
              margin-top: 12px;
              background: rgba(255,255,255,0.18);
              padding: 8px 12px;
              border-radius: 999px;
              font-size: 13px;
              font-weight: 700;
            }

            .routine-section {
              margin-bottom: 18px;
              page-break-inside: avoid;
            }

            .section-header {
              border-radius: 18px;
              padding: 14px 16px;
              margin-bottom: 12px;
            }

            .section-title {
              font-size: 20px;
              font-weight: 800;
            }

            .task-list {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .task-card {
              border: 1px solid #E2E8F0;
              border-radius: 20px;
              padding: 14px;
              background: #FFFFFF;
            }

            .task-top {
              display: flex;
              align-items: center;
            }

            .emoji-box {
              width: 58px;
              height: 58px;
              min-width: 58px;
              border-radius: 16px;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              margin-right: 12px;
            }

            .task-image {
              width: 58px;
              height: 58px;
              min-width: 58px;
              border-radius: 16px;
              object-fit: cover;
              margin-right: 12px;
              border: 1px solid #E2E8F0;
            }

            .task-name-wrap {
              flex: 1;
              padding-right: 12px;
            }

            .task-name {
              font-size: 18px;
              font-weight: 800;
              color: #0F172A;
            }

            .task-sub {
              font-size: 12px;
              color: #64748B;
              margin-top: 4px;
              font-weight: 700;
            }

            .checkbox {
              width: 28px;
              height: 28px;
              min-width: 28px;
              border-radius: 8px;
              border: 2px solid #94A3B8;
              background: #FFFFFF;
            }

            .footer-note {
              margin-top: 18px;
              background: #FFFBEB;
              border-left: 4px solid #F59E0B;
              border-radius: 14px;
              padding: 14px;
              color: #92400E;
              font-size: 13px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="hero">
              <div class="hero-title">
                  ${prettyDayType(selectedDayType)} Routine Chart
            </div>
              <div class="hero-subtitle">
                A child-friendly printable routine with visuals and checkboxes.
              </div>
              <div class="name-pill">${childName}</div>
            </div>

            ${sections}

            <div class="footer-note">
              Parent tip: Keep routines visual, simple, and consistent. Use praise and gentle prompts to support independence.
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const createPdf = async (mode: 'single' | 'all') => {
    const html = buildHtml(mode);
    const file = await Print.printToFileAsync({ html });
    return file.uri;
  };

  const handlePrint = async (mode: 'single' | 'all') => {
    setExporting(true);
    try {
      const html = buildHtml(mode);
      await Print.printAsync({ html });
    } catch (error: any) {
      console.error('Routine print error:', error);
      Alert.alert('Print Failed', error?.message || 'Could not open the print dialog.');
    } finally {
      setExporting(false);
    }
  };

  const handleSharePdf = async (mode: 'single' | 'all') => {
    setExporting(true);
    try {
      const uri = await createPdf(mode);
      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle:
          mode === 'single'
            ? `${prettyPeriodLabel(selectedPeriod)} Routine`
            : 'All Routine Charts',
      });
    } catch (error: any) {
      console.error('Routine share error:', error);
      Alert.alert('Share Failed', error?.message || 'Could not share the routine PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleEmailPdf = async (mode: 'single' | 'all') => {
    setExporting(true);
    try {
      const uri = await createPdf(mode);

      await MailComposer.composeAsync({
        subject:
          mode === 'single'
            ? `${prettyPeriodLabel(selectedPeriod)} Routine Chart - ABA at Home`
            : `Routine Charts - ABA at Home`,
        body:
          mode === 'single'
            ? `Hi,\n\nAttached is the printable ${prettyPeriodLabel(selectedPeriod).toLowerCase()} routine chart for ${childName}.\n\nSent from ABA at Home.`
            : `Hi,\n\nAttached are the printable routine charts for ${childName}.\n\nSent from ABA at Home.`,
        attachments: [uri],
      });
    } catch (error: any) {
      console.error('Routine email error:', error);
      Alert.alert('Email Failed', error?.message || 'Could not open email for this PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (!selectedChild) {
    return (
      <ProGate>
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <Ionicons name="print-outline" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No child selected</Text>
            <Text style={styles.emptyText}>
              Please select or create a child profile to print routines.
            </Text>
          </View>
        </SafeAreaView>
      </ProGate>
    );
  }

  if (loading) {
    return (
      <ProGate>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading printables...</Text>
        </View>
      </ProGate>
    );
  }

  const activeTasks = routineData[selectedPeriod] || [];

  return (
    <ProGate>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.title}>Routine Printables</Text>
          <Text style={styles.subtitle}>
            Print visual routines with task pictures and checkboxes for {childName}.
          </Text>

          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Ionicons name="print-outline" size={20} color="#4F46E5" />
              <Text style={styles.heroTitle}>Printable Routine Charts</Text>
            </View>
            <Text style={styles.heroText}>
              Use custom task order and photos when available, or the default routine visuals when not.
            </Text>
          </View>

          <View style={styles.periodRow}>
            {PERIODS.map((period) => {
              const active = selectedPeriod === period;
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodBtn, active && styles.periodBtnActive]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[styles.periodBtnText, active && styles.periodBtnTextActive]}>
                    {prettyPeriodLabel(period)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.daySelectorWrap}>
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.daySelectorScroll}
  >
    {DAY_TYPES.map((day) => {
      const active = selectedDayType === day.value;

      return (
        <TouchableOpacity
          key={day.value}
          style={[
            styles.dayChip,
            active && styles.dayChipActive,
          ]}
          onPress={() => setSelectedDayType(day.value)}
        >
          <Text
            style={[
              styles.dayChipText,
              active && styles.dayChipTextActive,
            ]}
          >
            {day.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
</View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>
                {prettyPeriodLabel(selectedPeriod)} • {prettyDayType(selectedDayType)}
              </Text>
              <TouchableOpacity onPress={() => setPreviewVisible(true)}>
                <Text style={styles.previewLink}>Open Preview</Text>
              </TouchableOpacity>
            </View>

            {activeTasks.map((task, index) => (
              <View key={`${task.task_name}-${index}`} style={styles.previewTaskRow}>
                {task.image_url ? (
                  <Image source={{ uri: task.image_url }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewEmojiBox}>
                    <Text style={styles.previewEmoji}>
                      {getEmojiForTask(task.task_name, task.default_icon)}
                    </Text>
                  </View>
                )}

                <Text style={styles.previewTaskName}>{task.task_name}</Text>

                <View style={styles.previewCheckbox} />
              </View>
            ))}
          </View>

          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Print Current Routine</Text>

            <View style={styles.buttonColumn}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => void handlePrint('single')}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>
                      Print {prettyPeriodLabel(selectedPeriod)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleSharePdf('single')}
                disabled={exporting}
              >
                <Ionicons name="share-social-outline" size={18} color="#475569" />
                <Text style={styles.secondaryBtnText}>Share PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleEmailPdf('single')}
                disabled={exporting}
              >
                <Ionicons name="mail-outline" size={18} color="#475569" />
                <Text style={styles.secondaryBtnText}>Email PDF</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Print All Routines</Text>

            <View style={styles.buttonColumn}>
              <TouchableOpacity
                style={styles.purpleBtn}
                onPress={() => void handlePrint('all')}
                disabled={exporting}
              >
                <Ionicons name="albums-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Print Morning + Afternoon + Evening</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleSharePdf('all')}
                disabled={exporting}
              >
                <Ionicons name="download-outline" size={18} color="#475569" />
                <Text style={styles.secondaryBtnText}>Share Full Routine PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleEmailPdf('all')}
                disabled={exporting}
              >
                <Ionicons name="mail-open-outline" size={18} color="#475569" />
                <Text style={styles.secondaryBtnText}>Email Full Routine PDF</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
              <Text style={styles.tipTitle}>Routine Tip</Text>
            </View>
            <Text style={styles.tipText}>
              Printed routine charts work best when placed where the child can see them easily, like a bedroom wall, bathroom mirror, or kitchen area.
            </Text>
          </View>
        </ScrollView>

        <Modal
          visible={previewVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPreviewVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {prettyPeriodLabel(selectedPeriod)} • {prettyDayType(selectedDayType)}
                </Text>
                <TouchableOpacity onPress={() => setPreviewVisible(false)}>
                  <Ionicons name="close-circle" size={30} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {activeTasks.map((task, index) => (
                  <View key={`${task.task_name}-preview-${index}`} style={styles.modalTaskRow}>
                    {task.image_url ? (
                      <Image source={{ uri: task.image_url }} style={styles.modalTaskImage} />
                    ) : (
                      <View style={styles.modalEmojiBox}>
                        <Text style={styles.modalEmoji}>
                          {getEmojiForTask(task.task_name, task.default_icon)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.modalTaskTextWrap}>
                      <Text style={styles.modalTaskName}>{task.task_name}</Text>
                      <Text style={styles.modalTaskSub}>
                        {task.is_custom_image ? 'Custom photo' : 'Routine visual'}
                      </Text>
                    </View>

                    <View style={styles.modalCheckbox} />
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 6,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  heroTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },

  heroText: {
    color: '#64748B',
    lineHeight: 20,
  },

  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  periodBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  periodBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },

  periodBtnText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 12,
  },

  periodBtnTextActive: {
    color: '#FFFFFF',
  },

  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },

  previewLink: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 13,
  },

  previewTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  previewImage: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },

  previewEmojiBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  previewEmoji: {
    fontSize: 24,
  },

  previewTaskName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },

  previewCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },

  actionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 14,
  },

  buttonColumn: {
    gap: 12,
  },

  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  purpleBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  primaryBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  secondaryBtnText: {
    marginLeft: 8,
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },

  tipCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },

  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  tipTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#92400E',
  },

  tipText: {
    color: '#B45309',
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    backgroundColor: '#F8FAFC',
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },

  modalTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  modalTaskImage: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },

  modalEmojiBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  modalEmoji: {
    fontSize: 28,
  },

  modalTaskTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  modalTaskName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },

  modalTaskSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  modalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  daySelectorWrap: {
  marginBottom: 18,
},

daySelectorScroll: {
  paddingRight: 20,
},

dayChip: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 999,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginRight: 8,
},

dayChipActive: {
  backgroundColor: '#4F46E5',
  borderColor: '#4F46E5',
},

dayChipText: {
  color: '#475569',
  fontWeight: '700',
  fontSize: 12,
},

dayChipTextActive: {
  color: '#FFFFFF',
},
});