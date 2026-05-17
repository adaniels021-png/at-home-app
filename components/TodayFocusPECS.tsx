import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { PECS_IMAGES } from '../lib/pecsImages';
import { useChild } from '../lib/SelectedChildContext';
import { supabase } from '../lib/supabase';

type UsageMap = Record<string, number>;

type CommCard = {
  id: string;
  label: string;
  helperText: string;
  imageUrl?: string | null;
  visualType?: string;
};

export default function TodayFocusPECS() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CommCard[]>([]);
  const [usage, setUsage] = useState<UsageMap>({});
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!selectedChild?.id) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [cardsRes, usageRes, favRes] = await Promise.all([
        supabase
          .from('pecs_cards')
          .select('id, title, image_url, icon_name, category')
          .eq('child_id', selectedChild.id),

        supabase
          .from('pecs_card_usage')
          .select('card_id')
          .eq('child_id', selectedChild.id),

        supabase
          .from('pecs_favorites')
          .select('card_id')
          .eq('child_id', selectedChild.id),
      ]);

      if (cardsRes.error) throw cardsRes.error;
      if (usageRes.error) throw usageRes.error;
      if (favRes.error) throw favRes.error;

      const mappedCards: CommCard[] = (cardsRes.data || []).map((c: any) => ({
        id: `custom-${c.id}`,
        label: c.title,
        helperText: c.title,
        imageUrl: c.image_url,
        visualType: c.icon_name,
      }));

      const usageMap: UsageMap = {};
      (usageRes.data || []).forEach((row: any) => {
        usageMap[row.card_id] = (usageMap[row.card_id] || 0) + 1;
      });

      const favIds = (favRes.data || []).map((f: any) => f.card_id);

      setCards(mappedCards);
      setUsage(usageMap);
      setFavorites(favIds);
    } catch (error) {
      console.error('PECS widget error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const topCards = useMemo(() => {
    return cards
      .map((card) => ({
        ...card,
        score:
          (usage[card.id] || 0) + (favorites.includes(card.id) ? 50 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [cards, usage, favorites]);

  const getImage = (card: CommCard) => {
    if (card.imageUrl) return { uri: card.imageUrl };
    if (card.visualType && PECS_IMAGES[card.visualType]) {
      return PECS_IMAGES[card.visualType];
    }
    return null;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>TODAY’S FOCUS</Text>
          <Text style={styles.title}>PECS Cards</Text>
        </View>

        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => router.push('/(tabs)/communication')}
        >
          <Ionicons name="arrow-forward" size={16} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Most useful communication cards based on usage & favorites.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading cards...</Text>
        </View>
      ) : topCards.length > 0 ? (
        <>
          {topCards.map((card) => {
            const image = getImage(card);

            return (
              <View key={card.id} style={styles.cardRow}>
                <View style={styles.leftRow}>
                  <View style={styles.thumbWrap}>
                    {image ? (
                      <Image source={image} style={styles.thumb} />
                    ) : (
                      <Ionicons
                        name="chatbubble"
                        size={20}
                        color="#4F46E5"
                      />
                    )}
                  </View>

                  <View style={styles.textWrap}>
                    <Text style={styles.label}>{card.label}</Text>
                    <Text style={styles.helper}>{card.helperText}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/communication')}
          >
            <Ionicons name="chatbubbles-outline" size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>Open Communication</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.emptyText}>
          Start using cards to generate smart recommendations.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 6,
    color: '#64748B',
    marginBottom: 12,
  },

  openBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    marginLeft: 8,
    color: '#64748B',
  },

  cardRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },

  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  thumbWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },

  thumb: {
    width: '100%',
    height: '100%',
  },

  textWrap: { flex: 1 },

  label: {
    fontWeight: '800',
  },

  helper: {
    fontSize: 12,
    color: '#64748B',
  },

  primaryBtn: {
    marginTop: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  primaryBtnText: {
    color: '#FFF',
    fontWeight: '800',
    marginLeft: 6,
  },

  emptyText: {
    color: '#64748B',
  },
});