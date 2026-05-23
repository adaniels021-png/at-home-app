import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FeedCategory = 'encouragement' | 'hard-day' | 'overload' | 'burnout';

type FeedItem = {
  id: string;
  category: FeedCategory;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
};

type CategoryFilter = {
  id: FeedCategory | 'all';
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const categoryFilters: CategoryFilter[] = [
  { id: 'all', title: 'All', icon: 'grid-outline' },
  { id: 'encouragement', title: 'Encouragement', icon: 'heart-outline' },
  { id: 'hard-day', title: 'Hard Day', icon: 'rainy-outline' },
  { id: 'overload', title: 'Overload', icon: 'flash-outline' },
  { id: 'burnout', title: 'Burnout', icon: 'battery-dead-outline' },
];

const feedItems: FeedItem[] = [
  {
    id: 'encouragement-1',
    category: 'encouragement',
    title: 'You are doing enough',
    text:
      'A hard moment does not erase the love, patience, and effort you give every day.',
    icon: 'heart-circle-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
  {
    id: 'hard-day-1',
    category: 'hard-day',
    title: 'Lower the expectations tonight',
    text:
      'After a difficult day, it is okay to simplify. Focus on safety, connection, and getting through the evening.',
    icon: 'moon-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    id: 'overload-1',
    category: 'overload',
    title: 'You can be overstimulated too',
    text:
      'Noise, touch, crying, and constant decision-making can overload your nervous system. Your needs matter too.',
    icon: 'flash-outline',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
  },
  {
    id: 'burnout-1',
    category: 'burnout',
    title: 'Burnout is not weakness',
    text:
      'Feeling exhausted or emotionally numb can be a sign that you have been carrying too much for too long.',
    icon: 'battery-dead-outline',
    color: '#0F766E',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  {
    id: 'encouragement-2',
    category: 'encouragement',
    title: 'Repair matters more than perfection',
    text:
      'You do not need to respond perfectly every time. A calm repair after a hard moment still teaches safety.',
    icon: 'sparkles-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
  {
    id: 'hard-day-2',
    category: 'hard-day',
    title: 'Do not process everything right away',
    text:
      'After a meltdown or rough moment, your body may need quiet before reflection. You can think about patterns later.',
    icon: 'time-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    id: 'overload-2',
    category: 'overload',
    title: 'Reduce input for yourself',
    text:
      'If possible, lower the sound, dim the lights, unclench your jaw, and give yourself one minute without extra words.',
    icon: 'volume-low-outline',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
  },
  {
    id: 'burnout-2',
    category: 'burnout',
    title: 'Micro-rest counts',
    text:
      'Rest does not have to be a full day off. A quiet drink, deep breath, or five-minute pause still matters.',
    icon: 'leaf-outline',
    color: '#0F766E',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  {
    id: 'encouragement-3',
    category: 'encouragement',
    title: 'Progress is not always visible',
    text:
      'Some days the win is not a new skill. Sometimes the win is staying connected through something hard.',
    icon: 'trending-up-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
  {
    id: 'hard-day-3',
    category: 'hard-day',
    title: 'Reconnect before correcting',
    text:
      'When everyone is calmer, a small moment of connection can help more than a long explanation.',
    icon: 'people-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    id: 'overload-3',
    category: 'overload',
    title: 'Touched out is real',
    text:
      'If your body feels done with touch, that does not make you unloving. It means your nervous system needs space.',
    icon: 'hand-left-outline',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
  },
  {
    id: 'burnout-3',
    category: 'burnout',
    title: 'Ask for less from yourself',
    text:
      'You may not need a better attitude. You may need fewer demands, more support, and a softer plan.',
    icon: 'water-outline',
    color: '#0F766E',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
];

export default function SupportFeedScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<
    FeedCategory | 'all'
  >('all');

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const visibleItems = useMemo(() => {
    if (selectedCategory === 'all') return feedItems;

    return feedItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  function toggleFavorite(id: string) {
    setFavoriteIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Parent Support</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="sparkles-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Support Feed</Text>

          <Text style={styles.heroText}>
            Encouragement, hard-day reminders, sensory overload support, and
            burnout-friendly guidance for caregivers.
          </Text>
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.sectionTitle}>What kind of support do you need?</Text>

          <View style={styles.filterGrid}>
            {categoryFilters.map((filter) => {
              const selected = selectedCategory === filter.id;

              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setSelectedCategory(filter.id)}
                  style={[
                    styles.filterButton,
                    selected && styles.filterButtonSelected,
                  ]}
                >
                  <Ionicons
                    name={filter.icon}
                    size={18}
                    color={selected ? '#FFFFFF' : '#BE123C'}
                  />

                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.filterTextSelected,
                    ]}
                  >
                    {filter.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.feedList}>
          {visibleItems.map((item) => {
            const favorite = favoriteIds.includes(item.id);

            return (
              <View
                key={item.id}
                style={[
                  styles.feedCard,
                  {
                    backgroundColor: item.bg,
                    borderColor: item.border,
                  },
                ]}
              >
                <View style={styles.feedTopRow}>
                  <View style={styles.feedIcon}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.favoriteButton,
                      favorite && {
                        backgroundColor: item.color,
                        borderColor: item.color,
                      },
                    ]}
                    onPress={() => toggleFavorite(item.id)}
                  >
                    <Ionicons
                      name={favorite ? 'heart' : 'heart-outline'}
                      size={18}
                      color={favorite ? '#FFFFFF' : item.color}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.feedTitle, { color: item.color }]}>
                  {item.title}
                </Text>

                <Text style={styles.feedText}>{item.text}</Text>

                {favorite && (
                  <View style={styles.savedNote}>
                    <Ionicons name="bookmark-outline" size={16} color={item.color} />

                    <Text style={[styles.savedNoteText, { color: item.color }]}>
                      Saved as a helpful reminder
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.bottomCard}>
          <Ionicons name="heart-outline" size={22} color="#BE123C" />

          <View style={{ flex: 1 }}>
            <Text style={styles.bottomTitle}>Gentle reminder</Text>

            <Text style={styles.bottomText}>
              This feed is here to support you, not give you another thing to
              complete. Take what helps and leave the rest.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF1F2',
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backText: {
    marginLeft: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#BE123C',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
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
    color: '#FFE4E6',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  filterButton: {
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  filterButtonSelected: {
    backgroundColor: '#BE123C',
    borderColor: '#BE123C',
  },

  filterText: {
    marginLeft: 7,
    color: '#BE123C',
    fontSize: 13,
    fontWeight: '900',
  },

  filterTextSelected: {
    color: '#FFFFFF',
  },

  feedList: {
    gap: 14,
  },

  feedCard: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
  },

  feedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  feedIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 8,
  },

  feedText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },

  savedNote: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  savedNoteText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '900',
  },

  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bottomTitle: {
    marginLeft: 10,
    color: '#BE123C',
    fontSize: 15,
    fontWeight: '900',
  },

  bottomText: {
    marginLeft: 10,
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});