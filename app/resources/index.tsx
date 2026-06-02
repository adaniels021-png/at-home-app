import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ResourceItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  url?: string;
  color?: string;
  bg?: string;
};

type ResourceSection = {
  title: string;
  items: ResourceItem[];
};

const RESOURCE_SECTIONS: ResourceSection[] = [
  {
    title: 'ABA at Home Tools',
    items: [
      {
        title: 'Baby Signs',
        description: 'Simple signs for everyday needs and routines.',
        icon: 'hand-left-outline',
        route: '/communication/sign-guide',
        color: '#10B981',
        bg: '#ECFDF5',
      },
      {
        title: 'Parent Hub',
        description: 'Quick ABA tips for supporting communication at home.',
        icon: 'school-outline',
        route: '/communication/parent-training-hub',
        color: '#4F46E5',
        bg: '#EEF2FF',
      },
    ],
  },
  {
    title: 'Parent Training',
    items: [
      {
        title: 'Autism Speaks Tool Kits',
        description: 'Parent-friendly guides, routines, and support resources.',
        url: 'https://www.autismspeaks.org/tool-kit',
        icon: 'book-outline',
      },
      {
        title: 'CDC Developmental Milestones',
        description: 'Track milestones and learn what to watch for by age.',
        url: 'https://www.cdc.gov/ncbddd/actearly/milestones/index.html',
        icon: 'analytics-outline',
      },
    ],
  },
  {
    title: 'Communication Support',
    items: [
      {
        title: 'ASHA Speech and Language Development',
        description: 'Trusted communication development information for families.',
        url: 'https://www.asha.org/public/speech/development/',
        icon: 'chatbubble-ellipses-outline',
      },
      {
        title: 'PECS Overview',
        description: 'Simple explanation of PECS and how it supports communication.',
        url: 'https://pecsusa.com/pecs/',
        icon: 'images-outline',
      },
    ],
  },
  {
    title: 'Behavior & ABA Learning',
    items: [
      {
        title: 'What is ABA?',
        description: 'A clear explanation of ABA for caregivers.',
        url: 'https://www.autismspeaks.org/applied-behavior-analysis',
        icon: 'school-outline',
      },
      {
        title: 'Positive Behavior Support Basics',
        description: 'Helpful foundation for routines, transitions, and behaviors.',
        url: 'https://www.pbis.org/family',
        icon: 'sunny-outline',
      },
    ],
  },
];

export default function ResourcesLibraryScreen() {
  const router = useRouter();

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Link Error', 'Could not open this resource.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Open resource error:', error);
      Alert.alert('Link Error', 'Could not open this resource.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="library-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>RESOURCE LIBRARY</Text>
          </View>

          <Text style={styles.heroTitle}>Resource Library</Text>
          <Text style={styles.heroSubtitle}>
            Trusted resources for caregiver learning, communication support, and home-based developmental practice.
          </Text>
        </View>

        {RESOURCE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>

            {section.items.map((item) => (
              <TouchableOpacity
                key={item.title}
                style={styles.resourceCard}
               onPress={() => {
  if (item.route) {
    router.push(item.route as any);
    return;
  }

  if (item.url) {
    void openUrl(item.url);
  }
}}
              >
                <View
  style={[
    styles.resourceIconWrap,
    { backgroundColor: item.bg || '#EEF2FF' },
  ]}
>
  <Ionicons
    name={item.icon as keyof typeof Ionicons.glyphMap}
    size={20}
    color={item.color || '#4F46E5'}
  />
</View>

                <View style={styles.resourceTextWrap}>
                  <Text style={styles.resourceTitle}>{item.title}</Text>
                  <Text style={styles.resourceDescription}>{item.description}</Text>
                </View>

                <Ionicons
                  name={item.route ? 'chevron-forward' : 'open-outline'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}
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

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
  },

  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.4,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  heroSubtitle: {
    marginTop: 8,
    color: '#E0E7FF',
    lineHeight: 21,
    fontSize: 14,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  resourceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resourceTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  resourceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  resourceDescription: {
    marginTop: 4,
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '600',
  },
});