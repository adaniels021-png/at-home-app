import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getApprovedParentWins,
  getReactionCounts,
  getTodayParentWinPrompt,
  hideParentWinPost,
  isCurrentUserParentWinsAdmin,
  ParentWinPost,
  POSITIVE_REACTIONS,
  reactToParentWinPost,
  reportParentWinPost,
} from '@/lib/parentWinsService';

// ==========================================
// MEMOIZED POST CARD (Isolates Animations & Reactions)
// ==========================================
const ParentWinPostCard = React.memo(({
  post,
  isAdmin,
  reactions,
  onReactionPress,
  onMenuPress,
  getPostMeta,
  getPostDisplayName
}: {
  post: ParentWinPost;
  isAdmin: boolean;
  reactions: Record<string, number>;
  onReactionPress: (postId: string, reaction: string) => void;
  onMenuPress: (postId: string) => void;
  getPostMeta: (post: ParentWinPost) => string;
  getPostDisplayName: (post: ParentWinPost) => string;
}) => {
  const localReactionScale = useRef(new Animated.Value(1)).current;

  const handlePress = (reaction: string) => {
    Animated.sequence([
      Animated.timing(localReactionScale, { toValue: 1.14, duration: 80, useNativeDriver: true }),
      Animated.timing(localReactionScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
    
    onReactionPress(post.id, reaction);
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postTopRow}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color="#FFFFFF" />
        </View>

        <View style={styles.postIdentity}>
          <Text style={styles.displayName}>{getPostDisplayName(post)}</Text>
          <Text style={styles.postMeta}>{getPostMeta(post)}</Text>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={() => onMenuPress(post.id)}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postContent}>“{post.content}”</Text>
      <Text style={styles.reactionPrompt}>Send a little encouragement</Text>

      <View style={styles.reactionWrap}>
        {POSITIVE_REACTIONS.map((reaction) => (
          <Animated.View key={reaction} style={{ transform: [{ scale: localReactionScale }] }}>
            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => handlePress(reaction)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionText}>{reaction}</Text>
              <View style={styles.reactionCountBubble}>
                <Text style={styles.reactionCount}>{reactions?.[reaction] || 0}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

// ==========================================
// MAIN SCREEN COMPONENT
// ==========================================
export default function ParentWinsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<ParentWinPost[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});

  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(12)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  const prompt = getTodayParentWinPrompt();

  const loadFeed = async (isRefresher = false) => {
    try {
      if (isRefresher) setRefreshing(true);
      else setLoading(true);

      const [adminStatus, approvedPosts] = await Promise.all([
        isCurrentUserParentWinsAdmin(),
        getApprovedParentWins()
      ]);

      setIsAdmin(adminStatus);
      setPosts(approvedPosts);

      const counts = await getReactionCounts(approvedPosts.map((post) => post.id));
      setReactionCounts(counts);
    } catch (error: any) {
      console.error('Parent Wins data pipe crashed:', error);
      Alert.alert('Could not load Parent Wins', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(fabScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [fabScale, screenOpacity, screenTranslateY]);

  const getTimeAgo = useCallback((value: string | null) => {
    if (!value) return 'Recently';

    // Parse explicitly to protect against UTC boundary string offsets
    const date = new Date(value.replace(' ', 'T'));
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';

    return `${diffDays} days ago`;
  }, []);

  const getPostDisplayName = useCallback((post: ParentWinPost) => {
    return post.display_name || 'Anonymous Parent';
  }, []);

  const getPostMeta = useCallback((post: ParentWinPost) => {
    const caregiverRole = post.caregiver_role || 'Caregiver';
    const childAgeRange = post.child_age_range;
    const timeAgo = getTimeAgo(post.approved_at || post.created_at);

    return childAgeRange 
      ? `${caregiverRole} of ${childAgeRange} • ${timeAgo}`
      : `${caregiverRole} • ${timeAgo}`;
  }, [getTimeAgo]);

  // Optimistic layout update pattern handles reactions instantly on the UI
const handleReaction = useCallback(async (postId: string, reactionType: string) => {
  setReactionCounts((current) => {
    const postReactions = current[postId] || {};
    const currentCount = postReactions[reactionType] || 0;

    return {
      ...current,
      [postId]: {
        ...postReactions,
        [reactionType]: currentCount + 1,
      },
    };
  });

  try {
    await reactToParentWinPost({ postId, reactionType });

    const updatedCounts = await getReactionCounts([postId]);

    setReactionCounts((current) => ({
      ...current,
      [postId]: updatedCounts[postId] || current[postId] || {},
    }));
  } catch (error: any) {
    console.warn('Reaction update failed:', error);

    try {
      const updatedCounts = await getReactionCounts([postId]);

      setReactionCounts((current) => ({
        ...current,
        [postId]: updatedCounts[postId] || current[postId] || {},
      }));
    } catch {
      setReactionCounts((current) => {
        const postReactions = current[postId] || {};
        const currentCount = postReactions[reactionType] || 1;

        return {
          ...current,
          [postId]: {
            ...postReactions,
            [reactionType]: Math.max(0, currentCount - 1),
          },
        };
      });
    }
  }
}, []);

  const handleHide = async (postId: string) => {
    try {
      await hideParentWinPost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (error: any) {
      Alert.alert('Hide Error', 'Could not hide this post.');
    }
  };

  const submitReport = async (postId: string, reason: string) => {
    try {
      await reportParentWinPost({ postId, reason });
      Alert.alert('Report Submitted', 'Thank you. This post has been flagged for review.');
    } catch (error: any) {
      Alert.alert('Report Error', 'Could not process report flagging.');
    }
  };

  const handleReport = (postId: string) => {
    Alert.alert('Report Parent Win', 'Why are you reporting this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unsafe or medical advice', onPress: () => void submitReport(postId, 'Unsafe or medical advice') },
      { text: 'Identifying/private information', onPress: () => void submitReport(postId, 'Identifying/private information') },
      { text: 'Inappropriate content', onPress: () => void submitReport(postId, 'Inappropriate content') },
    ]);
  };

  const handlePostMenu = (postId: string) => {
    Alert.alert('Post Options', 'Choose an action for this Parent Win.', [
      { text: 'Cancel', style: 'cancel' as const },
      { text: 'Report Post', onPress: () => handleReport(postId) },
      {
        text: isAdmin ? 'Remove From Board' : 'Hide From My View',
        style: 'destructive' as const,
        onPress: () => void handleHide(postId),
      },
    ]);
  };

  const featuredPost = posts.length > 0 ? posts[0] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <Animated.ScrollView
          style={{ opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          {/* Header Hero Area */}
          <View style={styles.hero}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />
            <View style={styles.heroTopRow}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={22} color="#5B21B6" />
              </TouchableOpacity>
              <View style={styles.heroTitleWrap}>
                <Text style={styles.heroTitle}>Parent Wins</Text>
                <Text style={styles.heroSubtitle}>Real progress. Real families. Real support.</Text>
              </View>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert('Notifications', 'Community notifications arriving soon.')}>
                  <Ionicons name="notifications-outline" size={20} color="#5B21B6" />
                </TouchableOpacity>
                {isAdmin && (
                  <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/parent-support/admin-win-queue')}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#D97706" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Daily Prompt Card */}
          <View style={styles.promptCard}>
            <View style={styles.promptTopRow}>
              <View style={styles.promptIcon}>
                <Ionicons name="sparkles-outline" size={22} color="#7C3AED" />
              </View>
              <View style={styles.promptCopy}>
                <Text style={styles.promptLabel}>Today’s Prompt</Text>
                <Text style={styles.promptText}>{prompt}</Text>
                <Text style={styles.promptHelper}>No win is too small. Share something positive from today.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={() => router.push('/parent-support/share-win')}>
              <Ionicons name="heart-circle-outline" size={21} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share Your Win</Text>
            </TouchableOpacity>
            <View style={styles.reviewStrip}>
              <Ionicons name="leaf-outline" size={17} color="#0F766E" />
              <Text style={styles.reviewStripText}>Text-only posts are reviewed before appearing on the board.</Text>
            </View>
          </View>

          {/* Highlight Featured Spotlight */}
          {featuredPost && (
            <View style={styles.featuredCard}>
              <View style={styles.featuredGlow} />
              <View style={styles.featuredLabelRow}>
                <Ionicons name="star" size={16} color="#7C3AED" />
                <Text style={styles.featuredLabel}>Today’s Inspiring Win</Text>
              </View>
              <Text style={styles.featuredText}>“{featuredPost.content}”</Text>
              <Text style={styles.featuredMeta}>{getPostMeta(featuredPost)}</Text>
            </View>
          )}

          {/* Subtitle Section Row */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Community Board</Text>
              <Text style={styles.sectionSubtitle}>Encouragement from caregivers like you.</Text>
            </View>
            <TouchableOpacity onPress={() => void loadFeed(true)} style={styles.refreshChip} disabled={refreshing}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#5B21B6" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={15} color="#5B21B6" />
                  <Text style={styles.refreshText}>Refresh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Core Dynamic Content Conditionals */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Loading gentle wins...</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles-outline" size={34} color="#7C3AED" />
              </View>
              <Text style={styles.emptyTitle}>No approved wins yet</Text>
              <Text style={styles.emptyText}>Be the first to submit a Parent Win. Once approved, it will appear here for other caregivers to encourage.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/parent-support/share-win')}>
                <Text style={styles.emptyButtonText}>Share the First Win</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.postList}>
              {posts.map((post) => (
                <ParentWinPostCard
                  key={post.id}
                  post={post}
                  isAdmin={isAdmin}
                  reactions={reactionCounts[post.id] || {}}
                  onReactionPress={handleReaction}
                  onMenuPress={handlePostMenu}
                  getPostMeta={getPostMeta}
                  getPostDisplayName={getPostDisplayName}
                />
              ))}
            </View>
          )}
        </Animated.ScrollView>

        {/* Floating Context Primary Action FAB */}
        <Animated.View pointerEvents="box-none" style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/parent-support/share-win')} activeOpacity={0.85}>
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7ED' },
  screen: { flex: 1, backgroundColor: '#FFF7ED' },
  container: { padding: 18, paddingBottom: 120 },
  hero: { position: 'relative', overflow: 'hidden', borderRadius: 30, padding: 16, marginBottom: 14, backgroundColor: '#F5E8FF', borderWidth: 1, borderColor: '#E9D5FF', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 2 },
  heroGlowOne: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255, 251, 235, 0.9)', top: -80, left: -50 },
  heroGlowTwo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(196, 181, 253, 0.35)', bottom: -70, right: -40 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.82)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(221, 214, 254, 0.9)' },
  heroTitleWrap: { flex: 1, paddingHorizontal: 12 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#4C1D95', letterSpacing: -0.4 },
  heroSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '700', color: '#7C3AED' },
  heroActions: { flexDirection: 'row', gap: 8 },
  promptCard: { backgroundColor: '#FFFFFF', borderRadius: 26, padding: 15, borderWidth: 1, borderColor: '#E9D5FF', marginBottom: 14, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 2 },
  promptTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  promptIcon: { width: 46, height: 46, borderRadius: 18, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  promptCopy: { flex: 1 },
  promptLabel: { color: '#7C3AED', fontSize: 13, fontWeight: '900', marginBottom: 5 },
  promptText: { color: '#3B0764', fontSize: 17, fontWeight: '900', lineHeight: 23 },
  promptHelper: { marginTop: 6, color: '#7E22CE', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  shareButton: { height: 50, borderRadius: 18, backgroundColor: '#7C3AED', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 3 },
  shareButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, marginLeft: 8 },
  reviewStrip: { marginTop: 10, backgroundColor: '#ECFDF5', borderRadius: 15, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center' },
  reviewStripText: { flex: 1, marginLeft: 8, color: '#0F766E', fontWeight: '800', fontSize: 12, lineHeight: 17 },
  featuredCard: { position: 'relative', overflow: 'hidden', backgroundColor: '#FEF3C7', borderRadius: 28, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#92400E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 },
  featuredGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(233, 213, 255, 0.7)', top: -80, right: -40 },
  featuredLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featuredLabel: { marginLeft: 7, color: '#5B21B6', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  featuredText: { color: '#581C87', fontSize: 19, lineHeight: 28, fontWeight: '900' },
  featuredMeta: { marginTop: 12, color: '#92400E', fontSize: 12, fontWeight: '800' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#3B0764', letterSpacing: -0.3 },
  sectionSubtitle: { marginTop: 3, color: '#7E22CE', fontSize: 12, fontWeight: '700' },
  refreshChip: {
  marginLeft: 'auto',
  paddingHorizontal: 12, height: 32, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9D5FF', borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  refreshText: { marginLeft: 4, color: '#5B21B6', fontSize: 12, fontWeight: '900' },
  centered: { backgroundColor: '#FFFFFF', borderRadius: 28, paddingVertical: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E9D5FF' },
  loadingText: { marginTop: 10, color: '#7C3AED', fontSize: 13, fontWeight: '800' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 30, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: '#E9D5FF', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  emptyIcon: { width: 62, height: 62, borderRadius: 23, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDD6FE' },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '900', color: '#3B0764', textAlign: 'center' },
  emptyText: { marginTop: 8, color: '#6B21A8', fontSize: 14, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  emptyButton: { marginTop: 16, backgroundColor: '#7C3AED', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  postList: { gap: 14 },
  postCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 17, borderWidth: 1, borderColor: '#E9D5FF', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 2 },
  postTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 17, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  postIdentity: { flex: 1 },
  displayName: { color: '#3B0764', fontSize: 14, fontWeight: '900' },
  postMeta: { marginTop: 3, color: '#7E22CE', fontSize: 12, fontWeight: '700' },
  menuButton: { width: 36, height: 36, borderRadius: 14, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center' },
  postContent: { color: '#3B0764', fontSize: 18, lineHeight: 27, fontWeight: '800', marginBottom: 15 },
  reactionPrompt: { color: '#7E22CE', fontSize: 12, fontWeight: '900', marginBottom: 9 },
  reactionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reactionButton: { backgroundColor: '#F5F3FF', borderRadius: 999, borderWidth: 1, borderColor: '#DDD6FE', paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  reactionText: { color: '#5B21B6', fontSize: 12, fontWeight: '900' },
  reactionCountBubble: { marginLeft: 6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  reactionCount: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  fabWrap: { position: 'absolute', right: 22, bottom: 26 },
  fab: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 6, borderWidth: 3, borderColor: '#F5E8FF' },
});