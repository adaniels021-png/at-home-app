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

type StudioCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: string;
  onPress: () => void;
};

export default function ContentStudioScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#29145F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AI Content Studio</Text>
            <Text style={styles.subtitle}>
              Create, review, and manage ABA at Home content.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={28} color="#7C3AED" />
          </View>

          <Text style={styles.heroTitle}>Build your content library faster</Text>
          <Text style={styles.heroText}>
            Use your admin tools to generate lessons, activities, and review curriculum content before publishing.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Content Tools</Text>

        <StudioCard
          icon="school-outline"
          title="Generate Lessons"
          description="Create new ABA lesson content using the lesson generator."
          badge="AI"
          onPress={() => router.push('/admin/generate-lessons' as any)}
        />

        <StudioCard
          icon="library-outline"
          title="Lesson Library"
          description="Review active and inactive lesson content in your library."
          onPress={() => router.push('/admin/lesson-library' as any)}
        />

        <StudioCard
          icon="color-wand-outline"
          title="Generate Activities"
          description="Create daily activity ideas for the Activities Library."
          badge="AI"
          onPress={() => router.push('/admin/activity-library/ai-generate' as any)}
        />

        <StudioCard
          icon="heart-circle-outline"
          title="Behavior Support Generator"
          description="Future tool for behavior support plans and calming strategies."
          badge="Soon"
          onPress={() => {}}
        />

        <StudioCard
          icon="document-text-outline"
          title="Worksheet Generator"
          description="Future tool for printable worksheets and parent handouts."
          badge="Soon"
          onPress={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StudioCard({
  icon,
  title,
  description,
  badge,
  onPress,
}: StudioCardProps) {
  const disabled = badge === 'Soon';

  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.disabledCard]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={23} color="#7C3AED" />
      </View>

      <View style={styles.cardText}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>

          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#2E1065',
  },
  subtitle: {
    marginTop: 3,
    color: '#7C6F92',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  heroText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledCard: {
    opacity: 0.65,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E1B4B',
    marginRight: 8,
  },
  cardDescription: {
    marginTop: 5,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 19,
  },
  badge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '900',
  },
});