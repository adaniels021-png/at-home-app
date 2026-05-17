import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { PrintGridSize, printPecsCards } from '../../lib/communicationPrint';
import {
  flushPecsUsageQueue,
  loadOfflineCards,
  loadOfflineFavorites,
  loadOfflineUsage,
  queuePecsUsage,
  saveOfflineCards,
  saveOfflineFavorites,
  saveOfflineUsage,
} from '../../lib/offlineCommunication';
import { PECS_IMAGES } from '../../lib/pecsImages';
import { useResponsiveLayout } from '../../lib/responsive';
import { speakWithSavedVoice } from '../../lib/speechSettings';
import { supabase } from '../../lib/supabase';

type CardCategory =
  | 'Needs'
  | 'Food'
  | 'Feelings'
  | 'Actions'
  | 'People'
  | 'Places'
  | 'Routine'
  | 'Custom';

type Card = {
  id: string;
  label: string;
  helperText: string;
  category: CardCategory;
  icon?: keyof typeof Ionicons.glyphMap;
  visualType?: string;
  imageUrl?: string | null;
  isCustom?: boolean;
  source_card_id?: string | null;
};

type UsageMap = Record<string, number>;

const CATEGORIES: CardCategory[] = [
  'Needs',
  'Food',
  'Feelings',
  'Actions',
  'People',
  'Places',
  'Routine',
  'Custom',
];

const PUBLIC_MODE_LABELS = [
  'Help',
  'Potty',
  'Break',
  'All Done',
  'Eat',
  'Drink',
  'Happy',
  'Sad',
  'Mad',
  'Go',
  'Wait',
  'Mom',
  'Yes',
  'No',
];

const BUILT_IN_CARDS: Card[] = [
  { id: '1', label: 'Help', helperText: 'I need help', category: 'Needs', icon: 'hand-left', visualType: 'help' },
  { id: '2', label: 'Potty', helperText: 'I need potty', category: 'Needs', icon: 'body', visualType: 'potty' },
  { id: '3', label: 'Break', helperText: 'I need a break', category: 'Needs', icon: 'pause-circle', visualType: 'break' },
  { id: '4', label: 'All Done', helperText: 'All done', category: 'Needs', icon: 'checkmark-circle', visualType: 'all_done' },
  { id: '5', label: 'More', helperText: 'I want more', category: 'Needs', icon: 'add-circle', visualType: 'more' },
  { id: '6', label: 'Stop', helperText: 'Stop please', category: 'Needs', icon: 'stop-circle', visualType: 'stop' },
  { id: '7', label: 'Eat', helperText: 'I am hungry', category: 'Food', icon: 'restaurant', visualType: 'eat' },
  { id: '8', label: 'Drink', helperText: 'I want a drink', category: 'Food', icon: 'water', visualType: 'drink' },
  { id: '9', label: 'Snack', helperText: 'I want a snack', category: 'Food', icon: 'pizza', visualType: 'snack' },
  { id: '10', label: 'Happy', helperText: 'I am happy', category: 'Feelings', icon: 'happy', visualType: 'happy' },
  { id: '11', label: 'Sad', helperText: 'I am sad', category: 'Feelings', icon: 'sad', visualType: 'sad' },
  { id: '12', label: 'Mad', helperText: 'I am mad', category: 'Feelings', icon: 'flame', visualType: 'mad' },
  { id: '13', label: 'Scared', helperText: 'I am scared', category: 'Feelings', icon: 'alert-circle', visualType: 'scared' },
  { id: '14', label: 'Go', helperText: 'I want to go', category: 'Actions', icon: 'arrow-forward-circle', visualType: 'go' },
  { id: '15', label: 'Wait', helperText: 'Please wait', category: 'Actions', icon: 'time', visualType: 'wait' },
  { id: '16', label: 'Play', helperText: 'I want to play', category: 'Actions', icon: 'game-controller', visualType: 'play' },
  { id: '17', label: 'Sit', helperText: 'Sit down', category: 'Actions', icon: 'bed', visualType: 'sit' },
  { id: '18', label: 'Mom', helperText: 'I want mom', category: 'People', icon: 'person', visualType: 'mom' },
  { id: '19', label: 'Dad', helperText: 'I want dad', category: 'People', icon: 'person-outline', visualType: 'dad' },
  { id: '20', label: 'Teacher', helperText: 'I want teacher', category: 'People', icon: 'school', visualType: 'teacher' },
  { id: '21', label: 'Home', helperText: 'I want to go home', category: 'Places', icon: 'home', visualType: 'home' },
  { id: '22', label: 'Store', helperText: 'Go to the store', category: 'Places', icon: 'cart', visualType: 'store' },
  { id: '23', label: 'Car', helperText: 'Go in the car', category: 'Places', icon: 'car', visualType: 'car' },
  { id: '24', label: 'Park', helperText: 'Go to the park', category: 'Places', icon: 'leaf', visualType: 'park' },
  { id: '25', label: 'Wake Up', helperText: 'Wake up time', category: 'Routine', icon: 'sunny', visualType: 'wake_up' },
  { id: '26', label: 'Brush Teeth', helperText: 'Brush teeth', category: 'Routine', icon: 'sparkles', visualType: 'brush_teeth' },
  { id: '27', label: 'Bath', helperText: 'Bath time', category: 'Routine', icon: 'water-outline', visualType: 'bath' },
  { id: '28', label: 'Bedtime', helperText: 'Time for bed', category: 'Routine', icon: 'moon', visualType: 'bedtime' },
  { id: '29', label: 'Book', helperText: 'I want a book', category: 'Actions', icon: 'book', visualType: 'book' },
  { id: '30', label: 'iPad / Tablet', helperText: 'I want the tablet', category: 'Actions', icon: 'tablet-portrait', visualType: 'tablet' },
  { id: '31', label: 'Toys', helperText: 'I want toys', category: 'Actions', icon: 'cube', visualType: 'toys' },
  { id: '32', label: 'Bubbles', helperText: 'I want bubbles', category: 'Actions', icon: 'aperture', visualType: 'bubbles' },
  { id: '33', label: 'Music', helperText: 'I want music', category: 'Actions', icon: 'musical-notes', visualType: 'music' },
  { id: '34', label: 'Swing', helperText: 'I want to swing', category: 'Actions', icon: 'move', visualType: 'swing' },
  { id: '35', label: 'School', helperText: 'I want school', category: 'Places', icon: 'school', visualType: 'school' },
  { id: '36', label: 'Bus', helperText: 'I want the bus', category: 'Places', icon: 'bus', visualType: 'bus' },
  { id: '37', label: 'Yes', helperText: 'Yes', category: 'Needs', icon: 'checkmark-circle', visualType: 'yes' },
  { id: '38', label: 'No', helperText: 'No', category: 'Needs', icon: 'close-circle', visualType: 'no' },
  { id: '39', label: 'Art', helperText: 'I want art', category: 'Actions', icon: 'color-palette', visualType: 'art' },
  { id: '40', label: 'Open', helperText: 'Open please', category: 'Actions', icon: 'open-outline', visualType: 'open' },
  { id: '41', label: 'Quiet', helperText: 'Quiet please', category: 'Needs', icon: 'volume-mute', visualType: 'quiet' },
  { id: '42', label: 'Sleep', helperText: 'I want sleep', category: 'Routine', icon: 'moon', visualType: 'sleep' },
];

