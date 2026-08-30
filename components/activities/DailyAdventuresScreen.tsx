import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS, ACTIVITY_CATEGORY_PRESENTATION, ActivityCategory } from '../../lib/activityCategories';
import { useChildSubscription } from '../../lib/ChildSubscriptionContext';
import { ActivityLibraryItem, DailyAdventureAssignment, getMyDailyAdventures, getMySurpriseActivity, searchMyActivityLibrary } from '../../lib/dailyAdventuresApi';
import { useChild } from '../../lib/SelectedChildContext';
import { ActivityIllustration } from './ActivityIllustration';

const PAGE_SIZE = 20;
type CategoryFilter = ActivityCategory | 'all';
const CATEGORY_FILTERS: CategoryFilter[] = ['all', ...ACTIVITY_CATEGORIES];

const label = (category: CategoryFilter) => category === 'all' ? 'All' : ACTIVITY_CATEGORY_LABELS[category];
const meta = (item: ActivityLibraryItem | DailyAdventureAssignment) => [item.location, item.time].filter(Boolean).join('  ·  ') || 'A simple moment together';

export default function DailyAdventuresScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro, loading: entitlementLoading } = useChildSubscription();
  const childId = selectedChild?.id ?? null;
  const childName = selectedChild?.child_name || selectedChild?.name || 'your child';
  const [daily, setDaily] = useState<DailyAdventureAssignment[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyError, setDailyError] = useState(false);
  const [dailyIncomplete, setDailyIncomplete] = useState(false);
  const [library, setLibrary] = useState<ActivityLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [libraryError, setLibraryError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const dailyRequest = useRef(0);
  const libraryRequest = useRef(0);
  const surpriseRequest = useRef(0);

  const openDetail = useCallback((activityId: string, savedActivityId?: string) => {
    router.push({ pathname: '/activities/[activityId]', params: { activityId, ...(savedActivityId ? { savedActivityId } : {}) } });
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    dailyRequest.current += 1;
    libraryRequest.current += 1;
    surpriseRequest.current += 1;
    setDaily([]);
    setLibrary([]);
    setDailyError(false);
    setLibraryError(false);
    setDailyIncomplete(false);
    setHasMore(false);
    setQuery('');
    setDebouncedQuery('');
    setCategory('all');
  }, [childId]);

  const loadDaily = useCallback(async (refresh = false) => {
    if (!childId) {
      setDaily([]);
      setDailyLoading(false);
      setRefreshing(false);
      return;
    }
    const requestId = ++dailyRequest.current;
    if (refresh) setRefreshing(true);
    else setDailyLoading(true);
    setDailyError(false);
    try {
      const rows = await getMyDailyAdventures(childId);
      if (requestId !== dailyRequest.current) return;
      const ordered = [...rows].sort((a, b) => a.position - b.position).slice(0, 3);
      setDaily(ordered);
      setDailyIncomplete(ordered.length !== 3 || rows.some((row) => row.incomplete || row.assignment_count !== 3));
    } catch {
      if (requestId === dailyRequest.current) {
        setDaily([]);
        setDailyError(true);
      }
    } finally {
      if (requestId === dailyRequest.current) {
        setDailyLoading(false);
        setRefreshing(false);
      }
    }
  }, [childId]);

  const fetchLibrary = useCallback(async (append: boolean, currentLibrary: ActivityLibraryItem[]) => {
    if (!childId || !isPro || entitlementLoading) return;
    const requestId = append ? libraryRequest.current : ++libraryRequest.current;
    if (append) setLoadingMore(true);
    else setLibraryLoading(true);
    if (!append) setLibraryError(false);
    const cursor = append ? currentLibrary[currentLibrary.length - 1] : undefined;
    try {
      const rows = await searchMyActivityLibrary({
        childId,
        query: debouncedQuery || undefined,
        category: category === 'all' ? undefined : category,
        afterTitle: cursor?.title,
        afterId: cursor?.id,
        limit: PAGE_SIZE,
      });
      if (requestId !== libraryRequest.current) return;
      setLibrary((current) => append ? [...current, ...rows] : rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      if (requestId === libraryRequest.current) {
        if (!append) setLibrary([]);
        setLibraryError(true);
      }
    } finally {
      if (requestId === libraryRequest.current) {
        setLibraryLoading(false);
        setLoadingMore(false);
      }
    }
  }, [category, childId, debouncedQuery, entitlementLoading, isPro]);

  useFocusEffect(useCallback(() => { void loadDaily(); }, [loadDaily]));

  useEffect(() => {
    if (entitlementLoading) return;
    if (!isPro) {
      libraryRequest.current += 1;
      setLibrary([]);
      setLibraryLoading(false);
      return;
    }
    void fetchLibrary(false, []);
  }, [category, childId, debouncedQuery, entitlementLoading, fetchLibrary, isPro]);

  const handleSurprise = useCallback(async () => {
    if (!childId || !isPro || surpriseLoading) return;
    const requestId = ++surpriseRequest.current;
    setSurpriseLoading(true);
    try {
      const result = await getMySurpriseActivity(childId);
      if (requestId === surpriseRequest.current && result?.id) openDetail(result.id);
    } catch {
      // The button returns to its normal state; the page remains safely usable.
    } finally {
      if (requestId === surpriseRequest.current) setSurpriseLoading(false);
    }
  }, [childId, isPro, openDetail, surpriseLoading]);

  const header = useMemo(() => (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.eyebrow}>PLAY · EXPLORE · CONNECT</Text>
          <TouchableOpacity accessibilityLabel="Open saved activities" accessibilityRole="button" onPress={() => router.push('/(tabs)/saved')} style={styles.savedButton}>
            <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
            <Text style={styles.savedButtonText}>Saved</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroTitle}>Daily Adventures</Text>
        <Text style={styles.heroCopy}>Fun ideas for {childName} to play, explore, and connect with you today.</Text>
        <View style={styles.supportStrip}>
          <View style={styles.supportIcon}><Ionicons name="dice-outline" size={22} color="#6D28D9" /></View>
          <View style={styles.supportText}><Text style={styles.supportTitle}>Low-pressure family fun</Text><Text style={styles.supportCopy}>Simple moments. No lessons. No pressure.</Text></View>
        </View>
      </View>

      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>For {childName} Today</Text><Text style={styles.sectionCopy}>Three ideas picked for your day.</Text></View>
      {dailyLoading ? <LoadingCard label="Finding today’s ideas..." /> : dailyError ? (
        <MessageCard icon="cloud-offline-outline" title="Today’s ideas need another moment" body="Check your connection and try again." action="Try Again" onPress={() => void loadDaily()} />
      ) : dailyIncomplete ? (
        <MessageCard icon="sparkles-outline" title="We’re gathering the rest" body="Today’s complete set isn’t ready yet. Please try again shortly." action="Try Again" onPress={() => void loadDaily()} />
      ) : <View style={styles.dailyStack}>{daily.map((item) => <DailyCard item={item} key={item.id} onPress={() => openDetail(item.id)} />)}</View>}

      {!entitlementLoading && isPro ? (
        <View style={styles.surpriseCard}>
          <View style={styles.surpriseCopyWrap}><Text style={styles.surpriseTitle}>Can’t decide?</Text><Text style={styles.surpriseCopy}>Let us pick a fun idea for you.</Text></View>
          <TouchableOpacity accessibilityLabel="Surprise me with an activity" accessibilityRole="button" disabled={surpriseLoading} onPress={() => void handleSurprise()} style={styles.surpriseButton}>
            {surpriseLoading ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="color-wand-outline" size={20} color="#FFFFFF" />}<Text style={styles.surpriseButtonText}>Surprise Me</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!entitlementLoading && !isPro ? <LockedExplore onPress={() => router.push('/subscription')} /> : null}

      {!entitlementLoading && isPro ? (
        <View style={styles.exploreHeader}>
          <Text style={styles.sectionTitle}>Explore Activities</Text><Text style={styles.sectionCopy}>Find something that fits your day.</Text>
          <View style={styles.searchWrap}><Ionicons name="search-outline" size={20} color="#7C879B" /><TextInput accessibilityLabel="Search activities" onChangeText={setQuery} placeholder="What sounds fun today?" placeholderTextColor="#8B95A7" returnKeyType="search" style={styles.searchInput} value={query} />{query ? <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color="#94A3B8" /></TouchableOpacity> : null}</View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{CATEGORY_FILTERS.map((item) => { const selected = category === item; return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} key={item} onPress={() => setCategory(item)} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label(item)}</Text></TouchableOpacity>; })}</ScrollView>
        </View>
      ) : null}
    </View>
  ), [category, childName, daily, dailyError, dailyIncomplete, dailyLoading, entitlementLoading, handleSurprise, isPro, loadDaily, openDetail, query, router, surpriseLoading]);

  if (!selectedChild) return <SafeAreaView style={styles.container}><View style={styles.centerState}><Ionicons name="happy-outline" size={38} color="#8B95A7" /><Text style={styles.messageTitle}>Choose a child profile</Text><Text style={styles.messageBody}>Daily Adventures will appear here when a child is selected.</Text></View></SafeAreaView>;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={isPro ? library : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={isPro && !entitlementLoading ? libraryLoading ? <LoadingCard label="Looking for playful ideas..." /> : libraryError ? <MessageCard icon="refresh-outline" title="Explore needs another try" body="We couldn’t load more ideas right now." action="Try Again" onPress={() => void fetchLibrary(false, [])} /> : <MessageCard icon="search-outline" title="No ideas found" body="Try another search or category." /> : null}
        ListFooterComponent={isPro && library.length ? <View style={styles.footer}>{loadingMore ? <ActivityIndicator color="#6D28D9" /> : hasMore ? <TouchableOpacity accessibilityRole="button" onPress={() => void fetchLibrary(true, library)} style={styles.loadMoreButton}><Text style={styles.loadMoreText}>Load more ideas</Text></TouchableOpacity> : <Text style={styles.endText}>You’ve reached the end of this collection.</Text>}</View> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDaily(true)} tintColor="#6D28D9" />}
        renderItem={({ item }) => <LibraryRow item={item} onPress={() => openDetail(item.id)} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function DailyCard({ item, onPress }: { item: DailyAdventureAssignment; onPress: () => void }) {
  const color = ACTIVITY_CATEGORY_PRESENTATION[item.category];
  return <TouchableOpacity accessibilityLabel={`${item.title}. ${ACTIVITY_CATEGORY_LABELS[item.category]}. Open activity details.`} accessibilityRole="button" activeOpacity={0.88} onPress={onPress} style={[styles.dailyCard, { borderColor: color.border }]}><ActivityIllustration category={item.category} compact imageSource={item.illustration_url ? { uri: item.illustration_url } : undefined} /><View style={styles.dailyText}><Text style={[styles.categoryText, { color: color.accent }]}>{ACTIVITY_CATEGORY_LABELS[item.category]}</Text><Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text><Text numberOfLines={2} style={styles.cardDescription}>{item.description || 'A playful moment to enjoy together.'}</Text><Text numberOfLines={1} style={styles.metadata}>{meta(item)}</Text></View><Ionicons name="chevron-forward" size={20} color="#6D28D9" /></TouchableOpacity>;
}

function LibraryRow({ item, onPress }: { item: ActivityLibraryItem; onPress: () => void }) {
  const color = ACTIVITY_CATEGORY_PRESENTATION[item.category];
  return <TouchableOpacity accessibilityLabel={`${item.title}. ${ACTIVITY_CATEGORY_LABELS[item.category]}. Open activity details.`} accessibilityRole="button" activeOpacity={0.88} onPress={onPress} style={styles.libraryRow}><ActivityIllustration category={item.category} compact imageSource={item.illustration_url ? { uri: item.illustration_url } : undefined} /><View style={styles.libraryText}><Text style={[styles.categoryText, { color: color.accent }]}>{ACTIVITY_CATEGORY_LABELS[item.category]}</Text><Text numberOfLines={2} style={styles.libraryTitle}>{item.title}</Text><Text numberOfLines={2} style={styles.libraryDescription}>{item.description || meta(item)}</Text></View><Ionicons name="chevron-forward" size={20} color="#7C879B" /></TouchableOpacity>;
}

function LockedExplore({ onPress }: { onPress: () => void }) {
  return <View style={styles.lockedCard}><View style={styles.lockedIcon}><Ionicons name="lock-closed" size={23} color="#6D28D9" /></View><Text style={styles.lockedTitle}>Explore More Activities</Text><Text style={styles.lockedCopy}>Search by interest, setting, or type and find more ideas for your day.</Text><Text style={styles.lockedPro}>Available with Pro</Text><TouchableOpacity accessibilityHint="Opens subscription options" accessibilityRole="button" onPress={onPress} style={styles.lockedButton}><Text style={styles.lockedButtonText}>Start 14-Day Free Trial</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></TouchableOpacity></View>;
}

function LoadingCard({ label: text }: { label: string }) { return <View style={styles.loadingCard}><ActivityIndicator color="#6D28D9" /><Text style={styles.loadingLabel}>{text}</Text></View>; }
function MessageCard({ icon, title, body, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action?: string; onPress?: () => void }) { return <View style={styles.messageCard}><Ionicons name={icon} size={28} color="#7C3AED" /><Text style={styles.messageTitle}>{title}</Text><Text style={styles.messageBody}>{body}</Text>{action && onPress ? <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.retryButton}><Text style={styles.retryText}>{action}</Text></TouchableOpacity> : null}</View>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9F1' }, content: { paddingHorizontal: 18, paddingBottom: 48 }, centerState: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: '#7138DF', borderRadius: 30, padding: 22, marginTop: 8, marginBottom: 24, overflow: 'hidden' }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, eyebrow: { color: '#EEE6FF', fontSize: 12, fontWeight: '900', letterSpacing: 1.1, flexShrink: 1 }, savedButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#A985F3', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 }, savedButtonText: { color: '#FFFFFF', fontWeight: '800' }, heroTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 14, letterSpacing: -0.8 }, heroCopy: { color: '#F1EAFF', fontSize: 16, lineHeight: 23, fontWeight: '600', marginTop: 7 },
  supportStrip: { marginTop: 18, borderRadius: 20, backgroundColor: '#F8F3FF', padding: 13, flexDirection: 'row', alignItems: 'center' }, supportIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EDE4FF', alignItems: 'center', justifyContent: 'center' }, supportText: { marginLeft: 12, flex: 1 }, supportTitle: { color: '#3B1A72', fontSize: 15, fontWeight: '900' }, supportCopy: { color: '#6B5A7D', fontSize: 12, lineHeight: 17, marginTop: 2, fontWeight: '600' },
  sectionHeading: { marginHorizontal: 4, marginBottom: 12 }, sectionTitle: { color: '#111827', fontSize: 25, fontWeight: '900', letterSpacing: -0.4 }, sectionCopy: { color: '#667085', fontSize: 14, fontWeight: '600', marginTop: 4 }, dailyStack: { gap: 12, marginBottom: 20 }, dailyCard: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, dailyText: { flex: 1, minWidth: 0 }, categoryText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }, cardTitle: { color: '#111827', fontSize: 17, lineHeight: 21, fontWeight: '900', marginTop: 3 }, cardDescription: { color: '#667085', fontSize: 13, lineHeight: 18, marginTop: 4, fontWeight: '600' }, metadata: { color: '#798397', fontSize: 12, marginTop: 7, fontWeight: '700' },
  surpriseCard: { backgroundColor: '#FFFDF8', borderColor: '#ECDCC2', borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 12 }, surpriseCopyWrap: { flex: 1 }, surpriseTitle: { color: '#272037', fontSize: 18, fontWeight: '900' }, surpriseCopy: { color: '#6B6476', fontSize: 13, marginTop: 3, fontWeight: '600' }, surpriseButton: { minHeight: 48, backgroundColor: '#7138DF', borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, surpriseButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  lockedCard: { backgroundColor: '#FBF8FF', borderColor: '#DED2F7', borderWidth: 1, borderRadius: 26, padding: 20, alignItems: 'flex-start', marginBottom: 28 }, lockedIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEE6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, lockedTitle: { color: '#26163F', fontSize: 21, fontWeight: '900' }, lockedCopy: { color: '#6C617A', fontSize: 14, lineHeight: 20, marginTop: 7, fontWeight: '600' }, lockedPro: { color: '#6D28D9', fontSize: 13, fontWeight: '900', marginTop: 11 }, lockedButton: { minHeight: 50, alignSelf: 'stretch', backgroundColor: '#7138DF', borderRadius: 18, marginTop: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, lockedButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  exploreHeader: { marginTop: 2, marginBottom: 12 }, searchWrap: { minHeight: 52, marginTop: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE1E8', borderRadius: 18, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, color: '#111827', fontSize: 15, fontWeight: '600', paddingVertical: 12 }, chipRow: { gap: 9, paddingTop: 12, paddingBottom: 4 }, chip: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#DDD7E7', backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 17 }, chipSelected: { backgroundColor: '#7138DF', borderColor: '#7138DF' }, chipText: { color: '#61596D', fontWeight: '800' }, chipTextSelected: { color: '#FFFFFF' },
  libraryRow: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E1EA', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 11 }, libraryText: { flex: 1, minWidth: 0 }, libraryTitle: { color: '#111827', fontSize: 16, lineHeight: 20, fontWeight: '900', marginTop: 3 }, libraryDescription: { color: '#6B7280', fontSize: 13, lineHeight: 18, marginTop: 4, fontWeight: '600' },
  loadingCard: { minHeight: 120, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E1EE', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, loadingLabel: { color: '#6B6476', fontSize: 14, fontWeight: '700', marginTop: 10 }, messageCard: { borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E1EE', padding: 22, alignItems: 'center', marginBottom: 22 }, messageTitle: { color: '#20202A', fontSize: 18, textAlign: 'center', fontWeight: '900', marginTop: 9 }, messageBody: { color: '#6B7280', fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600', marginTop: 5 }, retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#EEE6FF', marginTop: 14 }, retryText: { color: '#6D28D9', fontWeight: '900' }, footer: { minHeight: 82, justifyContent: 'center', alignItems: 'center' }, loadMoreButton: { minHeight: 46, borderRadius: 17, borderWidth: 1, borderColor: '#CDBAF3', paddingHorizontal: 22, justifyContent: 'center' }, loadMoreText: { color: '#6D28D9', fontWeight: '900' }, endText: { color: '#8B95A7', fontSize: 13, fontWeight: '600' },
});
