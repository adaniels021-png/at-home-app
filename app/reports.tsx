import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../lib/SelectedChildContext';
import { generateProgressRecommendations } from '../lib/aiService';
import { supabase } from '../lib/supabase';

type LessonLogRow = {
  id: string;
  child_id: string;
  category: string;
  lesson_number: number;
  lesson_name: string | null;
  status: string;
  performance: string | null;
  notes: string | null;
  completed_at: string;
  created_at: string;
};

type RoutineLogRow = {
  id: string;
  child_id: string;
  routine_period: 'morning' | 'afternoon' | 'evening' | string;
  routine_name: string;
  task_name: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
};

type ReassessmentRow = {
  id: string;
  child_id: string;
  responses: Record<string, string>;
  summary: string | null;
  created_at: string;
};

type ProgressSkill = {
  name: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Emerging' | 'Mastered';
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function ReportsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [lessonLogs, setLessonLogs] = useState<LessonLogRow[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLogRow[]>([]);
  const [latestReassessment, setLatestReassessment] = useState<ReassessmentRow | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const childName =
    selectedChild?.child_name ||
    selectedChild?.name ||
    'Your Child';

  useEffect(() => {
    if (selectedChild?.id) {
      loadReportData();
    } else {
      setLoading(false);
    }
  }, [selectedChild]);

  const loadReportData = async () => {
    if (!selectedChild?.id) return;

    setLoading(true);

    try {
      const [lessonRes, routineRes, reassessmentRes] = await Promise.all([
        supabase
          .from('lesson_logs')
          .select('*')
          .eq('child_id', selectedChild.id)
          .eq('status', 'success')
          .order('completed_at', { ascending: false }),

        supabase
          .from('routine_logs')
          .select('*')
          .eq('child_id', selectedChild.id)
          .eq('completed', true)
          .order('completed_at', { ascending: false }),

        supabase
          .from('reassessments')
          .select('*')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (lessonRes.error) throw lessonRes.error;
      if (routineRes.error) throw routineRes.error;
      if (reassessmentRes.error) throw reassessmentRes.error;

      const lessons = (lessonRes.data || []) as LessonLogRow[];
      const routines = (routineRes.data || []) as RoutineLogRow[];
      const reassessment = (reassessmentRes.data?.[0] as ReassessmentRow | undefined) || null;

      setLessonLogs(lessons);
      setRoutineLogs(routines);
      setLatestReassessment(reassessment);

      try {
        const recommendationResult = await generateProgressRecommendations({
          childName,
          lessonLogs: lessons.map((log) => ({
            category: log.category,
            performance: log.performance,
            completed_at: log.completed_at,
          })),
          routineLogs: routines.map((log) => ({
            routine_period: log.routine_period,
            completed_at: log.completed_at,
          })),
        });

        setRecommendations(recommendationResult.recommendations || []);
      } catch (error) {
        console.error('Recommendation load error:', error);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Report load error:', error);
      Alert.alert('Error', 'Could not load report data.');
    } finally {
      setLoading(false);
    }
  };

  const lessonsDone = useMemo(() => lessonLogs.length, [lessonLogs]);

  const routinesThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return routineLogs.filter(
      (log) => new Date(log.completed_at) >= sevenDaysAgo
    ).length;
  }, [routineLogs]);

  const topLessonCategory = useMemo(() => {
    if (!lessonLogs.length) return 'No lessons yet';

    const counts: Record<string, number> = {};
    lessonLogs.forEach((log) => {
      counts[log.category] = (counts[log.category] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No lessons yet';
  }, [lessonLogs]);

  const mostConsistentRoutine = useMemo(() => {
    if (!routineLogs.length) return 'No routine data';

    const counts: Record<string, number> = {};
    routineLogs.forEach((log) => {
      counts[log.routine_period] = (counts[log.routine_period] || 0) + 1;
    });

    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return winner ? `${winner.charAt(0).toUpperCase()}${winner.slice(1)}` : 'No routine data';
  }, [routineLogs]);

  const skills: ProgressSkill[] = useMemo(() => {
    const categories = ['Communication', 'Behavior', 'Learning', 'Social'] as const;

    const getStatus = (
      score: number
    ): 'Not Started' | 'In Progress' | 'Emerging' | 'Mastered' => {
      if (score >= 0.85) return 'Mastered';
      if (score >= 0.6) return 'Emerging';
      if (score >= 0.3) return 'In Progress';
      return 'Not Started';
    };

    return categories.map((category) => {
      const categoryLessons = lessonLogs.filter(
        (log) => log.category?.toLowerCase() === category.toLowerCase()
      );

      if (!categoryLessons.length) {
        return {
          name: category,
          progress: 0,
          status: 'Not Started',
        };
      }

      let score = 0;
      categoryLessons.forEach((log) => {
        if (log.performance === 'easy') score += 1;
        else if (log.performance === 'just_right') score += 0.7;
        else if (log.performance === 'challenging') score += 0.3;
        else score += 0.5;
      });

      score /= categoryLessons.length;

      const routineBonus = Math.min(0.15, routinesThisWeek / 50);
      const finalScore = Math.min(1, score + routineBonus);

      return {
        name: category,
        progress: finalScore,
        status: getStatus(finalScore),
      };
    });
  }, [lessonLogs, routinesThisWeek]);

  const buildHtml = () => {
    const today = new Date().toLocaleDateString();

    const recommendationHtml =
      recommendations.length > 0
        ? recommendations
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('')
        : '<li>No recommendations available yet.</li>';

    const skillsHtml = skills
      .map(
        (skill) => `
          <tr>
            <td>${escapeHtml(skill.name)}</td>
            <td>${Math.round(skill.progress * 100)}%</td>
            <td>${escapeHtml(skill.status)}</td>
          </tr>
        `
      )
      .join('');

    const reassessmentSummary = latestReassessment?.summary
      ? escapeHtml(latestReassessment.summary)
      : 'No reassessment summary available yet.';

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 28px;
              color: #0f172a;
            }
            h1, h2, h3 {
              margin-bottom: 8px;
            }
            .muted {
              color: #64748b;
              margin-bottom: 18px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 16px;
              margin-bottom: 16px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .stat {
              background: #f8fafc;
              border-radius: 12px;
              padding: 12px;
              border: 1px solid #e2e8f0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 10px;
              text-align: left;
              font-size: 14px;
            }
            th {
              background: #f8fafc;
            }
            ul {
              padding-left: 20px;
            }
          </style>
        </head>
        <body>
          <h1>ABA at Home Progress Report</h1>
          <div class="muted">Prepared for ${escapeHtml(childName)} • ${escapeHtml(today)}</div>

          <div class="card">
            <h2>Overview</h2>
            <div class="grid">
              <div class="stat"><strong>Lessons Done</strong><br />${lessonsDone}</div>
              <div class="stat"><strong>Routine Tasks This Week</strong><br />${routinesThisWeek}</div>
              <div class="stat"><strong>Top Lesson Category</strong><br />${escapeHtml(topLessonCategory)}</div>
              <div class="stat"><strong>Most Consistent Routine</strong><br />${escapeHtml(mostConsistentRoutine)}</div>
            </div>
          </div>

          <div class="card">
            <h2>Skill Progress Snapshot</h2>
            <table>
              <thead>
                <tr>
                  <th>Skill Area</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${skillsHtml}
              </tbody>
            </table>
          </div>

          <div class="card">
            <h2>AI Next-Step Recommendations</h2>
            <ul>${recommendationHtml}</ul>
          </div>

          <div class="card">
            <h2>Latest Reassessment Summary</h2>
            <p>${reassessmentSummary}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    try {
      setExporting(true);

      const html = buildHtml();
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('PDF Created', `Saved report to: ${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Progress Report',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Export Error', 'Could not create the PDF report.');
    } finally {
      setExporting(false);
    }
  };

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select a child profile before exporting a report.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Preparing report data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Export Progress Report</Text>
          <Text style={styles.subtitle}>
            Create a shareable PDF report for {childName}.
          </Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Ionicons name="document-text-outline" size={18} color="#4F46E5" />
            <Text style={styles.previewTitle}>Report Preview</Text>
          </View>

          <Text style={styles.previewText}>This PDF will include:</Text>

          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Lesson progress summary</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Routine consistency snapshot</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Skill progress table</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>AI next-step recommendations</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Latest reassessment summary</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Quick Snapshot</Text>
          <Text style={styles.statsText}>Lessons Done: {lessonsDone}</Text>
          <Text style={styles.statsText}>Routine Tasks This Week: {routinesThisWeek}</Text>
          <Text style={styles.statsText}>Top Lesson Category: {topLessonCategory}</Text>
          <Text style={styles.statsText}>Most Consistent Routine: {mostConsistentRoutine}</Text>
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => void handleExportPdf()}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Create PDF Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  previewText: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 18,
    color: '#4F46E5',
    fontWeight: '800',
  },
  bulletText: {
    flex: 1,
    color: '#475569',
    lineHeight: 20,
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3730A3',
    marginBottom: 10,
  },
  statsText: {
    color: '#4338CA',
    fontSize: 14,
    lineHeight: 21,
  },
  exportBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  exportBtnDisabled: {
    opacity: 0.7,
  },
  exportBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});