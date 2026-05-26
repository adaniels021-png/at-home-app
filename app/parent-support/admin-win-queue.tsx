import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

import {
  approveParentWinPost,
  getPendingParentWins,
  ParentWinPost,
  rejectParentWinPost,
} from '@/lib/parentWinsService';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getPostDisplayName(post: ParentWinPost) {
  return post.display_name || 'Anonymous Parent';
}

function getPostMeta(post: ParentWinPost) {
  const caregiverRole = post.caregiver_role || 'Caregiver';
  const childAgeRange = post.child_age_range;

  if (childAgeRange) {
    return `${caregiverRole} of ${childAgeRange}`;
  }

  return caregiverRole;
}

export default function AdminWinQueueScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pendingPosts, setPendingPosts] = useState<ParentWinPost[]>([]);

  async function loadPendingPosts() {
    try {
      setLoading(true);

      const posts = await getPendingParentWins();
      setPendingPosts(posts);
    } catch (error: any) {
      Alert.alert(
        'Admin Access Needed',
        error?.message ||
          'Could not load pending posts. Make sure your user ID is added to admin_users.'
      );
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadPendingPosts();
    }, [])
  );

  async function handleApprove(postId: string) {
    try {
      await approveParentWinPost(postId);

      setPendingPosts((current) =>
        current.filter((post) => post.id !== postId)
      );
    } catch (error: any) {
      Alert.alert('Approve Error', error?.message || 'Could not approve post.');
    }
  }

  function handleReject(postId: string) {
    Alert.alert(
      'Reject Parent Win',
      'Are you sure you want to reject this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectParentWinPost(postId);

              setPendingPosts((current) =>
                current.filter((post) => post.id !== postId)
              );
            } catch (error: any) {
              Alert.alert(
                'Reject Error',
                error?.message || 'Could not reject post.'
              );
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Admin Queue</Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadPendingPosts}
          >
            <Ionicons name="refresh-outline" size={20} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={34}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>Parent Wins Review</Text>

          <Text style={styles.heroText}>
            Approve only short, positive, safe wins. Reject anything with
            identifying details, medical advice, unsafe advice, or negativity.
          </Text>
        </View>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>Approval Checklist</Text>

          <Text style={styles.ruleText}>✓ Positive and supportive</Text>
          <Text style={styles.ruleText}>✓ No child names, school names, or locations</Text>
          <Text style={styles.ruleText}>✓ No medical claims or unsafe advice</Text>
          <Text style={styles.ruleText}>✓ No photos, documents, or private details</Text>
          <Text style={styles.ruleText}>✓ Appropriate for all caregivers</Text>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pending Posts</Text>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingPosts.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Loading pending wins...</Text>
          </View>
        ) : pendingPosts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#94A3B8" />

            <Text style={styles.emptyTitle}>No posts waiting</Text>

            <Text style={styles.emptyText}>
              Submitted Parent Wins will appear here before they go public.
            </Text>
          </View>
        ) : (
          <View style={styles.postList}>
            {pendingPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postTopRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={18} color="#FFFFFF" />
                  </View>

                  <View style={styles.identityWrap}>
                    <Text style={styles.displayName}>
                      {getPostDisplayName(post)}
                    </Text>

                    <Text style={styles.metaText}>
                      {getPostMeta(post)} • Submitted {formatDate(post.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.reviewNotice}>
                  <Ionicons
                    name="eye-outline"
                    size={16}
                    color="#7C3AED"
                  />

                  <Text style={styles.reviewNoticeText}>
                    Review display name and caregiver info before approving.
                  </Text>
                </View>

                <Text style={styles.postContent}>“{post.content}”</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(post.id)}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(post.id)}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
    borderRadius: 32,
    padding: 24,
    marginBottom: 16,
  },

  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -70,
    right: -55,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#EDE9FE',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  ruleCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 18,
  },

  ruleTitle: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },

  ruleText: {
    color: '#115E59',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 21,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },

  countBadge: {
    marginLeft: 8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  countText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
  },

  centered: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 34,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },

  postList: {
    gap: 14,
  },

  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  postTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  identityWrap: {
    flex: 1,
  },

  displayName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  metaText: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  reviewNotice: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  reviewNoticeText: {
    flex: 1,
    marginLeft: 7,
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },

  postContent: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: 16,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  approveButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rejectButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 6,
  },
});