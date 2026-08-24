import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChildSubscription as useSubscription } from '../lib/ChildSubscriptionContext';
import { hasEntitlement } from '../lib/entitlements';

import { useChild } from '../lib/SelectedChildContext';
import { canManagePecs } from '../lib/caregiverPermissions';
import { supabase } from '../lib/supabase';

type PecsCard = {
  id: string;
  user_id: string;
  child_id: string;
  label: string;
  category: string | null;
  image_url: string | null;
  is_custom: boolean | null;
  source_card_id: string | null;
  printable: boolean | null;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_CATEGORIES = [
  'All',
  'Food',
  'Drink',
  'Needs',
  'Feelings',
  'Activities',
  'People',
  'Custom',
];

const DEFAULT_PECS = [
  { id: 'default-more', label: 'More', category: 'Needs', emoji: '➕' },
  { id: 'default-help', label: 'Help', category: 'Needs', emoji: '🤝' },
  { id: 'default-all-done', label: 'All Done', category: 'Needs', emoji: '✅' },
  { id: 'default-eat', label: 'Eat', category: 'Food', emoji: '🍽️' },
  { id: 'default-drink', label: 'Drink', category: 'Drink', emoji: '🥤' },
  { id: 'default-play', label: 'Play', category: 'Activities', emoji: '🧸' },
  { id: 'default-bathroom', label: 'Bathroom', category: 'Needs', emoji: '🚽' },
  { id: 'default-break', label: 'Break', category: 'Needs', emoji: '🛑' },
  { id: 'default-happy', label: 'Happy', category: 'Feelings', emoji: '😊' },
  { id: 'default-sad', label: 'Sad', category: 'Feelings', emoji: '😢' },
  { id: 'default-mom', label: 'Mom', category: 'People', emoji: '👩' },
  { id: 'default-dad', label: 'Dad', category: 'People', emoji: '👨' },
];

export default function ManagePECS() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const role = selectedChild?.caregiver_access_role;
  const canEditPecs = canManagePecs(role);

  const [cards, setCards] = useState<PecsCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<PecsCard | null>(null);

  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('Custom');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const childName = selectedChild?.child_name || selectedChild?.name || 'your child';

  useEffect(() => {
    void loadCards();
  }, [selectedChild?.id]);

  const visibleCards = useMemo(() => {
    if (selectedCategory === 'All') return cards;
    return cards.filter((card) => (card.category || 'Custom') === selectedCategory);
  }, [cards, selectedCategory]);

  const loadCards = async () => {
    if (!selectedChild?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) throw new Error('No authenticated user.');

      const { data, error } = await supabase
        .from('pecs_cards')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const existingCards = (data || []) as PecsCard[];

      if (existingCards.length === 0) {
        await seedDefaultCards(userId, selectedChild.id);
        await loadCards();
        return;
      }

      setCards(existingCards);
    } catch (error: any) {
      console.error('Load PECS error:', error);
      Alert.alert('PECS Error', error?.message || 'Could not load PECS cards.');
    } finally {
      setLoading(false);
    }
  };

const { isPro } = useSubscription();
const hasProAccess = hasEntitlement(
  { isPro },
  'pecs_customize'
);

