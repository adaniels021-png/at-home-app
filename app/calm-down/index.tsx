import {
  getRecentlyHelpfulCalmPlan,
  getTopCalmToolInsight,
} from '@/lib/calmToolkitInsights';
import { useChild } from '@/lib/SelectedChildContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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

type ToolRoute =
  | '/calm-down/breathe-together'
  | '/calm-down/quiet-space'
  | '/calm-down/sensory-reset'
  | '/calm-down/simple-words';

type Tool = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
  route: ToolRoute;
};

type MomentType = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
  recommendedToolIds: string[];
  firstStep: string;
  parentScript: string[];
  avoid: string[];
};

const TOOLS: Tool[] = [
  {
    id: 'breathing',
    title: 'Breathe Together',
    subtitle: 'Slow your body first, then guide your child with fewer words.',
    tag: 'Co-regulation',
    icon: 'leaf-outline',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#BBF7D0',
    route: '/calm-down/breathe-together',
  },
  {
    id: 'quiet',
    title: 'Quiet Space',
    subtitle: 'Create a low-demand reset area when the moment feels too big.',
    tag: 'Reduce demand',
    icon: 'moon-outline',
    color: '#4338CA',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    route: '/calm-down/quiet-space',
  },
  {
    id: 'senses',
    title: 'Sensory Reset',
    subtitle: 'Use movement, pressure, water, or calming input safely.',
    tag: 'Sensory support',
    icon: 'sparkles-outline',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
    route: '/calm-down/sensory-reset',
  },
  {
    id: 'words',
    title: 'Simple Words',
    subtitle: 'Use short calm phrases when talking makes things harder.',
    tag: 'Parent script',
    icon: 'chatbubble-ellipses-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    border: '#FECDD3',
    route: '/calm-down/simple-words',
  },
];

const MOMENTS: MomentType[] = [
  {
    id: 'meltdown',
    title: 'Big Emotions',
    subtitle: 'Crying, screaming, overwhelmed, or shutting down.',
    icon: 'rainy-outline',
    color: '#DB2777',
    bg: '#FDF2F8',
    border: '#FBCFE8',
    recommendedToolIds: ['quiet', 'words', 'breathing'],
    firstStep:
      'Lower demands, reduce talking, and focus on helping your child feel safe before teaching anything.',
    parentScript: ['You are safe.', 'I am here.', 'We can take a break.'],
    avoid: [
      'Asking too many questions',
      'Repeating directions over and over',
      'Trying to teach during peak emotion',
    ],
  },
  {
    id: 'refusal',
    title: 'Refusing / Avoiding',
    subtitle: 'Won’t start, won’t continue, says no, or turns away.',
    icon: 'hand-left-outline',
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    recommendedToolIds: ['words', 'breathing', 'quiet'],
    firstStep:
      'Make the task smaller, offer one simple choice, and reinforce any small attempt.',
    parentScript: ['First one small step.', 'Then break.', 'I can help.'],
    avoid: [
      'Turning it into a power struggle',
      'Adding more demands',
      'Using long explanations',
    ],
  },
  {
    id: 'transition',
    title: 'Transition Struggle',
    subtitle: 'Difficulty stopping, leaving, waiting, or changing activities.',
    icon: 'swap-horizontal-outline',
    color: '#4F46E5',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    recommendedToolIds: ['words', 'quiet', 'breathing'],
    firstStep:
      'Use a short warning, simple visual language, and a clear first/then statement.',
    parentScript: ['First this.', 'Then that.', 'I will help you switch.'],
    avoid: [
      'Sudden changes without warning',
      'Rushing the child',
      'Using too many words',
    ],
  },
  {
    id: 'sensory',
    title: 'Sensory Overload',
    subtitle: 'Covering ears, escaping, crying, hiding, or seeking pressure.',
    icon: 'volume-mute-outline',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#BBF7D0',
    recommendedToolIds: ['quiet', 'senses', 'words'],
    firstStep:
      'Reduce sensory input first: lower noise, dim lights if possible, and move to a calmer space.',
    parentScript: ['Too loud.', 'Let’s move.', 'You are safe.'],
    avoid: [
      'Forcing eye contact',
      'Staying in the loud environment',
      'Talking loudly over the distress',
    ],
  },
  {
    id: 'unsafe',
    title: 'Unsafe Behavior',
    subtitle: 'Throwing, hitting, kicking, running, or unsafe body.',
    icon: 'warning-outline',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    recommendedToolIds: ['quiet', 'words', 'senses'],
    firstStep:
      'Focus on safety first. Move unsafe items, create space, and use a calm, firm voice.',
    parentScript: ['Safe body.', 'I will keep you safe.', 'We can take space.'],
    avoid: [
      'Standing too close if unsafe',
      'Arguing or lecturing',
      'Ignoring serious safety concerns',
    ],
  },
];

