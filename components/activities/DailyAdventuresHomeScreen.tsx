import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_PRESENTATION,
} from '../../lib/activityCategories';
import { useChildSubscription } from '../../lib/ChildSubscriptionContext';
import {
  DailyAdventureAssignment,
  getMyDailyAdventures,
  getMySurpriseActivity,
} from '../../lib/dailyAdventuresApi';
import { useChild } from '../../lib/SelectedChildContext';
import { ActivityIllustration } from './ActivityIllustration';

export default function DailyAdventuresHomeScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro, loading: entitlementLoading } = useChildSubscription();
  const childId = selectedChild?.id ?? null;
  const childName = selectedChild?.child_name || selectedChild?.name || 'your child';
  const [daily, setDaily] = useState<DailyAdventureAssignment[]>([]);
  const [dailyChildId, setDailyChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const dailyRequest = useRef(0);
  const surpriseRequest = useRef(0);
  useEffect(() => {
    dailyRequest.current += 1;
    surpriseRequest.current += 1;
    setDaily([]);
    setDailyChildId(null);
    setError(false);
    setIncomplete(false);
  }, [childId]);

  const loadDaily = useCallback(async (refresh = false) => {
    if (!childId) {
      setDaily([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const requestId = ++dailyRequest.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const rows = await getMyDailyAdventures(childId);
      if (requestId !== dailyRequest.current) return;
      const ordered = [...rows].sort((a, b) => a.position - b.position).slice(0, 3);
      setDaily(ordered);
      setDailyChildId(childId);
      setIncomplete(
        ordered.length !== 3 ||
          rows.some((row) => row.incomplete || row.assignment_count !== 3),
      );
    } catch {
      if (requestId === dailyRequest.current) {
        setDaily([]);
        setError(true);
      }
    } finally {
      if (requestId === dailyRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [childId]);

  useFocusEffect(useCallback(() => {
    void loadDaily();
    return () => { dailyRequest.current += 1; };
  }, [loadDaily]));

  const handleSurprise = useCallback(async () => {
    if (!childId || !isPro || entitlementLoading || surpriseLoading) return;
    const requestId = ++surpriseRequest.current;
    setSurpriseLoading(true);
    try {
      const activity = await getMySurpriseActivity(childId);
      if (requestId === surpriseRequest.current && activity?.id) {
        router.push({ pathname: '/activities/[activityId]', params: { activityId: activity.id } });
      }
    } catch {
      // Preserve the usable daily experience if discovery is temporarily unavailable.
    } finally {
      if (requestId === surpriseRequest.current) setSurpriseLoading(false);
    }
  }, [childId, entitlementLoading, isPro, router, surpriseLoading]);

  const dailyContent = useMemo(() => {
    if (loading || dailyChildId !== childId) return <StatusCard title="Finding today’s ideas..." loading />;
    if (error) return <StatusCard title="Today’s ideas need another moment" body="Check your connection and try again." action="Try Again" onPress={() => void loadDaily()} />;
    if (incomplete) return <StatusCard title="We’re gathering the rest" body="Today’s complete set isn’t ready yet. Please try again shortly." action="Try Again" onPress={() => void loadDaily()} />;
    return <View style={styles.dailyStack}>{daily.map((item) => <FeaturedCard key={item.id} item={item} onPress={() => router.push({ pathname: '/activities/[activityId]', params: { activityId: item.id } })} />)}</View>;
  }, [childId, daily, dailyChildId, error, incomplete, loadDaily, loading, router]);

  if (!selectedChild) {
    return <SafeAreaView style={styles.container}><View style={styles.center}><Ionicons name="happy-outline" size={40} color="#8B95A7" /><Text style={styles.statusTitle}>Choose a child profile</Text><Text style={styles.statusBody}>Daily Adventures will appear here when a child is selected.</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDaily(true)} tintColor="#6D28D9" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroOrb} /><Text style={styles.sparkleOne}>✦</Text><Text style={styles.sparkleTwo}>·</Text>
          <View style={styles.heroTop}><Text style={styles.eyebrow}>PLAY · EXPLORE · CONNECT</Text><TouchableOpacity accessibilityLabel="Open saved activities" accessibilityRole="button" onPress={() => router.push('/(tabs)/saved')} style={styles.saved}><Ionicons name="bookmark-outline" size={18} color="#FFFFFF" /><Text style={styles.savedText}>Saved</Text></TouchableOpacity></View>
          <Text style={styles.heroTitle}>Daily Adventures</Text>
          <Text style={styles.heroCopy}>Fun ideas for {childName} to play, explore, and connect with you today.</Text>
          <View style={styles.support}><View style={styles.supportIcon}><Ionicons name="dice-outline" size={23} color="#6D28D9" /></View><View style={styles.supportText}><Text style={styles.supportTitle}>Low-pressure family fun</Text><Text style={styles.supportCopy}>Simple moments. No lessons. No pressure.</Text></View></View>
        </View>

        <View style={styles.heading}><Text style={styles.sectionTitle}>For {childName} Today</Text><Text style={styles.sectionCopy}>Three personalized ideas picked just for your day.</Text></View>
        {dailyContent}

        {!entitlementLoading && isPro ? <TouchableOpacity accessibilityLabel="Surprise me with an activity" accessibilityRole="button" disabled={surpriseLoading} onPress={() => void handleSurprise()} style={styles.surprise}><View style={styles.magic}><Ionicons name="color-wand-outline" size={28} color="#FFFFFF" /></View><View style={styles.surpriseText}><Text style={styles.surpriseTitle}>Can’t decide?</Text><Text style={styles.surpriseCopy}>Let us pick a fun idea just for you!</Text></View>{surpriseLoading ? <ActivityIndicator color="#FFFFFF" /> : <View style={styles.surpriseAction}><Text style={styles.surpriseActionText}>Surprise Me</Text><Ionicons name="sparkles" size={16} color="#FFFFFF" /></View>}</TouchableOpacity> : null}

        {!entitlementLoading && isPro ? <TouchableOpacity accessibilityHint="Opens the activity library" accessibilityRole="button" onPress={() => router.push('/activities/explore')} style={styles.explore}><View style={styles.exploreIcon}><Ionicons name="compass-outline" size={32} color="#C45D35" /></View><View style={styles.exploreText}><Text style={styles.exploreTitle}>Explore Activities</Text><Text style={styles.exploreCopy}>Search by interest, setting, or type and find more ideas for your day.</Text><Text style={styles.exploreAction}>Browse Activities  →</Text></View><View style={styles.exploreDot} /></TouchableOpacity> : null}
        {!entitlementLoading && !isPro ? <View style={styles.locked}><View style={styles.lockedIcon}><Ionicons name="lock-closed" size={24} color="#6D28D9" /></View><Text style={styles.lockedTitle}>Explore More Activities</Text><Text style={styles.lockedCopy}>Search by interest, setting, or type and find more ideas for your day.</Text><Text style={styles.lockedPro}>Available with Pro</Text><TouchableOpacity accessibilityHint="Opens subscription options" accessibilityRole="button" onPress={() => router.push('/subscription')} style={styles.trial}><Text style={styles.trialText}>Start 14-Day Free Trial</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></TouchableOpacity></View> : null}
        <Text style={styles.footer}>Everyday fun builds connection.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeaturedCard({ item, onPress }: { item: DailyAdventureAssignment; onPress: () => void }) {
  const palette = ACTIVITY_CATEGORY_PRESENTATION[item.category];
  const metadata = [item.location, item.time].filter(Boolean).join('  ·  ');
  return <TouchableOpacity accessibilityLabel={`${item.title}. ${ACTIVITY_CATEGORY_LABELS[item.category]}. Open activity details.`} accessibilityRole="button" activeOpacity={0.88} onPress={onPress} style={[styles.featured, { backgroundColor: palette.background, borderColor: palette.border }]}><ActivityIllustration category={item.category} style={styles.featuredArt} /><View style={styles.featuredBody}><Text style={[styles.category, { color: palette.accent }]}>{ACTIVITY_CATEGORY_LABELS[item.category]}</Text><Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text><Text numberOfLines={2} style={styles.cardCopy}>{item.description || 'A playful moment to enjoy together.'}</Text>{metadata ? <Text numberOfLines={1} style={styles.metadata}>{metadata}</Text> : null}</View><View style={[styles.open, { backgroundColor: palette.accent }]}><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></View></TouchableOpacity>;
}

function StatusCard({ title, body, action, onPress, loading }: { title: string; body?: string; action?: string; onPress?: () => void; loading?: boolean }) {
  return <View style={styles.status}>{loading ? <ActivityIndicator color="#6D28D9" /> : <Ionicons name="sparkles-outline" size={26} color="#6D28D9" />}<Text style={styles.statusTitle}>{title}</Text>{body ? <Text style={styles.statusBody}>{body}</Text> : null}{action && onPress ? <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.retry}><Text style={styles.retryText}>{action}</Text></TouchableOpacity> : null}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9F1' }, content: { paddingHorizontal: 18, paddingBottom: 42 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  hero: { backgroundColor: '#7138DF', borderRadius: 30, padding: 22, marginTop: 8, marginBottom: 24, overflow: 'hidden' }, heroOrb: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFFFFF10', right: -40, top: -52 }, sparkleOne: { position: 'absolute', color: '#EADFFF', fontSize: 24, right: 34, top: 82 }, sparkleTwo: { position: 'absolute', color: '#D9C7FF', fontSize: 42, right: 72, top: 105 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, eyebrow: { color: '#EEE6FF', fontSize: 12, fontWeight: '900', letterSpacing: 1, flexShrink: 1 }, saved: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#A985F3', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 }, savedText: { color: '#FFFFFF', fontWeight: '800' }, heroTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: -0.8, marginTop: 14 }, heroCopy: { color: '#F1EAFF', fontSize: 16, lineHeight: 23, fontWeight: '600', marginTop: 7, maxWidth: '88%' }, support: { marginTop: 18, borderRadius: 20, backgroundColor: '#F8F3FF', padding: 13, flexDirection: 'row', alignItems: 'center' }, supportIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EDE4FF', alignItems: 'center', justifyContent: 'center' }, supportText: { marginLeft: 12, flex: 1 }, supportTitle: { color: '#3B1A72', fontSize: 15, fontWeight: '900' }, supportCopy: { color: '#6B5A7D', fontSize: 12, lineHeight: 17, marginTop: 2, fontWeight: '600' },
  heading: { marginHorizontal: 4, marginBottom: 13 }, sectionTitle: { color: '#111827', fontSize: 25, fontWeight: '900', letterSpacing: -0.4 }, sectionCopy: { color: '#667085', fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 4 }, dailyStack: { gap: 14, marginBottom: 22 }, featured: { minHeight: 158, borderRadius: 26, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13, overflow: 'hidden' }, featuredArt: { width: 104, height: 126, borderRadius: 22 }, featuredBody: { flex: 1, minWidth: 0 }, category: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 }, cardTitle: { color: '#111827', fontSize: 18, lineHeight: 22, fontWeight: '900', marginTop: 4 }, cardCopy: { color: '#667085', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 5 }, metadata: { color: '#778196', fontSize: 12, fontWeight: '700', marginTop: 8 }, open: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', right: 12, bottom: 12 },
  surprise: { minHeight: 116, borderRadius: 27, backgroundColor: '#7138DF', padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18, overflow: 'hidden' }, magic: { width: 54, height: 54, borderRadius: 19, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' }, surpriseText: { flex: 1 }, surpriseTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' }, surpriseCopy: { color: '#EEE6FF', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 }, surpriseAction: { alignItems: 'center', gap: 3 }, surpriseActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  explore: { minHeight: 154, borderRadius: 27, backgroundColor: '#FFF1E8', borderWidth: 1, borderColor: '#F1D2C0', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }, exploreIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: '#FFE2D1', alignItems: 'center', justifyContent: 'center' }, exploreText: { flex: 1 }, exploreTitle: { color: '#38251F', fontSize: 20, fontWeight: '900' }, exploreCopy: { color: '#755E55', fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 5 }, exploreAction: { color: '#B64F2D', fontSize: 14, fontWeight: '900', marginTop: 10 }, exploreDot: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: '#F7CDB5', right: -22, top: -18 },
  locked: { borderRadius: 27, backgroundColor: '#FBF8FF', borderWidth: 1, borderColor: '#DED2F7', padding: 20 }, lockedIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#EEE6FF', alignItems: 'center', justifyContent: 'center' }, lockedTitle: { color: '#26163F', fontSize: 21, fontWeight: '900', marginTop: 12 }, lockedCopy: { color: '#6C617A', fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 6 }, lockedPro: { color: '#6D28D9', fontSize: 13, fontWeight: '900', marginTop: 10 }, trial: { minHeight: 50, borderRadius: 18, backgroundColor: '#7138DF', marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, trialText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, footer: { color: '#8A7E73', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  status: { minHeight: 132, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E1EE', alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 22 }, statusTitle: { color: '#20202A', fontSize: 18, textAlign: 'center', fontWeight: '900', marginTop: 8 }, statusBody: { color: '#6B7280', fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600', marginTop: 5 }, retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#EEE6FF', marginTop: 13 }, retryText: { color: '#6D28D9', fontWeight: '900' },
});