useEffect(() => {
  if (!hasProAccess) {
    router.replace('/subscription');
  }
}, [hasProAccess, router]);

  const seedDefaultCards = async (userId: string, childId: string) => {
    const defaultRows = DEFAULT_PECS.map((item) => ({
      user_id: userId,
      child_id: childId,
      title: item.label,
      label: item.label,
      category: item.category,
      image_url: null,
      is_custom: false,
      source_card_id: item.id,
      printable: true,
    }));

    const { error } = await supabase.from('pecs_cards').insert(defaultRows);
    if (error) throw error;
  };

  const openAddModal = () => {
    setEditingCard(null);
    setLabel('');
    setCategory('Custom');
    setLocalImageUri(null);
    setExistingImageUrl(null);
    setModalVisible(true);
  };

  const openEditModal = (card: PecsCard) => {
    setEditingCard(card);
    setLabel(card.label);
    setCategory(card.category || 'Custom');
    setLocalImageUri(null);
    setExistingImageUrl(card.image_url);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Please allow photo access to add PECS images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (uri: string): Promise<string> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) throw new Error('No authenticated user.');
    if (!selectedChild?.id) throw new Error('No child selected.');

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${selectedChild.id}/${fileName}`;

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('pecs-images')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('pecs-images').getPublicUrl(filePath);

    return data.publicUrl;
  };

  const saveCard = async () => {
    if (!selectedChild?.id) return;

    const cleanLabel = label.trim();
    const cleanCategory = category.trim() || 'Custom';

    if (!cleanLabel) {
      Alert.alert('Missing Label', 'Please enter a PECS label.');
      return;
    }

    setSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) throw new Error('No authenticated user.');

      let imageUrl = existingImageUrl;

      if (localImageUri) {
        imageUrl = await uploadImageToSupabase(localImageUri);
      }

      if (editingCard) {
        const { error } = await supabase
          .from('pecs_cards')
        .update({
  title: cleanLabel,
  label: cleanLabel,
  category: cleanCategory,
  image_url: imageUrl,
  is_custom: editingCard.is_custom ?? true,
  printable: true,
  updated_at: new Date().toISOString(),
})
          .eq('id', editingCard.id);

        if (error) throw error;
      } else {
    const { error } = await supabase.from('pecs_cards').insert({
  user_id: userId,
  child_id: selectedChild.id,
  title: cleanLabel,
  label: cleanLabel,
  category: cleanCategory,
  image_url: imageUrl,
  is_custom: true,
  source_card_id: null,
  printable: true,
});

        if (error) throw error;
      }

      setModalVisible(false);
      await loadCards();
    } catch (error: any) {
      console.error('Save PECS error:', error);
      Alert.alert('Save Error', error?.message || 'Could not save PECS card.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCard = async (card: PecsCard) => {
    Alert.alert('Delete PECS Card?', `Delete "${card.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('pecs_cards')
              .delete()
              .eq('id', card.id);

            if (error) throw error;
            await loadCards();
          } catch (error: any) {
            Alert.alert('Delete Error', error?.message || 'Could not delete card.');
          }
        },
      },
    ]);
  };

  const getDefaultEmoji = (card: PecsCard) => {
    const found = DEFAULT_PECS.find((item) => item.id === card.source_card_id);
    return found?.emoji || '🖼️';
  };

  const printCards = async () => {
    const printableCards = visibleCards.filter((card) => card.printable !== false);

    if (printableCards.length === 0) {
      Alert.alert('No Cards', 'There are no printable PECS cards in this category.');
      return;
    }

    const cardHtml = printableCards
      .map((card) => {
        const imageBlock = card.image_url
          ? `<img src="${card.image_url}" />`
          : `<div class="emoji">${getDefaultEmoji(card)}</div>`;

        return `
          <div class="card">
            <div class="imageWrap">${imageBlock}</div>
            <div class="label">${escapeHtml(card.label)}</div>
          </div>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 24px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 4px;
            }
            .subtitle {
              color: #555;
              margin-bottom: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }
            .card {
              border: 2px solid #111827;
              border-radius: 16px;
              padding: 12px;
              height: 190px;
              text-align: center;
              page-break-inside: avoid;
            }
            .imageWrap {
              height: 125px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 10px;
            }
            img {
              max-width: 100%;
              max-height: 120px;
              object-fit: contain;
              border-radius: 10px;
            }
            .emoji {
              font-size: 64px;
            }
            .label {
              font-size: 20px;
              font-weight: 800;
              color: #111827;
            }
          </style>
        </head>
        <body>
          <h1>PECS Cards</h1>
          <div class="subtitle">${escapeHtml(childName)} • ${escapeHtml(selectedCategory)}</div>
          <div class="grid">${cardHtml}</div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Created', uri);
      }
    } catch (error: any) {
      console.error('Print PECS error:', error);
      Alert.alert('Print Error', error?.message || 'Could not create printable PECS.');
    }
  };

  const renderCard = ({ item }: { item: PecsCard }) => (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <Text style={styles.cardEmoji}>{getDefaultEmoji(item)}</Text>
        )}
      </View>

      <Text style={styles.cardLabel}>{item.label}</Text>
      <Text style={styles.cardCategory}>{item.category || 'Custom'}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Ionicons name="create-outline" size={16} color="#4F46E5" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCard(item)}>
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!canEditPecs) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.restrictedCard}>
        <Ionicons name="lock-closed-outline" size={42} color="#94A3B8" />

        <Text style={styles.restrictedTitle}>Parent Access Only</Text>

        <Text style={styles.restrictedText}>
          Only the child profile owner or second parent can create, edit, or organize PECS cards.
        </Text>

        <TouchableOpacity
          style={styles.restrictedButton}
          onPress={() => router.back()}
        >
          <Text style={styles.restrictedButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="albums-outline" size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select or create a child profile to manage PECS cards.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Manage PECS</Text>
          <Text style={styles.subtitle}>Customize, upload, edit, and print cards.</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryAction} onPress={openAddModal}>
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Add PECS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.printAction} onPress={printCards}>
          <Ionicons name="print-outline" size={18} color="#4F46E5" />
          <Text style={styles.printActionText}>Print</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DEFAULT_CATEGORIES.map((item) => {
            const active = selectedCategory === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading PECS cards...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No cards yet</Text>
              <Text style={styles.emptyText}>Tap Add PECS to create one.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingCard ? 'Edit PECS Card' : 'Add PECS Card'}
            </Text>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {localImageUri || existingImageUrl ? (
                <Image
                  source={{ uri: localImageUri || existingImageUrl || '' }}
                  style={styles.previewImage}
                />
              ) : (
                <>
                  <Ionicons name="image-outline" size={34} color="#4F46E5" />
                  <Text style={styles.imagePickerText}>Choose Image</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Label</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Example: More, Juice, Grandma"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Custom"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={saveCard} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 14,
  },

  primaryAction: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 8,
  },

  printAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  printActionText: {
    color: '#4F46E5',
    fontWeight: '800',
    marginLeft: 8,
  },

  categoryWrap: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  categoryChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  categoryChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },

  categoryChipText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },

  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  columnWrap: {
    gap: 12,
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '48%',
  },

  cardImageWrap: {
    height: 110,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },

  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  cardEmoji: {
    fontSize: 48,
  },

  cardLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  cardCategory: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },

  editBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    marginLeft: 5,
    fontSize: 12,
  },

  deleteBtn: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 12,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyBox: {
    padding: 28,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },

  emptyText: {
    marginTop: 6,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },

  imagePicker: {
    height: 170,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },

  imagePickerText: {
    marginTop: 8,
    color: '#4F46E5',
    fontWeight: '800',
  },

  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  inputLabel: {
    color: '#334155',
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 8,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontWeight: '600',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },

  cancelBtnText: {
    color: '#475569',
    fontWeight: '800',
  },

  saveBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },

  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  restrictedCard: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
},

restrictedTitle: {
  marginTop: 14,
  fontSize: 22,
  fontWeight: '900',
  color: '#0F172A',
},

restrictedText: {
  marginTop: 8,
  color: '#64748B',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
  lineHeight: 21,
},

restrictedButton: {
  marginTop: 22,
  backgroundColor: '#4F46E5',
  borderRadius: 18,
  paddingVertical: 13,
  paddingHorizontal: 22,
},

restrictedButtonText: {
  color: '#FFFFFF',
  fontWeight: '900',
},
});