export default function CalmDownScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const [savedStrategies, setSavedStrategies] = useState<SavedCalmStrategy[]>([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [recentPlan, setRecentPlan] = useState<any>(null);
  const [showAllTools, setShowAllTools] = useState(false);
  const [whatsHelpingMost, setWhatsHelpingMost] = useState<{
  name: string;
  count: number;
} | null>(null);

  useFocusEffect(
  useCallback(() => {
    void loadStrategies();
  }, [selectedChild?.id])
);

  async function loadStrategies() {
  const data = await getSavedCalmStrategies();
  setSavedStrategies(data);

  const recent = await getRecentlyHelpfulCalmPlan();

console.log('RECENT PLAN:', recent);

setRecentPlan(recent);

  if (selectedChild?.id) {
    const insight = await getTopCalmToolInsight(selectedChild.id);
    setWhatsHelpingMost(insight);
  } else {
    setWhatsHelpingMost(null);
  }
}

const selectedMoment = useMemo(() => {
    return MOMENTS.find((item) => item.id === selectedMomentId) || null;
  }, [selectedMomentId]);

  const recommendedTools = useMemo(() => {
    if (!selectedMoment) return [];

    return selectedMoment.recommendedToolIds
      .map((id) => TOOLS.find((tool) => tool.id === id))
      .filter(Boolean) as Tool[];
  }, [selectedMoment]);

const emergencyTools = useMemo(() => {
  if (whatsHelpingMost?.name) {
    const matchedTool = TOOLS.find((tool) =>
      whatsHelpingMost.name.toLowerCase().includes(tool.title.toLowerCase())
    );

    if (matchedTool) {
      const fallbackQuiet = TOOLS.find((tool) => tool.id === 'quiet');

      return [matchedTool, fallbackQuiet]
        .filter(Boolean)
        .filter(
          (tool, index, array) =>
            array.findIndex((item) => item?.id === tool?.id) === index
        ) as Tool[];
    }
  }

  return [
    TOOLS.find((tool) => tool.id === 'quiet'),
    TOOLS.find((tool) => tool.id === 'words'),
  ].filter(Boolean) as Tool[];
}, [whatsHelpingMost]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.heroGlowOne} />
          <View pointerEvents="none" style={styles.heroGlowTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="heart-circle-outline" size={34} color="#FFFFFF" />
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>PARENT-LED</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Calm Down Toolkit</Text>

          <Text style={styles.heroText}>
            Choose what is happening right now. The app will suggest a calmer first step,
            simple words to use, and tools that fit the moment.
          </Text>
        </View>

<TouchableOpacity
  style={styles.heroEmergencyButton}
  activeOpacity={0.9}
  onPress={() => setEmergencyMode((prev) => !prev)}
>
  <Ionicons name="shield-checkmark-outline" size={20} color="#DC2626" />
  <Text style={styles.heroEmergencyText}>Emergency Calm Mode</Text>
  <Ionicons
    name={emergencyMode ? 'chevron-up' : 'chevron-down'}
    size={18}
    color="#DC2626"
  />
</TouchableOpacity>

       {emergencyMode ? (
  <View style={styles.emergencyBodyCard}>
    <View style={styles.emergencySafetyBox}>
      <Text style={styles.emergencyLabel}>Safety first</Text>
      <Text style={styles.emergencyText}>
        Move unsafe items away, give space, lower your voice, and use fewer words.
      </Text>
    </View>

    <View style={styles.emergencyScriptBox}>
      <Text style={styles.emergencyLabel}>Say this</Text>
      <Text style={styles.emergencyScript}>
        “You are safe. I am here. We can take a break.”
      </Text>
    </View>

    <Text style={styles.emergencyToolsTitle}>Try one of these first</Text>

    {emergencyTools.map((tool) => (
      <TouchableOpacity
        key={tool.id}
        style={[
          styles.emergencyToolButton,
          {
            backgroundColor: tool.bg,
            borderColor: tool.border,
          },
        ]}
        onPress={() => router.push(tool.route)}
      >
        <Ionicons name={tool.icon} size={21} color={tool.color} />

        <View style={{ flex: 1 }}>
          <Text style={[styles.emergencyToolTitle, { color: tool.color }]}>
            {tool.title}
          </Text>
          <Text style={styles.emergencyToolSubtitle}>{tool.tag}</Text>
        </View>

        <Ionicons name="arrow-forward" size={18} color={tool.color} />
      </TouchableOpacity>
    ))}
  </View>
) : null}
        

        {whatsHelpingMost && whatsHelpingMost.count >= 3 ? (
  <View style={styles.insightCard}>
    <Ionicons name="heart-outline" size={22} color="#4F46E5" />

    <View style={{ flex: 1 }}>
      <Text style={styles.insightTitle}>What's Helping Most</Text>

      <Text style={styles.insightText}>
        {whatsHelpingMost.name} has helped {whatsHelpingMost.count} time
        {whatsHelpingMost.count === 1 ? '' : 's'} recently.
      </Text>
    </View>
  </View>
) : null}

        <Text style={styles.sectionTitle}>What’s happening right now?</Text>

        <View style={styles.momentGrid}>
          {MOMENTS.map((moment) => {
            const active = selectedMomentId === moment.id;

            return (
              <TouchableOpacity
                key={moment.id}
                activeOpacity={0.9}
                style={[
                  styles.momentCard,
                  {
                    backgroundColor: active ? moment.bg : '#FFFFFF',
                    borderColor: active ? moment.border : '#E2E8F0',
                  },
                ]}
                onPress={() =>
                   setSelectedMomentId(
                   selectedMomentId === moment.id ? null : moment.id
           )
          }
              >
                <View style={[styles.momentIconWrap, { backgroundColor: moment.bg }]}>
                  <Ionicons name={moment.icon} size={23} color={moment.color} />
                </View>

                <View style={styles.momentTextWrap}>
                  <Text style={styles.momentTitle}>{moment.title}</Text>
                  <Text style={styles.momentSubtitle}>{moment.subtitle}</Text>
                </View>

                <Ionicons
                  name={active ? 'checkmark-circle' : 'chevron-forward'}
                  size={21}
                  color={active ? moment.color : '#94A3B8'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMoment ? (
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <View style={[styles.recommendationIcon, { backgroundColor: selectedMoment.bg }]}>
                <Ionicons name={selectedMoment.icon} size={24} color={selectedMoment.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.recommendationEyebrow}>Recommended response</Text>
                <Text style={styles.recommendationTitle}>{selectedMoment.title}</Text>
              </View>
            </View>

            <View style={styles.firstStepBox}>
              <Text style={styles.firstStepLabel}>First step</Text>
              <Text style={styles.firstStepText}>{selectedMoment.firstStep}</Text>
            </View>

          <Text style={styles.miniSectionTitle}>Say This</Text>

<View style={styles.scriptChipContainer}>
  {selectedMoment.parentScript.map((line) => (
    <View key={line} style={styles.scriptChip}>
      <Text style={styles.scriptChipText}>
        “{line}”
      </Text>
    </View>
  ))}
</View>

            <Text style={styles.miniSectionTitle}>Avoid</Text>

<View style={styles.avoidCompact}>
  {selectedMoment.avoid.map((line) => (
    <Text key={line} style={styles.avoidCompactText}>
      • {line}
    </Text>
  ))}
</View>

            <Text style={styles.miniSectionTitle}>Suggested tools</Text>

<View style={styles.suggestedToolChips}>
  {recommendedTools.map((tool) => (
    <TouchableOpacity
      key={tool.id}
      activeOpacity={0.9}
      style={[
        styles.suggestedToolChip,
        {
          backgroundColor: tool.bg,
          borderColor: tool.border,
        },
      ]}
      onPress={() => router.push(tool.route)}
    >
      <Ionicons name={tool.icon} size={18} color={tool.color} />
      <Text style={[styles.suggestedToolChipText, { color: tool.color }]}>
        {tool.title}
      </Text>
    </TouchableOpacity>
  ))}
</View>
          </View>
        ) : (
          <View style={styles.startPromptCard}>
            <Ionicons name="sparkles-outline" size={22} color="#4F46E5" />
            <Text style={styles.startPromptText}>
              Select a situation above to get a simple parent-friendly calm down plan.
            </Text>
          </View>
        )}

 <TouchableOpacity
  style={styles.myPlansCard}
  activeOpacity={0.9}
  onPress={() => router.push('/calm-down/my-calming-plans' as any)}
>
  <View style={styles.myPlansIcon}>
    <Ionicons name="bookmark-outline" size={24} color="#4F46E5" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.myPlansTitle}>My Calming Plans</Text>

    <Text style={styles.myPlansSubtitle}>
      {savedStrategies.length > 0
        ? `${savedStrategies.length} saved calming plan${
            savedStrategies.length === 1 ? '' : 's'
          }`
        : 'Save helpful strategies for quick access'}
    </Text>
  </View>

  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
</TouchableOpacity>

<TouchableOpacity
  style={styles.dropdownHeader}
  activeOpacity={0.9}
  onPress={() => setShowAllTools((prev) => !prev)}
>
  <View>
    <Text style={styles.dropdownTitle}>Explore all tools</Text>
    <Text style={styles.dropdownSubtitle}>
      Breathing, quiet space, sensory reset, and simple words
    </Text>
  </View>

  <Ionicons
    name={showAllTools ? 'chevron-up' : 'chevron-down'}
    size={22}
    color="#64748B"
  />
</TouchableOpacity>

  <View style={styles.recentlyHelpfulCard}>
  <View style={styles.recentlyHelpfulIcon}>
    <Ionicons name="sparkles-outline" size={22} color="#4F46E5" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.recentlyHelpfulTitle}>Recently Helpful</Text>

    <Text style={styles.recentlyHelpfulText}>
      {recentPlan
        ? `Last time, ${
            recentPlan.toolsUsed?.join(', ') ||
            recentPlan.phraseUsed ||
            recentPlan.strategyName ||
            recentPlan.toolType ||
            'this calming plan'
          } helped.`
        : 'Helpful strategies will appear here after you save one.'}
    </Text>
  </View>
  </View>

{showAllTools ? (
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
              <View pointerEvents="none" style={styles.toolGlow} />

              <View style={styles.toolLeft}>
                <View style={styles.toolIconWrap}>
                  <Ionicons name={tool.icon} size={25} color={tool.color} />
                </View>

                <View style={styles.toolTextWrap}>
                  <View style={[styles.toolTag, { backgroundColor: tool.color + '14' }]}>
                    <Text style={[styles.toolTagText, { color: tool.color }]}>
                      {tool.tag}
                    </Text>
                  </View>

                  <Text style={[styles.toolTitle, { color: tool.color }]}>
                    {tool.title}
                  </Text>

                  <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                </View>
              </View>

              <View style={[styles.arrowWrap, { backgroundColor: tool.color + '15' }]}>
                <Ionicons name="chevron-forward" size={18} color={tool.color} />
              </View>
            </TouchableOpacity>
                    ))}
        </View>
) : null}

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={20} color="#2563EB" />

          <Text style={styles.noteText}>
            This toolkit supports everyday regulation. If your child may hurt
            themselves or someone else, seek immediate professional help.
          </Text>
        </View>
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
    overflow: 'hidden',
    backgroundColor: '#5B3FF4',
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#5B3FF4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 3,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -95,
    right: -70,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(196,181,253,0.22)',
    bottom: -85,
    left: -55,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  heroText: {
    color: '#EDE9FE',
    marginTop: 9,
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  momentGrid: {
    gap: 12,
    marginBottom: 18,
  },

 momentCard: {
  borderRadius: 22,
  padding: 13,
  borderWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
},

momentIconWrap: {
  width: 44,
  height: 44,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 11,
},

momentTitle: {
  fontSize: 14.5,
  fontWeight: '900',
  color: '#0F172A',
},

momentSubtitle: {
  marginTop: 2,
  fontSize: 12,
  color: '#64748B',
  lineHeight: 17,
  fontWeight: '700',
},

momentTextWrap: {
  flex: 1,
  paddingRight: 10,
},

  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },

  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  recommendationIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  recommendationEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  recommendationTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  firstStepBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },

  firstStepLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  firstStepText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  miniSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 9,
    marginTop: 2,
  },

  scriptLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 11,
    marginBottom: 8,
  },

  scriptText: {
    marginLeft: 8,
    color: '#5B21B6',
    fontWeight: '900',
    fontSize: 13,
  },

  avoidLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 11,
    marginBottom: 8,
  },

  avoidText: {
    flex: 1,
    marginLeft: 8,
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 12.5,
    lineHeight: 18,
  },

  suggestedToolList: {
    gap: 10,
  },

  startPromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  startPromptText: {
    flex: 1,
    marginLeft: 10,
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
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
    fontSize: 12.5,
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
    marginBottom: 24,
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
    backgroundColor: '#FFFFFF',
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
    borderRadius: 26,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 7,
    fontSize: 13,
  },

  toolList: {
    gap: 14,
    marginBottom: 20,
  },

  toolCard: {
    overflow: 'hidden',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  toolGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
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
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  toolTextWrap: {
    flex: 1,
  },

  toolTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
  },

  toolTagText: {
    fontSize: 10.5,
    fontWeight: '900',
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
    fontSize: 13,
  },

    myPlansCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  myPlansIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  myPlansTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  myPlansSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '700',
  },

  dropdownHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },

  dropdownSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '700',
  },

  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  insightTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginLeft: 10,
  },

  insightText: {
    marginTop: 3,
    marginLeft: 10,
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 18,
  },

  recentlyHelpfulCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  recentlyHelpfulIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  recentlyHelpfulTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  recentlyHelpfulText: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
  },

