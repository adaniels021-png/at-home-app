import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SavedCalmStrategy,
  getSavedCalmStrategies,
} from '@/lib/calmStrategiesStorage';

type Tool = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
  route:
    | '/calm-down/breathe-together'
    | '/calm-down/quiet-space'
    | '/calm-down/sensory-reset'
    | '/calm-down/simple-words';
};

const TOOLS: Tool[] = [
  {
    id: 'breathing',
    title: 'Breathe Together',
    subtitle: 'Guided breathing with before and after calm levels.',
    icon: 'leaf-outline',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#BBF7D0',
    route: '/calm-down/breathe-together',
  },
  {
    id: 'quiet',
    title: 'Quiet Space',
    subtitle: 'Set up a calm area with low pressure and fewer words.',
    icon: 'moon-outline',
    color: '#4338CA',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    route: '/calm-down/quiet-space',
  },
  {
    id: 'senses',
    title: 'Sensory Reset',
    subtitle: 'Try movement, pressure, water, or calming sensory input.',
    icon: 'sparkles-outline',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
    route: '/calm-down/sensory-reset',
  },
  {
    id: 'words',
    title: 'Use Simple Words',
    subtitle: 'Use short phrase cards during big emotions.',
    icon: 'chatbubble-ellipses-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    border: '#FECDD3',
    route: '/calm-down/simple-words',
  },
];

export default function CalmDownScreen() {
  const router = useRouter();

  const [savedStrategies, setSavedStrategies] = useState<
  SavedCalmStrategy[]
    >([]);

  useFocusEffect(
    useCallback(() => {
      loadStrategies();
    }, [])
  );

  async function loadStrategies() {
    const data = await getSavedCalmStrategies();
    setSavedStrategies(data);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons
              name="heart-circle-outline"
              size={42}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>
            Calm Down Toolkit
          </Text>

          <Text style={styles.heroText}>
            Parent-led regulation tools designed to
            reduce overwhelm, support connection,
            and help your child feel safe.
          </Text>
        </View>

        <View style={styles.quickAccessHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Quick Access
            </Text>

            <Text style={styles.quickSubtitle}>
              Saved calming strategies
            </Text>
          </View>

          <View style={styles.proBadge}>
            <Ionicons
              name="diamond-outline"
              size={14}
              color="#FFFFFF"
            />

            <Text style={styles.proBadgeText}>
              PRO
            </Text>
          </View>
        </View>

        {savedStrategies.length > 0 ? (
          <View style={styles.savedList}>
            {savedStrategies.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.savedCard,
                  {
                    backgroundColor: item.bg,
                    borderColor: item.color + '30',
                  },
                ]}
              >
                <View
                  style={[
                    styles.savedIconWrap,
                    {
                      backgroundColor: '#FFFFFF',
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.color}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.savedCardTitle,
                      {
                        color: item.color,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>

                  <Text style={styles.savedCardSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name="bookmark"
                  size={20}
                  color={item.color}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyQuickAccess}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="bookmark-outline"
                size={24}
                color="#6366F1"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No saved strategies yet
            </Text>

            <Text style={styles.emptyText}>
              When a calming strategy works well,
              you can save it here for fast access
              during stressful moments.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          Choose a strategy
        </Text>

        <View style={styles.toolList}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              activeOpacity={0.9}
              style={[
                styles.toolCard,
                {
                  backgroundColor: tool.bg,
                  borderColor: tool.border,
                },
              ]}
              onPress={() => router.push(tool.route)}
            >
              <View style={styles.toolGlow} />

              <View style={styles.toolLeft}>
                <View
                  style={styles.toolIconWrap}
                >
                  <Ionicons
                    name={tool.icon}
                    size={26}
                    color={tool.color}
                  />
                </View>

                <View style={styles.toolTextWrap}>
                  <Text
                    style={[
                      styles.toolTitle,
                      { color: tool.color },
                    ]}
                  >
                    {tool.title}
                  </Text>

                  <Text style={styles.toolSubtitle}>
                    {tool.subtitle}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.arrowWrap,
                  {
                    backgroundColor:
                      tool.color + '15',
                  },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={tool.color}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#2563EB"
          />

          <Text style={styles.noteText}>
            This toolkit is for everyday emotional
            support. If your child may hurt
            themselves or someone else, seek
            immediate professional help.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F7FB',
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
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  hero: {
    overflow: 'hidden',
    backgroundColor: '#4F46E5',
    borderRadius: 34,
    padding: 26,
    marginBottom: 26,
  },

  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -80,
    right: -60,
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
    fontSize: 30,
    fontWeight: '900',
  },

  heroText: {
    color: '#E0E7FF',
    marginTop: 10,
    lineHeight: 23,
    fontSize: 15,
    fontWeight: '600',
  },

  quickAccessHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  quickSubtitle: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },

  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },

  savedList: {
    gap: 12,
    marginBottom: 26,
  },

  savedCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  savedIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  savedCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  savedCardSubtitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  emptyQuickAccess: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    marginBottom: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  toolList: {
    gap: 16,
    marginBottom: 20,
  },

  toolCard: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  toolGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    top: -60,
    right: -40,
  },

  toolLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  toolIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  toolTextWrap: {
    flex: 1,
  },

  toolTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 5,
  },

  toolSubtitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  arrowWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  noteText: {
    flex: 1,
    marginLeft: 8,
    color: '#1D4ED8',
    fontWeight: '700',
    lineHeight: 20,
  },
});