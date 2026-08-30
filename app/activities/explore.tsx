import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityIllustration } from '../../components/activities/ActivityIllustration';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_PRESENTATION,
  ActivityCategory,
} from '../../lib/activityCategories';
import { useChildSubscription } from '../../lib/ChildSubscriptionContext';
import {
  ActivityLibraryItem,
  searchMyActivityLibrary,
} from '../../lib/dailyAdventuresApi';
import { useChild } from '../../lib/SelectedChildContext';

const PAGE_SIZE = 5;
type CategoryFilter = ActivityCategory | 'all';
const FILTERS: CategoryFilter[] = ['all', ...ACTIVITY_CATEGORIES];

function filterLabel(value: CategoryFilter) {
  return value === 'all' ? 'All' : ACTIVITY_CATEGORY_LABELS[value];
}

function uniqueByStableId(
  current: ActivityLibraryItem[],
  incoming: ActivityLibraryItem[],
) {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  })];
}

export default function ExploreActivitiesScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro, loading: entitlementLoading } = useChildSubscription();
  const childId = selectedChild?.id ?? null;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [results, setResults] = useState<ActivityLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const requestRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    requestRef.current += 1;
    loadingMoreRef.current = false;
    setResults([]);
    setHasMore(false);
    setError(false);
    setLoadingMore(false);
    setQuery('');
    setDebouncedQuery('');
    setCategory('all');
  }, [childId]);

  const fetchPage = useCallback(async (
    append: boolean,
    currentResults: ActivityLibraryItem[],
  ) => {
    if (!childId || entitlementLoading || !isPro) return;
    if (append && loadingMoreRef.current) return;
    const requestId = append ? requestRef.current : ++requestRef.current;
    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setLoading(true);
      setError(false);
    }
    const cursor = append ? currentResults[currentResults.length - 1] : undefined;
    try {
      const rows = await searchMyActivityLibrary({
        childId,
        query: debouncedQuery || undefined,
        category: category === 'all' ? undefined : category,
        afterTitle: cursor?.title,
        afterId: cursor?.id,
        limit: PAGE_SIZE,
      });
      if (requestId !== requestRef.current) return;
      setResults((current) => append ? uniqueByStableId(current, rows) : uniqueByStableId([], rows));
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      if (requestId === requestRef.current) {
        if (!append) setResults([]);
        setError(true);
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, [category, childId, debouncedQuery, entitlementLoading, isPro]);

  useEffect(() => {
    if (entitlementLoading) return;
    requestRef.current += 1;
    setResults([]);
    setHasMore(false);
    setError(false);
    if (!isPro || !childId) {
      setLoading(false);
      return;
    }
    void fetchPage(false, []);
  }, [category, childId, debouncedQuery, entitlementLoading, fetchPage, isPro]);

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/activities');

  if (entitlementLoading) {
    return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color="#7138DF" /><Text style={styles.loadingText}>Checking access...</Text></View></SafeAreaView>;
  }

  if (!selectedChild || !isPro) {
    return <SafeAreaView style={styles.container}><View style={styles.nav}><TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.back}><Ionicons name="arrow-back" size={22} color="#281744" /></TouchableOpacity><Text style={styles.navTitle}>Explore Activities</Text><View style={styles.navSpacer} /></View><View style={styles.center}><View style={styles.lock}><Ionicons name="lock-closed" size={28} color="#6D28D9" /></View><Text style={styles.lockedTitle}>Explore More Activities</Text><Text style={styles.lockedCopy}>The full activity library is available with Pro.</Text><TouchableOpacity accessibilityHint="Opens subscription options" accessibilityRole="button" onPress={() => router.replace('/subscription')} style={styles.trial}><Text style={styles.trialText}>Start 14-Day Free Trial</Text></TouchableOpacity></View></SafeAreaView>;
  }

  const header = <View><View style={styles.exploreHero}><View style={styles.headerIcon}><Ionicons name="search" size={25} color="#FFFFFF" /></View><View style={styles.headerText}><Text style={styles.title}>Explore Activities</Text><Text style={styles.subtitle}>Find something that fits your day.</Text></View><Text style={styles.sparkle}>✦</Text></View><View style={styles.search}><Ionicons name="search-outline" size={20} color="#7C879B" /><TextInput accessibilityLabel="Search activities" onChangeText={setQuery} placeholder="What sounds fun today?" placeholderTextColor="#8B95A7" returnKeyType="search" style={styles.searchInput} value={query} />{query ? <TouchableOpacity accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setQuery('')}><Ionicons name="close-circle" size={21} color="#94A3B8" /></TouchableOpacity> : null}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{FILTERS.map((filter) => { const selected = filter === category; return <TouchableOpacity accessibilityLabel={`Filter by ${filterLabel(filter)}`} accessibilityRole="button" accessibilityState={{ selected }} key={filter} onPress={() => setCategory(filter)} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{filterLabel(filter)}</Text></TouchableOpacity>; })}</ScrollView></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}><TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.back}><Ionicons name="arrow-back" size={22} color="#281744" /></TouchableOpacity><Text style={styles.navTitle}>Explore</Text><View style={styles.navSpacer} /></View>
      <FlatList
        contentContainerStyle={styles.content}
        data={results}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator color="#7138DF" /><Text style={styles.loadingText}>Finding playful ideas...</Text></View> : error ? <State title="Explore needs another try" body="Check your connection and try again." action="Try Again" onPress={() => void fetchPage(false, [])} /> : <State title="No ideas found" body="Try another search or category." />}
        ListFooterComponent={results.length && hasMore ? <View style={styles.footer}><TouchableOpacity accessibilityLabel="Load 5 more activities" accessibilityRole="button" accessibilityState={{ disabled: loadingMore }} disabled={loadingMore} onPress={() => void fetchPage(true, results)} style={[styles.loadMore, loadingMore && styles.loadMoreDisabled]}>{loadingMore ? <ActivityIndicator color="#6D28D9" /> : <><Text style={styles.loadMoreText}>Load 5 More</Text><Ionicons name="arrow-down" size={17} color="#6D28D9" /></>}</TouchableOpacity></View> : null}
        renderItem={({ item }) => <ResultCard item={item} onPress={() => router.push({ pathname: '/activities/[activityId]', params: { activityId: item.id } })} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function ResultCard({ item, onPress }: { item: ActivityLibraryItem; onPress: () => void }) {
  const palette = ACTIVITY_CATEGORY_PRESENTATION[item.category];
  const metadata = [item.location, item.time].filter(Boolean).join('  ·  ');
  return <TouchableOpacity accessibilityLabel={`${item.title}. ${ACTIVITY_CATEGORY_LABELS[item.category]}. Open activity details.`} accessibilityRole="button" activeOpacity={0.88} onPress={onPress} style={styles.card}><ActivityIllustration category={item.category} compact /><View style={styles.cardText}><Text style={[styles.category, { color: palette.accent }]}>{ACTIVITY_CATEGORY_LABELS[item.category]}</Text><Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text><Text numberOfLines={2} style={styles.cardCopy}>{item.description || 'A playful moment to enjoy together.'}</Text>{metadata ? <Text numberOfLines={1} style={styles.metadata}>{metadata}</Text> : null}</View><View style={[styles.open, { backgroundColor: palette.background }]}><Ionicons name="chevron-forward" size={19} color={palette.accent} /></View></TouchableOpacity>;
}

function State({ title, body, action, onPress }: { title: string; body: string; action?: string; onPress?: () => void }) {
  return <View style={styles.state}><Ionicons name="compass-outline" size={30} color="#7C3AED" /><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>{action && onPress ? <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.retry}><Text style={styles.retryText}>{action}</Text></TouchableOpacity> : null}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9F1' }, nav: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E0EA', alignItems: 'center', justifyContent: 'center' }, navTitle: { color: '#281744', fontSize: 17, fontWeight: '900' }, navSpacer: { width: 44 }, content: { paddingHorizontal: 18, paddingBottom: 48 },
  exploreHero: { minHeight: 98, borderRadius: 27, backgroundColor: '#7138DF', paddingHorizontal: 19, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 13, overflow: 'hidden' }, headerIcon: { width: 54, height: 54, borderRadius: 19, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1 }, title: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', letterSpacing: -0.4 }, subtitle: { color: '#EEE6FF', fontSize: 14, fontWeight: '600', marginTop: 4 }, sparkle: { position: 'absolute', color: '#E8DCFF', fontSize: 26, right: 22, top: 10 },
  search: { minHeight: 53, marginTop: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD7E7', borderRadius: 18, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, color: '#111827', fontSize: 15, fontWeight: '600', paddingVertical: 12 }, chips: { gap: 9, paddingTop: 13, paddingBottom: 15 }, chip: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#DDD7E7', backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 17 }, chipSelected: { backgroundColor: '#7138DF', borderColor: '#7138DF' }, chipText: { color: '#61596D', fontWeight: '800' }, chipTextSelected: { color: '#FFFFFF' },
  card: { minHeight: 126, backgroundColor: '#FFFFFF', borderRadius: 23, borderWidth: 1, borderColor: '#E8E1EA', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, cardText: { flex: 1, minWidth: 0 }, category: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }, cardTitle: { color: '#111827', fontSize: 17, lineHeight: 21, fontWeight: '900', marginTop: 3 }, cardCopy: { color: '#667085', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 4 }, metadata: { color: '#7A8497', fontSize: 12, fontWeight: '700', marginTop: 6 }, open: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: { minHeight: 86, alignItems: 'center', justifyContent: 'center' }, loadMore: { minHeight: 50, minWidth: 170, borderRadius: 18, borderWidth: 1, borderColor: '#CDBAF3', backgroundColor: '#F8F3FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 }, loadMoreDisabled: { opacity: 0.65 }, loadMoreText: { color: '#6D28D9', fontWeight: '900' },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }, stateTitle: { color: '#20202A', fontSize: 19, textAlign: 'center', fontWeight: '900', marginTop: 10 }, stateBody: { color: '#6B7280', fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600', marginTop: 5 }, retry: { minHeight: 44, borderRadius: 16, backgroundColor: '#EEE6FF', justifyContent: 'center', paddingHorizontal: 20, marginTop: 14 }, retryText: { color: '#6D28D9', fontWeight: '900' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }, loadingText: { color: '#6B7280', fontWeight: '700', marginTop: 10 }, lock: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#EEE6FF', alignItems: 'center', justifyContent: 'center' }, lockedTitle: { color: '#26163F', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 14 }, lockedCopy: { color: '#6C617A', fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center', marginTop: 7 }, trial: { minHeight: 50, borderRadius: 18, backgroundColor: '#7138DF', justifyContent: 'center', paddingHorizontal: 23, marginTop: 18 }, trialText: { color: '#FFFFFF', fontWeight: '900' },
});
