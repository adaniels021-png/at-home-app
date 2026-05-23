import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

type SavedStrategy = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

const IS_PRO_USER = false;

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
    subtitle: 'Build a low-stimulation space with quiet waiting.',
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
    subtitle: 'Use short phrases during big emotions.',
    icon: 'chatbubble-ellipses-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    border: '#FECDD3',
    route: '/calm-down/simple-words',
  },
];

const SAVED_STRATEGIES: SavedStrategy[] = [
  {
    id: 'quiet-1',
    title: 'Quiet Space',
    subtitle: 'Dim lights + Lower sound + Reduce talking',
    icon: 'moon-outline',
    color: '#4338CA',
    bg: '#EEF2FF',
  },
  {
    id: 'sensory-1',
    title: 'Sensory Reset',
    subtitle: 'Deep Pressure + Water Break',
    icon: 'sparkles-outline',
    color: '#B45309',
    bg: '#FFFBEB',
  },
  {
    id: 'words-1',
    title: 'Simple Words',
    subtitle: '“Break please.”',
    icon: 'chatbubble-ellipses-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
  },
];

export default function CalmDownScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="heart-circle-outline" size={42} color="#FFFFFF" />
            </View>

            <View style={styles.freePill}>
              <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
              <Text style={styles.freePillText}>Free toolkit</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Calm Down Toolkit</Text>

          <Text style={styles.heroText}>
            Parent-led strategies to help your child regulate, reset, and feel
            supported during big emotions.
          </Text>
        </View>

        <View style={styles.savedCard}>
          <View style={styles.savedHeaderRow}>
            <View>
              <Text style={styles.savedEyebrow}>Pro quick access</Text>
              <Text style={styles.savedTitle}>Saved Calm Down Strategies</Text>
            </View>

            <View style={styles.proBadge}>
              <Ionicons name="lock-closed" size={14} color="#7C3AED" />
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
          </View>

          {IS_PRO_USER ? (
            <View style={styles.savedList}>
              {SAVED_STRATEGIES.map((strategy) => (
                <TouchableOpacity
                  key={strategy.id}
                  activeOpacity={0.86}
                  style={[styles.savedStrategyCard, { backgroundColor: strategy.bg }]}
                >
                  <View style={styles.savedStrategyIcon}>
                    <Ionicons
                      name={strategy.icon}
                      size={22}
                      color={strategy.color}
                    />
                  </View>

                  <View style={styles.savedStrategyTextWrap}>
                    <Text style={[styles.savedStrategyTitle, { color: strategy.color }]}>
                      {strategy.title}
                    </Text>
                    <Text style={styles.savedStrategySubtitle}>
                      {strategy.subtitle}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={strategy.color} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.lockedBox}>
              <View style={styles.lockIconCircle}>
                <Ionicons name="bookmark-outline" size={24} color="#7C3AED" />
              </View>

              <Text style={styles.lockedTitle}>
                Save your child’s best calming strategies.
              </Text>

              <Text style={styles.lockedText}>
                Calm Down Toolkit is free. Saving favorite strategies for quick
                access is included with Pro.
              </Text>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => router.push('/subscription' as never)}
              >
                <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Choose a strategy</Text>

        <View style={styles.toolList}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              activeOpacity={0.86}
              style={[
                styles.toolCard,
                {
                  backgroundColor: tool.bg,
                  borderColor: tool.border,
                },
              ]}
              onPress={() => router.push(tool.route)}
            >
              <View style={styles.toolLeft}>
                <View style={styles.toolIconWrap}>
                  <Ionicons name={tool.icon} size={26} color={tool.color} />
                </View>

                <View style={styles.toolTextWrap}>
                  <Text style={[styles.toolTitle, { color: tool.color }]}>
                    {tool.title}
                  </Text>

                  <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={22} color={tool.color} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={20} color="#2563EB" />

          <Text style={styles.noteText}>
            This toolkit is for everyday support. If your child may hurt
            themselves or someone else, seek immediate help.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hero: {
    backgroundColor: '#4F46E5',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  freePillText: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  heroText: {
    color: '#E0E7FF',
    marginTop: 8,
    lineHeight: 22,
    fontSize: 15,
    fontWeight: '700',
  },
  savedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 22,
  },
  savedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  savedEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  savedTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  proBadgeText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '900',
    color: '#7C3AED',
  },
  lockedBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
  },
  lockIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#581C87',
    textAlign: 'center',
    marginBottom: 6,
  },
  lockedText: {
    fontSize: 14,
    color: '#6B21A8',
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  upgradeButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  savedList: {
    gap: 10,
  },
  savedStrategyCard: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedStrategyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedStrategyTextWrap: {
    flex: 1,
  },
  savedStrategyTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 3,
  },
  savedStrategySubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  toolList: {
    gap: 14,
    marginBottom: 18,
  },
  toolCard: {
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  toolIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  toolTextWrap: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  toolSubtitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  noteCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
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