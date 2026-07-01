import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'adaniels021@gmail.com';

type LessonRow = {
  id: string;
  title: string;
  category: string;
  skill_area: string;
  stage_number: number;
  stage_name: string | null;
  lesson_type: string | null;
  quality_status: string | null;
  is_active: boolean;
  created_at: string;
};

export default function LessonReviewQueueScreen() {
  const router = useRouter();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [lessons, setLessons] = useState<LessonRow[]>([]);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const allowed = user?.email === ADMIN_EMAIL;
      setIsAdmin(allowed);
      setCheckingAdmin(false);
    }

    void checkAdmin();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        void loadLessons();
      }
    }, [isAdmin])
  );

  async function loadLessons() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('lesson_library')
        .select(`
          id,
          title,
          category,
          skill_area,
          stage_number,
          stage_name,
          lesson_type,
          quality_status,
          is_active,
          created_at
        `)
        .in('quality_status', ['draft', 'needs_revision', 'reviewed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLessons((data || []) as LessonRow[]);
    } catch (error: any) {
      console.error('Load review lessons error:', error);
      Alert.alert('Load Error', error?.message || 'Could not load lesson queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateStatus(id: string, status: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updatePayload: any = {
      quality_status: status,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      updatePayload.is_active = true;
    }

    const { error } = await supabase
      .from('lesson_library')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    await loadLessons();
  } catch (error: any) {
    console.error('Update lesson status error:', error);
    Alert.alert('Update Error', error?.message || 'Could not update lesson.');
  }
}

  function confirmApprove(lesson: LessonRow) {
    Alert.alert(
      'Approve Lesson?',
      `Approve "${lesson.title}" for the lesson library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => void updateStatus(lesson.id, 'approved'),
        },
      ]
    );
  }

  function confirmRevision(lesson: LessonRow) {
    Alert.alert(
      'Mark Needs Revision?',
      `Send "${lesson.title}" back for edits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Needs Revision',
          style: 'destructive',
          onPress: () => void updateStatus(lesson.id, 'needs_revision'),
        },
      ]
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    void loadLessons();
  };

  if (checkingAdmin || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading review queue...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Admin Only</Text>
          <Text style={styles.emptyText}>This page is only available to the app admin.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2E1065" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Lesson Review Queue</Text>
          <Text style={styles.headerSubtitle}>{lessons.length} lesson(s) waiting</Text>
        </View>

        <TouchableOpacity
  style={styles.headerButton}
  onPress={() => router.push('/admin/generate-lessons' as any)}
>
  <Ionicons name="sparkles-outline" size={22} color="#7C3AED" />
</TouchableOpacity>

<TouchableOpacity
  style={styles.headerButton}
  onPress={() => router.push('/admin/create-lesson' as any)}
>
  <Ionicons name="add" size={24} color="#7C3AED" />
</TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
        }
      >
        {lessons.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>There are no lessons waiting for review.</Text>
          </View>
        ) : (
          lessons.map((lesson) => (
            <View key={lesson.id} style={styles.lessonCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>
                    {(lesson.quality_status || 'draft').replace('_', ' ').toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.stageText}>Stage {lesson.stage_number}</Text>
              </View>

              <Text style={styles.lessonTitle}>{lesson.title}</Text>

              <Text style={styles.lessonMeta}>
                {lesson.category} · {lesson.skill_area}
              </Text>

              {lesson.stage_name ? (
                <Text style={styles.lessonSubText}>{lesson.stage_name}</Text>
              ) : null}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => router.push(`/lesson-library/${lesson.id}` as any)}
                >
                  <Ionicons name="eye-outline" size={17} color="#4F46E5" />
                  <Text style={styles.viewButtonText}>Review</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => confirmApprove(lesson)}
                >
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.revisionButton}
                  onPress={() => confirmRevision(lesson)}
                >
                  <Ionicons name="refresh-outline" size={17} color="#92400E" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF7ED',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#2E1065',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
    backgroundColor: '#FFF7ED',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#2E1065',
  },
  headerSubtitle: {
    marginTop: 2,
    color: '#7C3AED',
    fontWeight: '800',
  },
  content: {
    padding: 18,
    paddingBottom: 140,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    backgroundColor: '#F5F3FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusText: {
    color: '#6D28D9',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  stageText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },
  lessonTitle: {
    marginTop: 12,
    color: '#1E1B4B',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  lessonMeta: {
    marginTop: 5,
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '800',
  },
  lessonSubText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  viewButton: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  viewButtonText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontWeight: '900',
  },
  approveButton: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  approveButtonText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  revisionButton: {
    width: 48,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});