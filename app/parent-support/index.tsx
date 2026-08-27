import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChildSubscription as useSubscription } from '../../lib/ChildSubscriptionContext';
import { useChild } from '../../lib/SelectedChildContext';
import { canUseHelpNowGeneral } from '../../lib/caregiverPermissions';
import { hasEntitlement } from '../../lib/entitlements';

type SupportSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  image?: ImageSourcePropType;
  color: string;
  bg: string;
  iconBg?: string;
  border: string;
  proOnly?: boolean;
  route:
    | '/parent-support/emotional-reset'
    | '/parent-support/journal'
    | '/parent-support/daily-permission'
    | '/parent-support/parent-wins';
};

const SUPPORT_SECTIONS: SupportSection[] = [
 {
  id: 'parent-wins',
  title: 'Parent Wins',
  subtitle: 'Positive wins from caregivers navigating autism support at home.',
  icon: 'people-outline',
  image: require('../../assets/images/parent-support-parent-wins.png'),
  color: '#7C3AED',
  bg: '#F5F3FF',
  iconBg: '#FFFFFF',
  border: '#DDD6FE',
  route: '/parent-support/parent-wins',
},
  {
    id: 'emotional-reset',
    title: 'Emotional Reset',
    subtitle:
      'A quick parent reset that helps you calm your body and know what to do next.',
    icon: 'leaf-outline',
    image: require('../../assets/images/parent-support-emotional-reset.png'),
    color: '#EA580C',
    bg: '#FFF7ED',
    iconBg: '#FFEDD5',
    border: '#FED7AA',
    proOnly: true,
    route: '/parent-support/emotional-reset',
  },
  {
    id: 'journal',
    title: 'Parent Journal',
    subtitle:
      'Quick check-ins with options to type, reflect, or use voice-to-text.',
    icon: 'journal-outline',
    image: require('../../assets/images/parent-support-journal.png'),
    color: '#0F766E',
    bg: '#ECFDF5',
    iconBg: '#D1FAE5',
    border: '#A7F3D0',
    proOnly: true,
    route: '/parent-support/journal',
  },
  {
    id: 'daily-permission',
    title: 'Daily Permission',
    subtitle:
      'Encouragement, hard-day support, burnout reminders, and parent sensory overload tips.',
    icon: 'sparkles-outline',
    image: require('../../assets/images/parent-support-daily-permission.png'),
    color: '#BE123C',
    bg: '#FFF1F2',
    iconBg: '#FFE4E6',
    border: '#FECDD3',
    proOnly: true,
    route: '/parent-support/daily-permission',
  },
];

export default function ParentSupportScreen() {
  const router = useRouter();
  const { selectedChild, loading: childLoading } = useChild();
  const { isPro, loading } = useSubscription();

  const hasProAccess = hasEntitlement(
    { isPro },
    'parent_support'
  );

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  function handleSectionPress(section: SupportSection) {
    if (section.proOnly && !hasProAccess) {
      Alert.alert(
        'Pro Parent Support',
        `${section.title} is included with ABA at Home Pro.`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/subscription'),
          },
        ]
      );
      return;
    }

    router.push(section.route);
  }

  if (childLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Checking access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canUseHelpNowGeneral(selectedChild?.caregiver_access_role)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Parent Support</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroImageContainer}>
  <Image
    source={require('../../assets/images/parent-support-hero.png')}
    style={styles.parentSupportHeroImage}
    resizeMode="cover"
  />

  <View style={styles.heroOverlay}>
    <Text style={styles.heroOverlayTitle}>
      Caregiver Support
    </Text>

    <Text style={styles.heroOverlayText}>
      Support, reflection, encouragement, and emotional reset tools for hard parenting days.
    </Text>
  </View>