emergencySafetyBox: {
  backgroundColor: '#FEF2F2',
  borderRadius: 18,
  padding: 14,
  borderWidth: 1,
  borderColor: '#FECACA',
},

emergencyScriptBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 18,
  padding: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

emergencyLabel: {
  fontSize: 12,
  fontWeight: '900',
  color: '#DC2626',
  marginBottom: 5,
},

emergencyText: {
  fontSize: 13,
  color: '#334155',
  fontWeight: '700',
  lineHeight: 20,
},

emergencyScript: {
  fontSize: 15,
  color: '#0F172A',
  fontWeight: '900',
  lineHeight: 22,
},

emergencyToolsTitle: {
  fontSize: 14,
  fontWeight: '900',
  color: '#0F172A',
  marginTop: 2,
},

emergencyToolButton: {
  minHeight: 58,
  borderRadius: 18,
  padding: 12,
  borderWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

emergencyToolTitle: {
  fontSize: 14,
  fontWeight: '900',
},

emergencyToolSubtitle: {
  marginTop: 2,
  fontSize: 11.5,
  color: '#64748B',
  fontWeight: '700',
},

heroEmergencyButton: {
  minHeight: 50,
  borderRadius: 18,
  backgroundColor: '#FFFFFF',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 14,
  gap: 8,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#FECACA',
},

heroEmergencyText: {
  color: '#DC2626',
  fontSize: 14,
  fontWeight: '900',
},

emergencyBodyCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 16,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#FECACA',
},

scriptChipContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 14,
},

scriptChip: {
  backgroundColor: '#F5F3FF',
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8,
},

scriptChipText: {
  color: '#6D28D9',
  fontWeight: '800',
  fontSize: 12,
},

avoidCompact: {
  backgroundColor: '#FEF2F2',
  borderRadius: 16,
  padding: 12,
  marginBottom: 14,
},

avoidCompactText: {
  color: '#991B1B',
  fontSize: 12.5,
  fontWeight: '700',
  lineHeight: 20,
},

suggestedToolChips: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

suggestedToolChip: {
  minHeight: 42,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

suggestedToolChipText: {
  fontSize: 12.5,
  fontWeight: '900',
},
});