function buildSmartCards(cards: Card[], favorites: string[], usage: UsageMap) {
  return [...cards]
    .map((card) => ({
      ...card,
      score: (usage[card.id] || 0) + (favorites.includes(card.id) ? 50 : 0),
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 12);
}

export default function CommunicationScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();

  const itemWidth = layout.isLargeTablet ? '23.5%' : layout.isTablet ? '31%' : '48%';

  const [mode, setMode] = useState<'library' | 'smart' | 'favorites' | 'public'>('library');
  const [selectedCategory, setSelectedCategory] = useState<CardCategory>('Needs');
  const [phrase, setPhrase] = useState<string[]>([]);
  const [customCards, setCustomCards] = useState<Card[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [usageMap, setUsageMap] = useState<UsageMap>({});
  const [loading, setLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPrintCardIds, setSelectedPrintCardIds] = useState<string[]>([]);
  const [expandedCard, setExpandedCard] = useState<Card | null>(null);

  const allCards = useMemo(() => {
    const overrides: Record<string, Card> = {};

    customCards.forEach((card) => {
      if (card.source_card_id) overrides[card.source_card_id] = card;
    });

    const mergedBuiltIns = BUILT_IN_CARDS.map((card) => {
      const override = overrides[card.id];

      return override
        ? {
            ...card,
            label: override.label || card.label,
            helperText: override.helperText || card.helperText,
            imageUrl: override.imageUrl || null,
          }
        : card;
    });

    return [...mergedBuiltIns, ...customCards.filter((card) => !card.source_card_id)];
  }, [customCards]);

  const smartCards = useMemo(
    () => buildSmartCards(allCards, favoriteIds, usageMap),
    [allCards, favoriteIds, usageMap]
  );

  const visibleCards = useMemo(() => {
    if (mode === 'smart') return smartCards;
    if (mode === 'favorites') return allCards.filter((card) => favoriteIds.includes(card.id));

    if (mode === 'public') {
      return allCards.filter(
        (card) =>
          PUBLIC_MODE_LABELS.includes(card.label) ||
          (card.isCustom && card.category === 'Needs')
      );
    }

    return allCards.filter((card) => card.category === selectedCategory);
  }, [allCards, favoriteIds, mode, selectedCategory, smartCards]);

  const getCardImageSource = (card: Card) => {
    if (card.imageUrl) return { uri: card.imageUrl };
    if (card.visualType && PECS_IMAGES[card.visualType]) return PECS_IMAGES[card.visualType];
    return null;
  };

  const loadAll = useCallback(async () => {
    if (!selectedChild?.id) return;

    setLoading(true);

    try {
      const [cardsResult, favoritesResult, usageResult] = await Promise.all([
        supabase.from('pecs_cards').select('*').eq('child_id', selectedChild.id),
        supabase.from('pecs_favorites').select('card_id').eq('child_id', selectedChild.id),
        supabase.from('pecs_card_usage').select('card_id').eq('child_id', selectedChild.id),
      ]);

      if (cardsResult.error) throw cardsResult.error;
      if (favoritesResult.error) throw favoritesResult.error;
      if (usageResult.error) throw usageResult.error;

      const mappedCards: Card[] = (cardsResult.data || []).map((item: any) => ({
        id: `custom-${item.id}`,
        label: item.title || item.label || 'PECS',
        helperText: item.helper_text || item.title || item.label || 'PECS',
        category: (item.category || 'Custom') as CardCategory,
        imageUrl: item.image_url || null,
        icon: 'chatbubble',
        isCustom: true,
        source_card_id: item.source_card_id || null,
      }));

      const favIds = (favoritesResult.data || []).map((row: any) => row.card_id);

      const usage: UsageMap = {};
      (usageResult.data || []).forEach((row: any) => {
        if (!row.card_id) return;
        usage[row.card_id] = (usage[row.card_id] || 0) + 1;
      });

      setCustomCards(mappedCards);
      setFavoriteIds(favIds);
      setUsageMap(usage);

      await saveOfflineCards(selectedChild.id, mappedCards);
      await saveOfflineFavorites(selectedChild.id, favIds);
      await saveOfflineUsage(selectedChild.id, usage);
      await flushPecsUsageQueue(selectedChild.id);
    } catch (error) {
      console.error('Communication load fallback:', error);

      const [offlineCards, offlineFavs, offlineUsage] = await Promise.all([
        loadOfflineCards(selectedChild.id),
        loadOfflineFavorites(selectedChild.id),
        loadOfflineUsage(selectedChild.id),
      ]);

      setCustomCards(offlineCards || []);
      setFavoriteIds(offlineFavs || []);
      setUsageMap(offlineUsage || {});
    } finally {
      setLoading(false);
    }
  }, [selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll])
  );

  const logUsage = async (cardId: string, actionType: string) => {
    if (!selectedChild?.id) return;

    setUsageMap((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] || 0) + 1,
    }));

    const log = {
      child_id: selectedChild.id,
      card_id: cardId,
      action_type: actionType,
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('pecs_card_usage').insert(log);
      if (error) throw error;
    } catch {
      await queuePecsUsage(selectedChild.id, log);
    }
  };

  const handleCardPress = async (card: Card) => {
    setPhrase((prev) => [...prev, card.helperText || card.label]);
    await logUsage(card.id, 'tap');
  };

  const openExpandedCard = async (card: Card) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setExpandedCard(card);
    await speakWithSavedVoice(card.helperText || card.label);
  };

  const speakPhrase = async () => {
    if (!phrase.length) return;

    const text = phrase.join(' ');
    await speakWithSavedVoice(text);
    await logUsage('phrase', 'speak_phrase');
  };

  const toggleFavorite = async (cardId: string) => {
    if (!selectedChild?.id) return;

    const isFavorite = favoriteIds.includes(cardId);
    const nextFavorites = isFavorite
      ? favoriteIds.filter((id) => id !== cardId)
      : [...favoriteIds, cardId];

    setFavoriteIds(nextFavorites);
    await saveOfflineFavorites(selectedChild.id, nextFavorites);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('pecs_favorites')
          .delete()
          .eq('child_id', selectedChild.id)
          .eq('card_id', cardId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('pecs_favorites').insert({
          child_id: selectedChild.id,
          card_id: cardId,
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Favorite sync failed:', error);
    }
  };

  const togglePrintSelection = (cardId: string) => {
    setSelectedPrintCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };

  const runPrint = async (gridSize: PrintGridSize) => {
    setShowPrintModal(false);

    const cardsToPrint =
      selectedPrintCardIds.length > 0
        ? visibleCards.filter((card) => selectedPrintCardIds.includes(card.id))
        : visibleCards;

    if (!cardsToPrint.length) {
      Alert.alert('No Cards', 'There are no PECS cards to print.');
      return;
    }

    try {
      await printPecsCards({
        cards: cardsToPrint,
        gridSize,
        childName:
          selectedChild?.child_name ||
          selectedChild?.name ||
          selectedChild?.first_name ||
          'Child',
        category: mode === 'library' ? selectedCategory : mode,
        getCardImageSource,
      });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', 'Could not create the PECS printout.');
    }
  };

  const handleManagePecsPress = () => {
    if (!isPro) {
      router.push('/subscription');
      return;
    }

    router.push('/manage-pecs');
  };

  const expandedImageSource = expandedCard ? getCardImageSource(expandedCard) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            alignItems: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, { maxWidth: layout.maxContentWidth }]}>
          <View style={styles.hero}>
            <TouchableOpacity
              style={styles.printIconBtn}
              onPress={() => {
                if (!isPro) {
                  router.push('/subscription');
                  return;
                }

                setShowPrintModal(true);
              }}
            >
              <Ionicons name="print-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.heroTitle}>Communication</Text>

            <Text style={styles.heroSubtitle}>
              Build phrases, use PECS visuals, and support real-world communication.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.voiceSettingsCard}
            onPress={() => router.push('/settings/voice-settings')}
          >
            <View style={styles.voiceIconWrap}>
              <Ionicons name="volume-high-outline" size={20} color="#4F46E5" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.voiceTitle}>Communication Voice</Text>
              <Text style={styles.voiceSubtitle}>
                Choose a clearer voice for PECS speech.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.modeRow}>
            {(['library', 'smart', 'favorites', 'public'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.modeChip, mode === item && styles.modeChipActive]}
                onPress={() => {
                  if (!isPro && (item === 'smart' || item === 'favorites')) {
                    router.push('/subscription');
                    return;
                  }

                  setMode(item);
                }}
              >
                <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                  {item === 'smart' ? 'SMART' : item.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.phraseBox}>
            <Text style={styles.phraseText}>
              {phrase.length ? phrase.join(' ') : 'Tap cards to enlarge and use'}
            </Text>

            <View style={styles.phraseActions}>
              <TouchableOpacity onPress={() => setPhrase([])}>
                <Ionicons name="trash" size={21} color="#0F172A" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => void speakPhrase()}>
                <Ionicons name="volume-high" size={21} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'library' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category && styles.categoryTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#4F46E5"
              style={{ marginTop: 30 }}
            />
          ) : (
            <View style={styles.grid}>
              {visibleCards.map((card) => {
                const isFavorite = favoriteIds.includes(card.id);
                const isSelectedForPrint = selectedPrintCardIds.includes(card.id);
                const imageSource = getCardImageSource(card);

                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.card, { width: itemWidth }]}
                    activeOpacity={0.9}
                    onPress={() => void openExpandedCard(card)}
                    onLongPress={async () => {
                      await handleCardPress(card);
                      await speakWithSavedVoice(card.helperText || card.label);
                    }}
                  >
                    <TouchableOpacity
                      style={styles.favoriteIcon}
                      onPress={() => void toggleFavorite(card.id)}
                    >
                      <Ionicons
                        name={isFavorite ? 'star' : 'star-outline'}
                        size={18}
                        color="#F59E0B"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.printSelectIcon,
                        isSelectedForPrint && styles.printSelectIconActive,
                      ]}
                      onPress={() => togglePrintSelection(card.id)}
                    >
                      <Ionicons
                        name={isSelectedForPrint ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={isSelectedForPrint ? '#FFFFFF' : '#4F46E5'}
                      />
                    </TouchableOpacity>

                    <View style={styles.visualPanel}>
                      {imageSource ? (
                        <Image
                          source={imageSource}
                          style={styles.cardImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons
                          name={card.icon || 'chatbubble'}
                          size={32}
                          color="#4F46E5"
                        />
                      )}
                    </View>

                    <Text style={styles.cardLabel}>{card.label}</Text>
                    <Text style={styles.cardHelper}>{card.helperText}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!loading && visibleCards.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No PECS cards found</Text>
              <Text style={styles.emptyText}>Try another mode or category.</Text>
            </View>
          )}

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Therapy Tip</Text>
            <Text style={styles.tipText}>
              Tap a PECS card to enlarge it. Long press to quickly add and speak.
            </Text>
          </View>

          <View style={styles.bottomWrap}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push('/communication/parent-training-hub')}
            >
              <Ionicons name="school" size={18} color="#FFFFFF" />
              <Text style={styles.navText}>Parent Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: '#10B981' }]}
              onPress={() => router.push('/communication/sign-guide')}
            >
              <Ionicons name="hand-left" size={18} color="#FFFFFF" />
              <Text style={styles.navText}>Baby Signs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navBtn,
                { backgroundColor: isPro ? '#0F172A' : '#CBD5E1' },
              ]}
              onPress={handleManagePecsPress}
            >
              <Ionicons
                name={isPro ? 'create-outline' : 'lock-closed'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.navText}>
                {isPro ? 'Manage PECS' : 'Unlock PECS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showPrintModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrintModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Print Layout</Text>

            {(['2x2', '3x3', '4x4'] as PrintGridSize[]).map((size) => (
              <TouchableOpacity
                key={size}
                style={styles.modalOption}
                onPress={() => void runPrint(size)}
              >
                <Text style={styles.modalOptionText}>{size}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowPrintModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!expandedCard}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedCard(null)}
      >
        <View style={styles.expandedOverlay}>
          <View style={styles.expandedCard}>
            <TouchableOpacity
              style={styles.expandedCloseBtn}
              onPress={() => setExpandedCard(null)}
            >
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>

            {expandedCard && (
              <>
                <View style={styles.expandedImageWrap}>
                  {expandedImageSource ? (
                    <Image
                      source={expandedImageSource}
                      style={styles.expandedImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons
                      name={expandedCard.icon || 'chatbubble'}
                      size={96}
                      color="#4F46E5"
                    />
                  )}
                </View>

                <Text style={styles.expandedLabel}>{expandedCard.label}</Text>
                <Text style={styles.expandedHelper}>{expandedCard.helperText}</Text>

                <TouchableOpacity
                  style={styles.expandedRepeatBtn}
                  onPress={() =>
                    void speakWithSavedVoice(
                      expandedCard.helperText || expandedCard.label
                    )
                  }
                >
                  <Ionicons name="volume-high-outline" size={20} color="#4F46E5" />
                  <Text style={styles.expandedRepeatText}>Hear Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.expandedSpeakBtn}
                  onPress={async () => {
                    try {
                      await Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success
                      );
                    } catch {}

                    await handleCardPress(expandedCard);
                    await speakWithSavedVoice(
                      expandedCard.helperText || expandedCard.label
                    );
                    setExpandedCard(null);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.expandedSpeakText}>Add to Sentence</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingTop: 20,
    paddingBottom: 44,
  },
  contentInner: {
    width: '100%',
  },
  hero: {
    backgroundColor: '#4F46E5',
    borderRadius: 26,
    padding: 20,
    paddingRight: 58,
    marginBottom: 16,
    position: 'relative',
  },
  printIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    padding: 8,
    borderRadius: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginTop: 8,
    color: '#E0E7FF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  voiceSettingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voiceTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '900',
  },
  voiceSubtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modeChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  modeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  phraseBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phraseText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    minHeight: 36,
  },
  phraseActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryRow: {
    paddingBottom: 10,
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  categoryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 225,
    position: 'relative',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  printSelectIcon: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printSelectIconActive: {
    backgroundColor: '#4F46E5',
  },
  visualPanel: {
    height: 120,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardHelper: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748B',
  },
  tipBox: {
    marginTop: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#312E81',
  },
  tipText: {
    marginTop: 6,
    color: '#4338CA',
    lineHeight: 20,
    fontWeight: '600',
  },
  bottomWrap: {
    marginTop: 18,
    gap: 12,
  },
  navBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    width: '88%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  modalCancel: {
    marginTop: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  expandedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  expandedCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
  },
  expandedCloseBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    padding: 8,
    marginBottom: 8,
  },
  expandedImageWrap: {
    width: '100%',
    height: 300,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
  },
  expandedImage: {
    width: '100%',
    height: '100%',
  },
  expandedLabel: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  expandedHelper: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  expandedRepeatBtn: {
    marginTop: 18,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedRepeatText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '900',
    fontSize: 15,
  },
  expandedSpeakBtn: {
    marginTop: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedSpeakText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
});