</View>

        {!hasProAccess ? (
          <View style={styles.freeBanner}>
            <Ionicons name="gift-outline" size={20} color="#7C3AED" />

            <View style={{ flex: 1 }}>
              <Text style={styles.freeBannerTitle}>Parent Wins is free</Text>
              <Text style={styles.freeBannerText}>
                Pro unlocks emotional reset, journaling, saved reflections, and
                Daily Permission.
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Parent Support Tools</Text>

        <View style={styles.sectionList}>
          {SUPPORT_SECTIONS.map((section) => {
            const locked = !!section.proOnly && !hasProAccess;

            return (
              <TouchableOpacity
                key={section.id}
                activeOpacity={0.88}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: section.bg,
                    borderColor: section.border,
                  },
                  locked && styles.lockedCard,
                ]}
                onPress={() => handleSectionPress(section)}
              >
                <View style={styles.sectionLeft}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: section.iconBg || '#FFFFFF' },
                    ]}
                  >
  {section.image ? (
  <>
    <Image
      source={section.image}
      style={[styles.sectionIconImage, locked && styles.sectionIconImageLocked]}
      resizeMode="contain"
    />

    {locked ? (
      <View style={styles.lockBadge}>
        <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
      </View>
    ) : null}
  </>
) : (
  <Ionicons
    name={locked ? 'lock-closed-outline' : section.icon}
    size={26}
    color={section.color}
  />
)}
                  </View>

                  <View style={styles.sectionTextWrap}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.sectionCardTitle,
                          { color: section.color },
                        ]}
                      >
                        {section.title}
                      </Text>

                      {locked ? (
                        <View style={styles.proPill}>
                          <Text style={styles.proPillText}>PRO</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.sectionSubtitle}>
                      {section.subtitle}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={section.color}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.savedReflectionButton,
            !hasProAccess && styles.lockedSavedButton,
          ]}
          onPress={() => {
            if (!hasProAccess) {
              router.push('/subscription');
              return;
            }

            router.push('/parent-support/saved-reflections');
          }}
        >
          <View style={styles.savedReflectionLeft}>
            <Ionicons
              name={hasProAccess ? 'bookmark-outline' : 'lock-closed-outline'}
              size={18}
              color="#2563EB"
            />

            <Text style={styles.savedReflectionText}>
              {hasProAccess ? 'Saved Reflections' : 'Saved Reflections Pro'}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#2563EB" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color="#059669"
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              Caregiver support, not medical advice
            </Text>

            <Text style={styles.infoText}>
              These tools support caregiver wellness and daily coping. They do
              not replace therapy, medical care, crisis support, or emergency
              services.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '800',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  headerSpacer: {
    width: 42,
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

  freeBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  freeBannerTitle: {
    color: '#5B21B6',
    fontWeight: '900',
    fontSize: 14,
  },

  freeBannerText: {
    marginTop: 4,
    color: '#6D28D9',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  sectionList: {
    gap: 14,
    marginBottom: 18,
  },

  sectionCard: {
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  lockedCard: {
    opacity: 0.92,
  },

  sectionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  sectionTextWrap: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },

  sectionCardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  proPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  proPillText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  savedReflectionButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  lockedSavedButton: {
    backgroundColor: '#EFF6FF',
  },

  savedReflectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  savedReflectionText: {
    marginLeft: 8,
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 22,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  infoTitle: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
  },

  infoText: {
    marginLeft: 10,
    marginTop: 4,
    color: '#047857',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

heroImageContainer: {
  height: 280,
  borderRadius: 32,
  overflow: 'hidden',
  marginBottom: 24,

  shadowColor: '#7C3AED',
  shadowOffset: {
    width: 0,
    height: 12,
  },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 4,
},

parentSupportHeroImage: {
  width: '100%',
  height: '100%',
},

heroOverlay: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,

  paddingHorizontal: 24,
  paddingVertical: 22,

  backgroundColor: 'rgba(15,23,42,0.18)',
},

heroOverlayTitle: {
  color: '#FFFFFF',
  fontSize: 30,
  fontWeight: '900',
  marginBottom: 6,
},

heroOverlayText: {
  color: '#F8FAFC',
  fontSize: 15,
  lineHeight: 22,
  fontWeight: '700',
},

sectionIcon: {
  width: 64,
  height: 64,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
  position: 'relative',
  overflow: 'hidden',
},

sectionIconImage: {
  width: 64,
  height: 64,
  borderRadius: 22,
},

sectionIconImageLocked: {
  opacity: 0.55,
},

lockBadge: {
  position: 'absolute',
  top: -5,
  right: -5,
  width: 22,
  height: 22,
  borderRadius: 11,
  backgroundColor: '#0F172A',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: '#FFFFFF',
},
});
