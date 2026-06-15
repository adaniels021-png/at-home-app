import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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
  reactToParentWinPost,
  reportParentWinPost
} from '@/lib/parentWinsService';

const MODERN_REACTIONS = ['💜 Helpful', '✨ Inspiring', '🤗 Relatable'];

function AnimatedPostCard({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: index * 90,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay: index * 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function ParentWinsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<ParentWinPost[]>([]);
  const [reactionCounts, setReactionCounts] = useState<
    Record<string, Record<string, number>>
  >({});

  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(12)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const reactionScale = useRef(new Animated.Value(1)).current;

  const prompt = getTodayParentWinPrompt();

  async function loadFeed() {
    try {
      setLoading(true);

      const adminStatus = await isCurrentUserParentWinsAdmin();
      setIsAdmin(adminStatus);

      const approvedPosts = await getApprovedParentWins();
      setPosts(approvedPosts);

      const counts = await getReactionCounts(
        approvedPosts.map((post) => post.id)
      );

      setReactionCounts(counts);
    } catch (error: any) {
      Alert.alert(
        'Could not load Parent Wins',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.04,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [fabScale, screenOpacity, screenTranslateY]);

  function getTimeAgo(value: string | null) {
    if (!value) return 'Recently';

    const date = new Date(value);
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
  }

  function getPostDisplayName(post: ParentWinPost) {
    return post.display_name || 'Anonymous Parent';
  }

  function getPostMeta(post: ParentWinPost) {
    const caregiverRole = post.caregiver_role || 'Caregiver';
    const childAgeRange = post.child_age_range;
    const timeAgo = getTimeAgo(post.approved_at || post.created_at);

    if (childAgeRange) {
      return `${caregiverRole} of ${childAgeRange} • ${timeAgo}`;
    }

    return `${caregiverRole} • ${timeAgo}`;
  }

  function openShareWin() {
    router.push('/parent-support/share-win');
  }

  async function handleReaction(postId: string, reactionType: string) {
    try {
      Animated.sequence([
        Animated.timing(reactionScale, {
          toValue: 1.08,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(reactionScale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();

      await reactToParentWinPost({ postId, reactionType });
      await loadFeed();
    } catch (error: any) {
      Alert.alert('Reaction Error', error?.message || 'Could not react.');
    }
  }

  async function handleHide(postId: string) {
    try {
      await hideParentWinPost(postId);
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (error: any) {
      Alert.alert('Hide Error', error?.message || 'Could not hide this post.');
    }
  }

  function handlePostMenu(postId: string) {
    const options = [
      { text: 'Cancel', style: 'cancel' as const },
      {
        text: 'Report Post',
        onPress: () => handleReport(postId),
      },
      {
        text: isAdmin ? 'Remove From Board' : 'Hide From My View',
        style: 'destructive' as const,
        onPress: () => handleHide(postId),
      },
    ];

    Alert.alert('Post Options', 'Choose an action for this Parent Win.', options);
  }

  function handleReport(postId: string) {
    Alert.alert('Report Parent Win', 'Why are you reporting this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsafe or medical advice',
        onPress: () => submitReport(postId, 'Unsafe or medical advice'),
      },
      {
        text: 'Identifying/private information',
        onPress: () => submitReport(postId, 'Identifying/private information'),
      },
      {
        text: 'Inappropriate content',
        onPress: () => submitReport(postId, 'Inappropriate content'),
      },
    ]);
  }

  async function submitReport(postId: string, reason: string) {
    try {
      await reportParentWinPost({ postId, reason });

      Alert.alert(
        'Report Submitted',
        'Thank you. This post has been flagged for review.'
      );
    } catch (error: any) {
      Alert.alert('Report Error', error?.message || 'Could not report post.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <Animated.ScrollView
          style={{
            opacity: screenOpacity,
            transform: [{ translateY: screenTranslateY }],
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.pageHeader}>
  <TouchableOpacity
    style={styles.headerButton}
    onPress={() => router.back()}
  >
    <Ionicons name="chevron-back" size={24} color="#5B21B6" />
  </TouchableOpacity>

  <View style={styles.pageHeaderTextWrap}>
    <Text style={styles.pageHeaderTitle}>Parent Wins</Text>
    <Text style={styles.pageHeaderSubtitle}>
      Small moments are worth celebrating.
    </Text>
  </View>

  <TouchableOpacity
    style={styles.headerButton}
    onPress={() =>
      Alert.alert(
        'Notifications',
        'Community notifications will appear here soon.'
      )
    }
  >
    <Ionicons name="notifications-outline" size={21} color="#5B21B6" />
  </TouchableOpacity>
</View>

<View style={styles.heroImageCard}>
  <Image
    source={require('../../assets/images/parent-wins-hero.png')}
    style={styles.heroImage}
    resizeMode="cover"
  />

  <View style={styles.heroImageOverlay}>
    <Text style={styles.heroImageTitle}>Parent Wins</Text>

    <Text style={styles.heroImageSubtitle}>
      Read encouragement from caregivers like you.
    </Text>
  </View>
</View>

{isAdmin ? (
  <TouchableOpacity
    style={styles.adminQueueButton}
    onPress={() => router.push('/parent-support/admin-win-queue')}
  >
    <Ionicons
  name="shield-checkmark-outline"
  size={18}
  color="#D97706"
/>
    <Text style={styles.adminQueueText}>Review Pending Wins</Text>
  </TouchableOpacity>
) : null}

          <View style={styles.promptCard}>
            <View style={styles.promptTopRow}>
              <View style={styles.promptIcon}>
                <Ionicons name="sparkles-outline" size={22} color="#7C3AED" />
              </View>

              <View style={styles.promptCopy}>
                <Text style={styles.promptLabel}>Today’s Prompt</Text>
                <Text style={styles.promptText}>{prompt}</Text>
                <Text style={styles.promptHelper}>
                  No win is too small. Share something positive from today.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={openShareWin}>
              <Ionicons name="heart-circle-outline" size={21} color="#FFFEFF" />
              <Text style={styles.shareButtonText}>Share Your Win</Text>
            </TouchableOpacity>

            <View style={styles.reviewStrip}>
              <Ionicons name="leaf-outline" size={17} color="#0F766E" />
              <Text style={styles.reviewStripText}>
                Text-only posts are reviewed before appearing on the board.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Community Board</Text>
              <Text style={styles.sectionSubtitle}>
                 Encouragement from caregivers like you.
              </Text>

            <Text style={styles.boardCount}>
              {posts.length} wins shared this week
            </Text>
            </View>

            <TouchableOpacity onPress={loadFeed} style={styles.refreshChip}>
              <Ionicons name="refresh-outline" size={15} color="#5B21B6" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

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

              <Text style={styles.emptyText}>
                Be the first to submit a Parent Win. Once approved, it will
                appear here for other caregivers to encourage.
              </Text>

              <TouchableOpacity style={styles.emptyButton} onPress={openShareWin}>
                <Text style={styles.emptyButtonText}>Share the First Win</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.postList}>
  {posts.map((post, index) => (
    <AnimatedPostCard key={post.id} index={index}>
      <View style={styles.postCard}>
        <View style={styles.postAccentBar} />

        <View style={styles.postTopRow}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>

          <View style={styles.postIdentity}>
            <Text style={styles.displayName}>
              {getPostDisplayName(post)}
            </Text>

            <Text style={styles.postMeta}>{getPostMeta(post)}</Text>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => handlePostMenu(post.id)}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color="#7C3AED"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>Caregiver Win</Text>
        </View>

        <Text style={styles.quoteMark}>“</Text>

        <Text style={styles.postContent}>{post.content}</Text>

        <View style={styles.reactionWrap}>
          {MODERN_REACTIONS.map((reaction) => (
            <Animated.View
              key={reaction}
              style={{ transform: [{ scale: reactionScale }] }}
            >
              <TouchableOpacity
                style={styles.reactionButton}
                onPress={() => handleReaction(post.id, reaction)}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionText}>{reaction}</Text>

                <View style={styles.reactionCountBubble}>
                  <Text style={styles.reactionCount}>
                    {reactionCounts[post.id]?.[reaction] || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>
    </AnimatedPostCard>
  ))}
</View>
 
          )}
        </Animated.ScrollView>

        <Animated.View
          pointerEvents="box-none"
          style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={openShareWin}
            activeOpacity={0.88}
          >
            <Ionicons name="add" size={30} color="#FFFEFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },

  screen: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },

  container: {
    padding: 18,
    paddingBottom: 220,
  },

  promptCard: {
    backgroundColor: '#FFFEFF',
    borderRadius: 26,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EBDDFD',
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },

  promptTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  promptIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  promptCopy: {
    flex: 1,
  },

  promptLabel: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },

  promptText: {
    color: '#3B0764',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },

  promptHelper: {
    marginTop: 6,
    color: '#7E22CE',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  shareButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },

  shareButtonText: {
    color: '#FFFEFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 8,
  },

  reviewStrip: {
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  reviewStripText: {
    flex: 1,
    marginLeft: 8,
    color: '#0F766E',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 17,
  },

  featuredCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FEF3C7',
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },

  featuredGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(233, 213, 255, 0.7)',
    top: -80,
    right: -40,
  },

  featuredLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  featuredLabel: {
    marginLeft: 7,
    color: '#5B21B6',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  featuredText: {
    color: '#581C87',
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '900',
  },

  featuredMeta: {
    marginTop: 12,
    color: '#92400E',
    fontSize: 12,
    fontWeight: '800',
  },

 sectionHeaderRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 20,
},

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3B0764',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: '#7E22CE',
    fontSize: 12,
    fontWeight: '700',
  },

  refreshChip: {
    marginLeft: 'auto',
    backgroundColor: '#FFFEFF',
    borderWidth: 1,
    borderColor: '#EBDDFD',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  refreshText: {
    marginLeft: 4,
    color: '#5B21B6',
    fontSize: 12,
    fontWeight: '900',
  },

  centered: {
    backgroundColor: '#FFFEFF',
    borderRadius: 28,
    paddingVertical: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBDDFD',
  },

  loadingText: {
    marginTop: 10,
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFEFF',
    borderRadius: 30,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBDDFD',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 23,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#3B0764',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: '#6B21A8',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  emptyButtonText: {
    color: '#FFFEFF',
    fontWeight: '900',
    fontSize: 14,
  },

  postList: {
    gap: 22,
  },

 postCard: {
  backgroundColor: '#FFFEFF',
  borderRadius: 30,
  padding: 22,
  borderWidth: 1,
  borderColor: '#EBDDFD',
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.09,
  shadowRadius: 22,
  elevation: 4,
  overflow: 'hidden',
},

  postTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  postIdentity: {
    flex: 1,
  },

  displayName: {
  color: '#3B0764',
  fontSize: 15,
  fontWeight: '900',
},

postMeta: {
  marginTop: 3,
  color: '#7E22CE',
  fontSize: 12,
  fontWeight: '800',
},

postContent: {
  color: '#2E1065',
  fontSize: 20,
  lineHeight: 30,
  fontWeight: '900',
  marginBottom: 15,
},

  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

 reactionWrap: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 12,
},

  reactionButton: {
  flex: 1,
  minHeight: 40,
  backgroundColor: '#F5F3FF',
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#DDD6FE',
  paddingHorizontal: 10,
  paddingVertical: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

  reactionText: {
  color: '#5B21B6',
  fontSize: 11,
  fontWeight: '900',
},

  reactionCountBubble: {
  marginLeft: 6,
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: '#7C3AED',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 5,
},

  reactionCount: {
    color: '#FFFEFF',
    fontSize: 11,
    fontWeight: '900',
  },

  fabWrap: {
  position: 'absolute',
  right: 22,
  bottom: 40,
},

  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#F5E8FF',
  },

  heroImageCard: {
  height: 240,
  borderRadius: 32,
  overflow: 'hidden',
  marginBottom: 18,
  backgroundColor: '#F5E8FF',

  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 4,
},

heroImage: {
  width: '100%',
  height: '100%',
},

heroImageOverlay: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  paddingHorizontal: 22,
  paddingBottom: 22,
  paddingTop: 70,
  backgroundColor: 'rgba(15,23,42,0.42)',
},

heroImageTitle: {
  color: '#FFFEFF',
  fontSize: 26,
  fontWeight: '900',
  marginBottom: 4,
},

heroImageSubtitle: {
  color: '#F8FAFC',
  fontSize: 14,
  lineHeight: 20,
  fontWeight: '800',
},

pageHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},

headerButton: {
  width: 46,
  height: 46,
  borderRadius: 17,
  backgroundColor: '#FFFEFF',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#EBDDFD',
},

pageHeaderTextWrap: {
  flex: 1,
  paddingHorizontal: 12,
},

pageHeaderTitle: {
  color: '#3B0764',
  fontSize: 22,
  fontWeight: '900',
},

pageHeaderSubtitle: {
  marginTop: 2,
  color: '#7C3AED',
  fontSize: 12,
  fontWeight: '800',
},

adminQueueButton: {
  backgroundColor: '#FFFBEB',
  borderWidth: 1,
  borderColor: '#FDE68A',
  borderRadius: 18,
  paddingHorizontal: 14,
  paddingVertical: 10,
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  marginBottom: 14,
},

adminQueueText: {
  marginLeft: 7,
  color: '#92400E',
  fontSize: 12,
  fontWeight: '900',
},

categoryBadge: {
  alignSelf: 'flex-start',
  backgroundColor: '#F5F3FF',
  borderWidth: 1,
  borderColor: '#DDD6FE',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 5,
  marginBottom: 12,
},

categoryBadgeText: {
  color: '#6D28D9',
  fontSize: 11,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
},

boardCount: {
  marginTop: 8,
  color: '#92400E',
  fontSize: 13,
  fontWeight: '900',
},

postAccentBar: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 6,
  backgroundColor: '#8B5CF6',
},

quoteMark: {
  color: '#DDD6FE',
  fontSize: 34,
  fontWeight: '900',
  marginBottom: -14,
},
});