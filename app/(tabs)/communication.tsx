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
  type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { useChildSubscription as useSubscription } from '../../lib/ChildSubscriptionContext';
import { hasEntitlement } from '../../lib/entitlements';
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
  const { isPro: subscriptionIsPro } = useSubscription();
  const isPro = hasEntitlement({ isPro: subscriptionIsPro }, 'pecs_customize');

  const itemWidth: DimensionValue = layout.isLargeTablet
  ? '23.5%'
  : layout.isTablet
    ? '31%'
    : '48%';

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

  if (card.visualType) {
    const key = card.visualType as keyof typeof PECS_IMAGES;
    if (PECS_IMAGES[key]) return PECS_IMAGES[key];
  }

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

  const logUsage = async (
    cardId: string,
    action: 'card_tap' | 'phrase_speak' | 'favorite_toggle'
  ) => {
    if (!selectedChild?.id) return;

    setUsageMap((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] || 0) + 1,
    }));

    const log = {
      child_id: selectedChild.id,
      card_id: cardId,
      action,
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
    await logUsage(card.id, 'card_tap');
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
    await logUsage('phrase', 'phrase_speak');
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
    router.push('/subscription' as any);
    return;
  }

  router.push('/manage-pecs' as any);
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
            <View style={styles.heroBubbleOne} />
            <View style={styles.heroBubbleTwo} />

            <View style={styles.heroIconCircle}>
              <Ionicons
                name="chatbubbles-outline"
                size={28}
                color="rgba(255,255,255,0.30)"
              />
            </View>

            <TouchableOpacity
              style={styles.printIconBtn}
              onPress={() => {
                if (!isPro) {
                  router.push('/subscription' as any);
                  return;
                }

                setShowPrintModal(true);
              }}
            >
              <Ionicons name="print-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.heroEyebrow}>PECS VISUALS</Text>
            <Text style={styles.heroTitle}>Communication Support</Text>

            <Text style={styles.heroSubtitle}>
              Build a sentence, hear cards aloud, and use visuals during everyday routines.
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Ionicons name="albums-outline" size={16} color="#4F46E5" />
              <Text style={styles.statText}>{allCards.length} Cards</Text>
            </View>

            <View style={styles.statPill}>
              <Ionicons name="star-outline" size={16} color="#F59E0B" />
              <Text style={styles.statText}>{favoriteIds.length} Saved</Text>
            </View>

            <View style={styles.statPill}>
              <Ionicons name="volume-high-outline" size={16} color="#0F766E" />
              <Text style={styles.statText}>Voice</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.voiceSettingsCard}
            onPress={() => router.push('/settings/voice-settings' as any)}
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

          <View style={styles.phraseBox}>
            <View style={styles.phraseHeaderRow}>
              <Text style={styles.phraseTitle}>Build a Sentence</Text>
              <Text style={styles.phraseCount}>{phrase.length} selected</Text>
            </View>

            <View style={styles.phraseChipWrap}>
              {phrase.length ? (
                phrase.map((word, index) => (
                  <TouchableOpacity
                    key={`${word}-${index}`}
                    style={styles.phraseChip}
                    onPress={() =>
                      setPhrase((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Text style={styles.phraseChipText}>{word}</Text>
                    <Ionicons name="close-circle" size={16} color="#64748B" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.phrasePlaceholder}>
                  Tap a card to hear it. Long press to add and speak.
                </Text>
              )}
            </View>

            <View style={styles.quickActionRow}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => setPhrase([])}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={styles.quickActionText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, styles.quickActionPrimary]}
                onPress={() => void speakPhrase()}
              >
                <Ionicons name="volume-high-outline" size={18} color="#FFFFFF" />
                <Text style={styles.quickActionPrimaryText}>Speak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => {
                  if (!isPro) {
                    router.push('/subscription' as any);
                    return;
                  }

                  setMode('favorites');
                }}
              >
                <Ionicons name="star-outline" size={18} color="#F59E0B" />
                <Text style={styles.quickActionText}>Saved</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modeRow}>
            {(['library', 'smart', 'favorites', 'public'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.modeChip, mode === item && styles.modeChipActive]}
                onPress={async () => {
                  try {
                    await Haptics.selectionAsync();
                  } catch {}

                  if (!isPro && (item === 'smart' || item === 'favorites')) {
                    router.push('/subscription' as any);
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
                  onPress={async () => {
                    try {
                      await Haptics.selectionAsync();
                    } catch {}

                    setSelectedCategory(category);
                  }}
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

          <View style={styles.tapHelperStrip}>
            <Ionicons name="hand-left-outline" size={14} color="#4F46E5" />
            <Text style={styles.tapHelperText}>Tap to hear • Long press to add</Text>
          </View>

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
                    activeOpacity={0.86}
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
                        size={17}
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
                        size={17}
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
                          size={30}
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

         <View style={styles.manageSection}>
  <Text style={styles.manageSectionTitle}>Customize Cards</Text>

  <TouchableOpacity
    style={[styles.manageCard, !isPro && styles.manageCardLocked]}
    onPress={handleManagePecsPress}
    activeOpacity={0.86}
  >
    <View style={styles.manageIconWrap}>
      <Ionicons
        name={isPro ? 'create-outline' : 'lock-closed'}
        size={20}
        color="#4F46E5"
      />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.manageTitle}>
        {isPro ? 'Manage PECS' : 'Unlock PECS'}
      </Text>

      <Text style={styles.manageSubtitle}>
        {isPro
          ? 'Edit cards, add visuals, and customize communication supports.'
          : 'Upgrade to customize communication cards.'}
      </Text>
    </View>

    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
    paddingTop: 14,
    paddingBottom: 190,
  },
  contentInner: {
    width: '100%',
  },
  hero: {
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    padding: 18,
    paddingRight: 72,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.20,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  printIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    padding: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  heroEyebrow: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 7,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 8,
    color: '#E0E7FF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  voiceSettingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  voiceIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voiceTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  voiceSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    backgroundColor: '#E2E8F0',
    padding: 5,
    borderRadius: 20,
  },
  modeChip: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 15,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 0,
  },
  modeChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  modeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  modeTextActive: {
    color: '#4F46E5',
  },
  phraseBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  phraseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  phraseTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  phraseCount: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  categoryRow: {
    paddingBottom: 8,
    marginBottom: 4,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#312E81',
    borderColor: '#312E81',
  },
  categoryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  tapHelperStrip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  tapHelperText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
 card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 11,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  minHeight: 190, // was 208
  position: 'relative',
  shadowColor: '#0F172A',
  shadowOpacity: 0.045,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
},
  favoriteIcon: {
    position: 'absolute',
    top: 11,
    right: 11,
    zIndex: 10,
    width: 29,
    height: 29,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printSelectIcon: {
    position: 'absolute',
    top: 11,
    left: 11,
    zIndex: 10,
    width: 29,
    height: 29,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printSelectIconActive: {
    backgroundColor: '#4F46E5',
  },
  visualPanel: {
  height: 98, // was 108
  borderRadius: 20,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '#E0E7FF',
},
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardHelper: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontWeight: '900',
    fontSize: 16,
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '600',
  },
  manageCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 15,
  borderWidth: 1,
  borderColor: '#E0E7FF',
  flexDirection: 'row',
  alignItems: 'center',
  shadowColor: '#0F172A',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
},
  manageCardLocked: {
    opacity: 0.9,
  },
  manageIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  manageTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  manageSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
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
    borderRadius: 26,
    padding: 20,
    width: '88%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
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
    fontWeight: '900',
    color: '#4F46E5',
  },
  modalCancel: {
    marginTop: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#DC2626',
    fontWeight: '900',
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
    borderRadius: 32,
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
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E7FF',
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
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
  },
  expandedRepeatBtn: {
    marginTop: 18,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
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
    borderRadius: 20,
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
  phraseChipWrap: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  phraseChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  phraseChipText: {
    color: '#312E81',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 6,
  },
  phrasePlaceholder: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionPrimary: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  quickActionText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  quickActionPrimaryText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroBubbleOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.10)',
    right: -46,
    top: -52,
  },
  heroBubbleTwo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    left: -30,
    bottom: -38,
  },
  heroIconCircle: {
    position: 'absolute',
    right: 34,
    top: 42,
    width: 56,
    height: 56,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  statText: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    textAlign: 'center',
  },

  manageSection: {
  marginTop: 4,
  marginBottom: 20,
},

manageSectionTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#0F172A',
  marginBottom: 10,
},
});
