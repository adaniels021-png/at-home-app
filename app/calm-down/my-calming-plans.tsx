import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SavedCalmStrategy,
  deleteCalmStrategy,
  getSavedCalmStrategies,
} from '@/lib/calmStrategiesStorage';


export default function MyCalmingPlansScreen() {
  const router = useRouter();
  const [savedStrategies, setSavedStrategies] = useState<SavedCalmStrategy[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStrategies();
    }, [])
  );

  async function loadStrategies() {
  const data = await getSavedCalmStrategies();

  const filteredData = data.filter(
    (item) => item.type !== 'simple-words'
  );

  setSavedStrategies(filteredData);
}

  function confirmDeleteStrategy(strategyId: string) {
  Alert.alert(
    'Delete saved plan?',
    'This calming plan will be removed from your saved plans.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCalmStrategy(strategyId);
          setSavedStrategies((current) =>
            current.filter((item) => item.id !== strategyId)
          );
        },
      },
    ]
  );
}

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="bookmark" size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>My Calming Plans</Text>

          <Text style={styles.heroText}>
            Saved strategies that worked well, so you can quickly find them during hard moments.
          </Text>
        </View>

        {savedStrategies.length > 0 ? (
          <View style={styles.list}>
            {savedStrategies.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: item.bg,
                    borderColor: item.color + '35',
                  },
                ]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon as any} size={23} color={item.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: item.color }]}>
                    {item.title}
                  </Text>

                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>

                <TouchableOpacity
  style={styles.deleteButton}
  onPress={() => confirmDeleteStrategy(item.id)}
>
  <Ionicons name="trash-outline" size={18} color="#DC2626" />
</TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="bookmark-outline" size={34} color="#6366F1" />

            <Text style={styles.emptyTitle}>No saved plans yet</Text>

           <Text style={styles.emptyText}>
            When a strategy helps, save it from Sensory Reset, Quiet Space, or other calming tools.
          </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hero: {
    backgroundColor: '#5B3FF4',
    borderRadius: 30,
    padding: 22,
    marginBottom: 20,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  heroText: {
    color: '#EDE9FE',
    marginTop: 8,
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 21,
  },

  deleteButton: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: '#FEF2F2',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#FECACA',
  marginLeft: 10,
},
});