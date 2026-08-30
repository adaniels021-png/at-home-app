import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityIllustration } from '../../components/activities/ActivityIllustration';
import { ACTIVITY_CATEGORY_LABELS, ACTIVITY_CATEGORY_PRESENTATION, isActivityCategory } from '../../lib/activityCategories';
import { ActivityLibraryItem, getMyActivityDetail, getMySavedActivitySnapshot, setMyActivityState } from '../../lib/dailyAdventuresApi';
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

type ActivityView = ActivityLibraryItem & { legacySnapshot?: boolean };
type Feedback = 'loved' | 'good' | 'not_today';

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function snapshotToActivity(snapshot: any, activityId: string): ActivityView | null {
  const rawCategory = snapshot?.category;
  if (!snapshot || !isActivityCategory(rawCategory)) return null;
  return {
    id: snapshot.library_activity_id || snapshot.id || activityId,
    title: snapshot.title || snapshot.name || 'Saved Activity',
    category: rawCategory,
    location: snapshot.location || null,
    time: snapshot.time || null,
    description: snapshot.description || null,
    try_this: textArray(snapshot.try_this || snapshot.tryThis || snapshot.instructions),
    why_it_helps: snapshot.why_it_helps || snapshot.whyItHelps || snapshot.success_criteria || null,
    materials: textArray(snapshot.materials),
    pro_only: Boolean(snapshot.pro_only),
    illustration_url: typeof snapshot.illustration_url === 'string' ? snapshot.illustration_url : null,
    legacySnapshot: true,
  };
}

