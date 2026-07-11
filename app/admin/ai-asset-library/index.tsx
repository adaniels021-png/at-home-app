import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AiAssetItem,
  AiAssetType,
  AiAssetUsageScope,
  deleteAiAsset,
  listAiAssets,
  searchAiAssets,
} from '../../../lib/aiAssetLibrary';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const SIDE_PADDING = 18;
const CARD_WIDTH = (width - SIDE_PADDING * 2 - CARD_GAP * 2) / 3;

const TYPE_FILTERS: Array<{ label: string; value: AiAssetType | 'all' }> = [
  { label: 'All Assets', value: 'all' },
  { label: 'Objects', value: 'object' },
  { label: 'Characters', value: 'character' },
  { label: 'People', value: 'person' },
  { label: 'Actions', value: 'action' },
  { label: 'Emotions', value: 'emotion' },
  { label: 'Backgrounds', value: 'background' },
  { label: 'Icons', value: 'icon' },
  { label: 'PECS', value: 'pecs' },
];

const QUICK_FILTERS: Array<{
  label: string;
  value: AiAssetUsageScope;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  { label: 'Worksheets', value: 'worksheets', icon: 'document-text-outline', color: '#22C55E' },
  { label: 'Lessons', value: 'lessons', icon: 'book-outline', color: '#3B82F6' },
  { label: 'Activities', value: 'activities', icon: 'extension-puzzle-outline', color: '#F97316' },
  { label: 'Routine Defaults', value: 'routine_defaults', icon: 'time-outline', color: '#7C3AED' },
  { label: 'Pecs Defaults', value: 'pecs_defaults', icon: 'grid-outline', color: '#EC4899' },
  { label: 'Calm Tools', value: 'calm_tools', icon: 'heart-outline', color: '#14B8A6' },
  { label: 'App Visuals', value: 'app_visuals', icon: 'phone-portrait-outline', color: '#8B5CF6' },
];

function label(value: string) {
  return value.replace(/_/g, ' ');
}

function formatCount(count: number) {
  return count.toLocaleString();
}


