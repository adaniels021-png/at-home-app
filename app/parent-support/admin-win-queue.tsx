import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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

function formatDate(value?: string | null) {
  if (!value) return 'Recently';

  const date = new Date(value.replace(' ', 'T'));
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
  return childAgeRange ? `${caregiverRole} of ${childAgeRange}` : caregiverRole;
}

// ==========================================
// PENDING POST CARD ITEM COMPONENT
// ==========================================
const PendingPostCard = React.memo(({ 
  item, 
  onApprove, 
  onReject, 
  processingId 
}: { 
  item: ParentWinPost; 
  onApprove: (id: string) => Promise<void>; 
  onReject: (id: string) => void;
  processingId: string | null;
}) => {
  const isCurrentProcessing = processingId === item.id;
  const isAnyProcessing = processingId !== null;

  return (
    <View style={styles.postCard}>
      <View style={styles.postTopRow}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color="#FFFFFF" />
        </View>

        <View style={styles.identityWrap}>
          <Text style={styles.displayName}>{getPostDisplayName(item)}</Text>
          <Text style={styles.metaText}>
            {getPostMeta(item)} • Submitted {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.reviewNotice}>
        <Ionicons name="eye-outline" size={16} color="#7C3AED" />
        <Text style={styles.reviewNoticeText}>
          Review display name and caregiver info before approving.
        </Text>
      </View>

      <Text style={styles.postContent}>“{item.content}”</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.approveButton, isAnyProcessing && { opacity: 0.55 }]}
          onPress={() => void onApprove(item.id)}
          disabled={isAnyProcessing}
        >
          {isCurrentProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rejectButton, isAnyProcessing && { opacity: 0.55 }]}
          onPress={() => onReject(item.id)}
          disabled={isAnyProcessing}
        >
          <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ==========================================
// MAIN SCREEN COMPONENT
// ==========================================
export default function AdminWinQueueScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPosts, setPendingPosts] = useState<ParentWinPost[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPendingPosts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const posts = await getPendingParentWins();
      setPendingPosts(posts);
    } catch (error: any) {
      console.error('Queue execution loader drop:', error);
      Alert.alert(
        'Admin Access Needed',
        error?.message || 'Could not load pending posts. Make sure your user ID is added to admin_users.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
 }, []);
 
 useFocusEffect(
  useCallback(() => {
    void loadPendingPosts();
  }, [loadPendingPosts])
);

  const handleApprove = async (postId: string) => {
    if (processingId) return;
    try {
      setProcessingId(postId);
      await approveParentWinPost(postId);
      setPendingPosts((current) => current.filter((post) => post.id !== postId));
    } catch (error: any) {
      Alert.alert('Approve Error', error?.message || 'Could not approve post.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (postId: string) => {
    if (processingId) return;
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
              setProcessingId(postId);
              await rejectParentWinPost(postId);
              setPendingPosts((current) => current.filter((post) => post.id !== postId));
            } catch (error: any) {
              Alert.alert('Reject Error', error?.message || 'Could not reject post.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
  );
};

PendingPostCard.displayName = 'PendingPostCard';

  const handleRefresh = () => {
    void loadPendingPosts(true);
  };

  // Render elements decoupled from scrolling logic to optimize memory utilization
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Queue</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => void loadPendingPosts(false)}>
          <Ionicons name="refresh-outline" size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark-outline" size={34} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>Parent Wins Review</Text>
        <Text style={styles.heroText}>
          Approve only short, positive, safe wins. Reject anything with identifying details, medical advice, unsafe advice, or negativity.
        </Text>
      </View>

      <View style={styles.ruleCard}>
        <Text style={styles.ruleTitle}>Approval Checklist</Text>
        <Text style={styles.ruleText}>✓ Positive and supportive</Text>
        <Text style={styles.ruleText}>✓ No child names, school names, or locations</Text>
        <Text style={styles.ruleText}>✓ No medical claims or unsafe advice</Text>
        <Text style={styles.ruleText}>✓ No photos, documents, or private details</Text>
        <Text style={styles.ruleText}>✓ Appropriate for all caregivers</Text>
	<Text style={styles.ruleText}>✓ No crisis, emergency, or treatment instructions</Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Pending Posts</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{pendingPosts.length}</Text>
        </View>
      </View>
    </>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="checkmark-circle-outline" size={42} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No posts waiting</Text>
        <Text style={styles.emptyText}>
          Submitted Parent Wins will appear here before they go public.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {loading && !refreshing ? (
        <View style={[styles.container, styles.centeredLoading]}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading pending wins...</Text>
        </View>
      ) : (
        <FlatList
          data={pendingPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.container}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7C3AED" />
          }
          renderItem={({ item }) => (
            <PendingPostCard
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              processingId={processingId}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 20, paddingBottom: 42 },
  centeredLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#0F172A' },
  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDD6FE' },
  heroCard: { overflow: 'hidden', backgroundColor: '#7C3AED', borderRadius: 32, padding: 24, marginBottom: 16 },
  heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.12)', top: -70, right: -55 },
  heroIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  heroText: { color: '#EDE9FE', fontSize: 15, lineHeight: 23, fontWeight: '700' },
  ruleCard: { backgroundColor: '#ECFDF5', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 18 },
  ruleTitle: { color: '#0F766E', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  ruleText: { color: '#115E59', fontSize: 13, fontWeight: '800', lineHeight: 21 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A' },
  countBadge: { marginLeft: 8, minWidth: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { color: '#7C3AED', fontSize: 12, fontWeight: '900' },
  loadingText: { marginTop: 10, color: '#64748B', fontSize: 13, fontWeight: '800' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  emptyText: { marginTop: 8, color: '#64748B', fontSize: 14, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  postCard: { backgroundColor: '#FFFFFF', borderRadius: 26, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  postTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 17, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  identityWrap: { flex: 1 },
  displayName: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  metaText: { marginTop: 3, color: '#64748B', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  reviewNotice: { backgroundColor: '#F5F3FF', borderRadius: 16, borderWidth: 1, borderColor: '#DDD6FE', padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewNoticeText: { flex: 1, marginLeft: 7, color: '#6D28D9', fontSize: 12, fontWeight: '800', lineHeight: 17 },
  postContent: { color: '#1E293B', fontSize: 16, lineHeight: 24, fontWeight: '800', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10 },
  approveButton: { flex: 1, height: 50, borderRadius: 16, backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rejectButton: { flex: 1, height: 50, borderRadius: 16, backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, marginLeft: 6 },
});