export default function ActivityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ activityId?: string; savedActivityId?: string }>();
  const { selectedChild } = useChild();
  const activityId = typeof params.activityId === 'string' ? params.activityId : '';
  const savedActivityId = typeof params.savedActivityId === 'string' ? params.savedActivityId : '';
  const childId = selectedChild?.id ?? null;
  const [activity, setActivity] = useState<ActivityView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'unavailable' | 'network' | null>(null);
  const [saved, setSaved] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [updating, setUpdating] = useState(false);
  const requestRef = useRef(0);

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)');

  const load = useCallback(async () => {
    if (!childId || !activityId) {
      setError('unavailable');
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    setActivity(null);
    try {
      let result = await getMyActivityDetail(childId, activityId);
      if (!result && savedActivityId) {
        const snapshot = await getMySavedActivitySnapshot(childId, savedActivityId);
        result = snapshotToActivity(snapshot, activityId);
      }
      if (requestId !== requestRef.current) return;
      if (!result) {
        setError('unavailable');
        return;
      }
      setActivity(result);
      const { data } = await supabase
        .from('saved_activities')
        .select('is_saved, is_favorite, completed')
        .eq('child_id', childId)
        .eq('library_activity_id', activityId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (requestId !== requestRef.current) return;
      setSaved(Boolean(data?.is_saved));
      setFavorite(Boolean(data?.is_favorite));
      setCompleted(Boolean(data?.completed));
    } catch {
      if (requestId === requestRef.current) setError('network');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [activityId, childId, savedActivityId]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  const updateState = useCallback(async (update: { saved?: boolean; favorite?: boolean; completed?: boolean; feedback?: Feedback }) => {
    if (!childId || !activity || activity.legacySnapshot || updating) return;
    setUpdating(true);
    try {
      await setMyActivityState(childId, activity.id, update);
      if (update.saved !== undefined) setSaved(update.saved);
      if (update.favorite !== undefined) {
        setFavorite(update.favorite);
        if (update.favorite) setSaved(true);
      }
      if (update.completed !== undefined) {
        setCompleted(update.completed);
        if (update.completed) setSaved(true);
      }
    } catch {
      Alert.alert('Couldn’t Update Activity', 'Please check your connection and try again.');
    } finally {
      setUpdating(false);
    }
  }, [activity, childId, updating]);

  const complete = useCallback(() => {
    Alert.alert('How did it go?', 'Choose the response that feels closest.', [
      { text: 'Loved it', onPress: () => void updateState({ saved: true, completed: true, feedback: 'loved' }) },
      { text: 'Pretty good', onPress: () => void updateState({ saved: true, completed: true, feedback: 'good' }) },
      { text: 'Not today', onPress: () => void updateState({ saved: true, completed: true, feedback: 'not_today' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [updateState]);

  const content = useMemo(() => {
    if (!activity) return null;
    const presentation = ACTIVITY_CATEGORY_PRESENTATION[activity.category];
    const steps = textArray(activity.try_this);
    const materials = textArray(activity.materials);
    return (
      <>
        <ActivityIllustration category={activity.category} />
        <Text style={[styles.category, { color: presentation.accent }]}>{ACTIVITY_CATEGORY_LABELS[activity.category]}</Text>
        <Text style={styles.title}>{activity.title}</Text>
        {[activity.location, activity.time].some(Boolean) ? <View style={styles.metaRow}>{activity.location ? <Meta icon="location-outline" text={activity.location} /> : null}{activity.time ? <Meta icon="time-outline" text={activity.time} /> : null}</View> : null}
        {activity.description ? <Text style={styles.description}>{activity.description}</Text> : null}
        {activity.legacySnapshot ? <View style={styles.historyNote}><Ionicons name="archive-outline" size={18} color="#6D28D9" /><Text style={styles.historyText}>This is your saved activity snapshot.</Text></View> : null}
        {!activity.legacySnapshot ? <View style={styles.actionRow}><Action icon={favorite ? 'heart' : 'heart-outline'} label={favorite ? 'Favorited' : 'Favorite'} active={favorite} disabled={updating} onPress={() => void updateState({ saved: true, favorite: !favorite })} /><Action icon={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? 'Saved' : 'Save'} active={saved} disabled={updating} onPress={() => void updateState({ saved: !saved })} /></View> : null}
        {steps.length ? <Section title="Try This" icon="sparkles-outline">{steps.map((step, index) => <View key={`${step}-${index}`} style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View><Text style={styles.stepText}>{step}</Text></View>)}</Section> : null}
        {materials.length ? <Section title="What You’ll Need" icon="basket-outline">{materials.map((material) => <Text key={material} style={styles.bullet}>•  {material}</Text>)}</Section> : null}
        {activity.why_it_helps ? <Section title="Why It Helps" icon="heart-circle-outline"><Text style={styles.sectionText}>{activity.why_it_helps}</Text></Section> : null}
        {!activity.legacySnapshot ? <TouchableOpacity accessibilityRole="button" disabled={updating} onPress={complete} style={[styles.completeButton, completed && styles.completeButtonDone]}><Ionicons name={completed ? 'checkmark-circle' : 'checkmark-circle-outline'} size={22} color="#FFFFFF" /><Text style={styles.completeText}>{completed ? 'We Did This' : 'Mark We Did This'}</Text></TouchableOpacity> : null}
      </>
    );
  }, [activity, complete, completed, favorite, saved, updateState, updating]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}><TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.back}><Ionicons name="arrow-back" size={22} color="#281744" /></TouchableOpacity><Text style={styles.navTitle}>Activity</Text><View style={styles.navSpacer} /></View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#7138DF" /><Text style={styles.loadingText}>Opening your activity...</Text></View> : error ? <View style={styles.center}><Ionicons name={error === 'network' ? 'cloud-offline-outline' : 'compass-outline'} size={38} color="#8B95A7" /><Text style={styles.errorTitle}>{error === 'network' ? 'This activity needs another try' : 'This activity isn’t available'}</Text><Text style={styles.errorText}>{error === 'network' ? 'Check your connection and try again.' : 'It may have been archived or is no longer part of this child’s available activities.'}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>Try Again</Text></TouchableOpacity></View> : <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{content}</ScrollView>}
    </SafeAreaView>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View style={styles.meta}><Ionicons name={icon} size={17} color="#667085" /><Text style={styles.metaText}>{text}</Text></View>; }
function Action({ icon, label, active, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled: boolean; onPress: () => void }) { return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} style={[styles.action, active && styles.actionActive]}><Ionicons name={icon} size={21} color={active ? '#6D28D9' : '#64748B'} /><Text style={[styles.actionText, active && styles.actionTextActive]}>{label}</Text></TouchableOpacity>; }
function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) { return <View style={styles.section}><View style={styles.sectionHeader}><Ionicons name={icon} size={21} color="#7138DF" /><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9F1' }, nav: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E0EA', alignItems: 'center', justifyContent: 'center' }, navTitle: { color: '#281744', fontSize: 17, fontWeight: '900' }, navSpacer: { width: 44 }, content: { padding: 18, paddingBottom: 52 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }, loadingText: { color: '#6B7280', fontWeight: '700', marginTop: 12 },
  category: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 20 }, title: { color: '#111827', fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -0.6, marginTop: 5 }, description: { color: '#5F6878', fontSize: 16, lineHeight: 24, fontWeight: '600', marginTop: 15 }, metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 }, meta: { minHeight: 40, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E1E8', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }, metaText: { color: '#667085', fontSize: 13, fontWeight: '700' },
  historyNote: { borderRadius: 16, backgroundColor: '#F5F0FF', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16 }, historyText: { color: '#5D427E', fontSize: 13, fontWeight: '700' }, actionRow: { flexDirection: 'row', gap: 10, marginTop: 18 }, action: { flex: 1, minHeight: 50, backgroundColor: '#FFFFFF', borderRadius: 17, borderWidth: 1, borderColor: '#DDD7E4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionActive: { backgroundColor: '#F5F0FF', borderColor: '#CDBAF3' }, actionText: { color: '#64748B', fontWeight: '900' }, actionTextActive: { color: '#6D28D9' },
  section: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E9E3EA', padding: 18, marginTop: 15 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 }, sectionTitle: { color: '#241734', fontSize: 19, fontWeight: '900' }, step: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 12 }, stepNumber: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#EEE6FF', alignItems: 'center', justifyContent: 'center' }, stepNumberText: { color: '#6D28D9', fontWeight: '900' }, stepText: { flex: 1, color: '#4B5563', fontSize: 15, lineHeight: 22, fontWeight: '600' }, bullet: { color: '#4B5563', fontSize: 15, lineHeight: 23, fontWeight: '600', marginBottom: 5 }, sectionText: { color: '#4B5563', fontSize: 15, lineHeight: 23, fontWeight: '600' },
  completeButton: { minHeight: 56, borderRadius: 19, backgroundColor: '#7138DF', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, completeButtonDone: { backgroundColor: '#3F8F58' }, completeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, errorTitle: { color: '#20202A', fontSize: 21, textAlign: 'center', fontWeight: '900', marginTop: 12 }, errorText: { color: '#6B7280', fontSize: 14, lineHeight: 21, textAlign: 'center', fontWeight: '600', marginTop: 7 }, retry: { minHeight: 46, borderRadius: 16, backgroundColor: '#EEE6FF', paddingHorizontal: 22, justifyContent: 'center', marginTop: 17 }, retryText: { color: '#6D28D9', fontWeight: '900' },
});