export default function AiAssetLibraryScreen() {
  const router = useRouter();

  const [items, setItems] = useState<AiAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<AiAssetType | 'all'>('all');
  const [selectedUsage, setSelectedUsage] = useState<AiAssetUsageScope | 'all'>('all');
  const [selectedAsset, setSelectedAsset] = useState<AiAssetItem | null>(null);
  const [actionAsset, setActionAsset] = useState<AiAssetItem | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = selectedType === 'all' || item.asset_type === selectedType;
      const matchesUsage = selectedUsage === 'all' || Boolean(item.usage_scope?.includes(selectedUsage));
      return matchesType && matchesUsage;
    });
  }, [items, selectedType, selectedUsage]);

  async function loadItems(query = searchText) {
    try {
      const data = query.trim() ? await searchAiAssets(query.trim()) : await listAiAssets();
      setItems(data);
    } catch (error: any) {
      Alert.alert('Load Error', error?.message || 'Could not load AI assets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadItems('');
  }, []);

  function clearFilters() {
    setSearchText('');
    setSelectedType('all');
    setSelectedUsage('all');
    setLoading(true);
    void loadItems('');
  }

  function confirmDelete(item: AiAssetItem) {
    Alert.alert('Delete Asset?', `Delete "${item.title}" from the AI Asset Library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAiAsset(item);
            setSelectedAsset(null);
            await loadItems(searchText);
          } catch (error: any) {
            Alert.alert('Delete Error', error?.message || 'Could not delete asset.');
          }
        },
      },
    ]);
  }

  function renderTypeFilter(filter: { label: string; value: AiAssetType | 'all' }) {
    const active = selectedType === filter.value;
    return (
      <TouchableOpacity key={filter.value} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setSelectedType(filter.value)}>
        <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{filter.label}</Text>
      </TouchableOpacity>
    );
  }

  function renderQuickFilter(filter: { label: string; value: AiAssetUsageScope; icon: keyof typeof Ionicons.glyphMap; color: string }) {
    const active = selectedUsage === filter.value;
    return (
      <TouchableOpacity key={filter.value} style={[styles.quickFilter, active && styles.quickFilterActive]} onPress={() => setSelectedUsage(active ? 'all' : filter.value)}>
        <Ionicons name={filter.icon} size={20} color={active ? '#FFFFFF' : filter.color} />
        <Text style={[styles.quickFilterText, active && styles.quickFilterTextActive]}>{filter.label}</Text>
      </TouchableOpacity>
    );
  }

  function renderAsset({ item }: { item: AiAssetItem }) {
    const firstTag = item.primary_category || item.primary_skill || item.asset_type || 'Asset';
    const secondTag = item.tags?.[0] || item.usage_scope?.[0] || '';

    return (
      <TouchableOpacity style={styles.assetCard} activeOpacity={0.9} onPress={() => setSelectedAsset(item)}>
        <View style={styles.assetImageWrap}>
          <Image source={{ uri: item.image_url }} style={styles.assetImage} />
          <View style={styles.pngBadge}>
            <Text style={styles.pngBadgeText}>PNG</Text>
          </View>
        </View>

        <View style={styles.assetBody}>
          <View style={styles.assetTitleRow}>
            <Text style={styles.assetTitle} numberOfLines={2}>{item.title}</Text>
            <TouchableOpacity
  style={styles.moreButton}
  onPress={(event) => {
    event.stopPropagation();
    setActionAsset(item);
  }}
>
  <Ionicons name="ellipsis-horizontal" size={18} color="#2E1065" />
</TouchableOpacity>
          </View>
          <Text style={styles.assetKey} numberOfLines={1}>{item.asset_key}</Text>
          <View style={styles.assetTagRow}>
            {firstTag ? <View style={styles.miniTag}><Text style={styles.miniTagText} numberOfLines={1}>{label(firstTag)}</Text></View> : null}
            {secondTag ? <View style={styles.miniTag}><Text style={styles.miniTagText} numberOfLines={1}>{label(secondTag)}</Text></View> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function HeaderComponent() {
    return (
      <View>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={22} color="#7C3AED" />
            <TextInput
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                void loadItems(text);
              }}
              style={styles.searchInput}
              placeholder="Search assets by name, key, tag, skill..."
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={clearFilters}>
            <Ionicons name="funnel-outline" size={23} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroll}>
          {TYPE_FILTERS.map(renderTypeFilter)}
        </ScrollView>

        <View style={styles.quickTitleRow}>
          <Text style={styles.quickTitle}>Quick Filters</Text>
          <TouchableOpacity onPress={() => setSelectedUsage('all')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>{QUICK_FILTERS.map(renderQuickFilter)}</View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>{formatCount(filteredItems.length)} assets</Text>
          <TouchableOpacity style={styles.sortButton}>
            <Text style={styles.sortText}>Sort: Recently Added</Text>
            <Ionicons name="chevron-down" size={16} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#7C3AED" />
            <Text style={styles.loadingText}>Loading assets...</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#7C3AED" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>AI CONTENT STUDIO</Text>
          <Text style={styles.title}>AI Asset Library</Text>
          <Text style={styles.subtitle}>Manage every reusable visual asset used throughout ABA at Home.</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/admin/ai-asset-generator')}>
          <Ionicons name="add" size={28} color="#7C3AED" />
          <Text style={styles.addButtonText}>Add Asset</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderAsset}
        numColumns={3}
        columnWrapperStyle={styles.assetGridRow}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<HeaderComponent />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadItems(searchText); }} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyBox}>
            <Ionicons name="images-outline" size={38} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No assets found</Text>
            <Text style={styles.emptyText}>Try clearing filters or create your first asset.</Text>
          </View>
        ) : null}
      />

      <Modal visible={Boolean(selectedAsset)} transparent animationType="slide" onRequestClose={() => setSelectedAsset(null)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedAsset?.title || 'Asset Preview'}</Text>
                <Text style={styles.modalSubtitle}>{selectedAsset?.asset_key || 'No key'}</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedAsset(null)}>
                <Ionicons name="close" size={22} color="#2E1065" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewCard}>
              {selectedAsset?.image_url ? <Image source={{ uri: selectedAsset.image_url }} style={styles.previewImage} /> : null}
            </View>

            {selectedAsset ? (
              <ScrollView style={styles.detailScroll}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{label(selectedAsset.asset_type || 'object')}</Text>
                </View>
                {selectedAsset.primary_category ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Category</Text><Text style={styles.detailValue}>{selectedAsset.primary_category}</Text></View> : null}
                {selectedAsset.primary_skill ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Skill</Text><Text style={styles.detailValue}>{selectedAsset.primary_skill}</Text></View> : null}
                {selectedAsset.usage_scope?.length ? <View style={styles.detailCard}><Text style={styles.detailLabel}>Usage</Text><Text style={styles.detailParagraph}>{selectedAsset.usage_scope.map(label).join(', ')}</Text></View> : null}
                {selectedAsset.tags?.length ? <View style={styles.detailCard}><Text style={styles.detailLabel}>Tags</Text><Text style={styles.detailParagraph}>{selectedAsset.tags.join(', ')}</Text></View> : null}
                {selectedAsset.description ? <View style={styles.detailCard}><Text style={styles.detailLabel}>Description</Text><Text style={styles.detailParagraph}>{selectedAsset.description}</Text></View> : null}
              </ScrollView>
            ) : null}

            {selectedAsset ? (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.copyButton} onPress={() => Alert.alert('Asset Key', selectedAsset.asset_key)}>
                  <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.copyButtonText}>Show Key</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteModalButton} onPress={() => confirmDelete(selectedAsset)}>
                  <Ionicons name="trash-outline" size={20} color="#991B1B" />
                </TouchableOpacity>
              </View>
            ) : null}
          </SafeAreaView>
        </View>

          </Modal> 
          
      <Modal
  visible={Boolean(actionAsset)}
  transparent
  animationType="fade"
  onRequestClose={() => setActionAsset(null)}
>
  <TouchableOpacity
    style={styles.actionBackdrop}
    activeOpacity={1}
    onPress={() => setActionAsset(null)}
  >
    <View style={styles.actionSheet}>
      <Text style={styles.actionTitle}>
        {actionAsset?.title || 'Asset Actions'}
      </Text>

      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => {
          if (!actionAsset) return;
          setSelectedAsset(actionAsset);
          setActionAsset(null);
        }}
      >
        <Ionicons name="eye-outline" size={20} color="#7C3AED" />
        <Text style={styles.actionText}>View Details</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => {
          if (!actionAsset) return;
          Alert.alert('Asset Key', actionAsset.asset_key);
          setActionAsset(null);
        }}
      >
        <Ionicons name="copy-outline" size={20} color="#7C3AED" />
        <Text style={styles.actionText}>Copy / Show Asset Key</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => {
          setActionAsset(null);
          router.push('/admin/ai-asset-generator');
        }}
      >
        <Ionicons name="refresh-outline" size={20} color="#10B981" />
        <Text style={styles.actionText}>Regenerate</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionRow, styles.actionDangerRow]}
        onPress={() => {
          if (!actionAsset) return;
          const itemToDelete = actionAsset;
          setActionAsset(null);
          confirmDelete(itemToDelete);
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#991B1B" />
        <Text style={styles.actionDangerText}>Delete</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, gap: 12 },
  backButton: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9D5FF', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  eyebrow: { color: '#7C3AED', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: '#2E1065', fontSize: 26, fontWeight: '900' },
  subtitle: { marginTop: 3, color: '#64748B', fontSize: 13, fontWeight: '800', lineHeight: 18 },
  addButton: {
  width: 54,
  height: 54,
  borderRadius: 18,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E9D5FF',
  alignItems: 'center',
  justifyContent: 'center',
},
addButtonText: {
  display: 'none',
},
  content: { paddingHorizontal: SIDE_PADDING, paddingBottom: 130 },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 14 },
  searchBox: { flex: 1, height: 58, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9D5FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchInput: { flex: 1, marginLeft: 9, color: '#0F172A', fontWeight: '800', fontSize: 13 },
  filterButton: { width: 58, height: 58, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9D5FF', alignItems: 'center', justifyContent: 'center' },
  typeScroll: { gap: 8, paddingBottom: 18 },
  typeChip: { height: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9D5FF', justifyContent: 'center' },
  typeChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  typeChipText: { color: '#7C3AED', fontSize: 13, fontWeight: '900' },
  typeChipTextActive: { color: '#FFFFFF' },
  quickTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  quickTitle: { flex: 1, color: '#2E1065', fontSize: 16, fontWeight: '900' },
  seeAllText: { color: '#7C3AED', fontSize: 12, fontWeight: '900' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  quickFilter: { minWidth: (width - SIDE_PADDING * 2 - 8) / 2, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9D5FF', paddingHorizontal: 12, paddingVertical: 10 },
  quickFilterActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  quickFilterText: { marginLeft: 8, color: '#1E1B4B', fontSize: 12, fontWeight: '900' },
  quickFilterTextActive: { color: '#FFFFFF' },
  countRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  countText: { flex: 1, color: '#64748B', fontSize: 13, fontWeight: '900' },
  sortButton: { flexDirection: 'row', alignItems: 'center' },
  sortText: { color: '#7C3AED', fontSize: 12, fontWeight: '900', marginRight: 3 },
  loadingBox: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#64748B', fontWeight: '900' },
  assetGridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  assetCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E9D5FF', overflow: 'hidden' },
  assetImageWrap: { height: CARD_WIDTH, backgroundColor: '#F0FDFA', margin: 7, borderRadius: 12, overflow: 'hidden' },
  assetImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  pngBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  pngBadgeText: { color: '#16A34A', fontSize: 9, fontWeight: '900' },
  assetBody: { paddingHorizontal: 9, paddingBottom: 10 },
  assetTitleRow: { flexDirection: 'row', alignItems: 'center' },
  assetTitle: { flex: 1, color: '#111827', fontSize: 12, fontWeight: '900', marginRight: 4 },
  assetKey: { marginTop: 3, color: '#64748B', fontSize: 11, fontWeight: '700' },
  assetTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 7 },
  miniTag: { maxWidth: '100%', backgroundColor: '#F3E8FF', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4 },
  miniTagText: { color: '#7C3AED', fontSize: 9, fontWeight: '900' },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E9D5FF', marginTop: 12 },
  emptyTitle: { marginTop: 10, color: '#2E1065', fontSize: 18, fontWeight: '900' },
  emptyText: { marginTop: 5, color: '#64748B', textAlign: 'center', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '92%', backgroundColor: '#FFF7ED', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 18, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: '#2E1065', fontSize: 24, fontWeight: '900' },
  modalSubtitle: { marginTop: 2, color: '#64748B', fontSize: 13, fontWeight: '900' },
  modalClose: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E9D5FF' },
  previewCard: { height: 360, backgroundColor: '#FFFFFF', borderRadius: 26, borderWidth: 1, borderColor: '#E9D5FF', overflow: 'hidden', marginBottom: 14 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  detailScroll: { maxHeight: 250 },
  detailRow: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E9D5FF', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailCard: { backgroundColor: '#F5F3FF', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#DDD6FE', marginBottom: 8 },
  detailLabel: { color: '#64748B', fontSize: 12, fontWeight: '900' },
  detailValue: { color: '#2E1065', fontSize: 12, fontWeight: '900' },
  detailParagraph: { marginTop: 6, color: '#475569', fontSize: 13, fontWeight: '800', lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  copyButton: { flex: 1, backgroundColor: '#7C3AED', borderRadius: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  copyButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, marginLeft: 7 },
  deleteModalButton: { width: 54, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  moreButton: {
  width: 26,
  height: 26,
  borderRadius: 13,
  alignItems: 'center',
  justifyContent: 'center',
},

actionBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(15, 23, 42, 0.35)',
  justifyContent: 'flex-end',
  padding: 18,
},

actionSheet: {
  backgroundColor: '#FFFFFF',
  borderRadius: 26,
  padding: 18,
  borderWidth: 1,
  borderColor: '#E9D5FF',
  marginBottom: 18,
},

actionTitle: {
  color: '#2E1065',
  fontSize: 18,
  fontWeight: '900',
  marginBottom: 10,
},

actionRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},

actionText: {
  marginLeft: 12,
  color: '#1E1B4B',
  fontSize: 15,
  fontWeight: '800',
},

actionDangerRow: {
  borderBottomWidth: 0,
},

actionDangerText: {
  marginLeft: 12,
  color: '#991B1B',
  fontSize: 15,
  fontWeight: '900',
},
});
