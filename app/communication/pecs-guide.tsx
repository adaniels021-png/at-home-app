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

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  accent = '#4F46E5',
  background = '#EEF2FF',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: string;
  background?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionTile, { backgroundColor: background }]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: `${accent}20` }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>

      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#64748B" />
    </TouchableOpacity>
  );
}

export default function PecsGuideScreen() {
  const router = useRouter();

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Link Error', 'Could not open the link.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Open URL error:', error);
      Alert.alert('Link Error', 'Could not open the link.');
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
            <Ionicons name="images-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>PECS GUIDE</Text>
          </View>

          <Text style={styles.heroTitle}>PECS Parent Guide</Text>
          <Text style={styles.heroSubtitle}>
            Learn what PECS is, why it helps, and how to begin teaching picture-based
            communication at home in a simple and structured way.
          </Text>
        </View>

        <SectionCard
          title="What PECS Is"
          subtitle="A simple explanation for parents and caregivers"
        >
          <Text style={styles.paragraphText}>
            PECS stands for the Picture Exchange Communication System. It teaches a child
            to communicate by giving or pointing to pictures for meaningful items, actions,
            people, or needs. PECS is often used to build early communication skills before
            or alongside spoken language.
          </Text>
        </SectionCard>

        <SectionCard
          title="Why PECS Helps"
          subtitle="What parents usually notice when it is taught consistently"
        >
          <BulletRow text="Builds functional communication during real daily routines." />
          <BulletRow text="Reduces frustration by giving the child a clear way to request." />
          <BulletRow text="Supports language growth through repeated modeling." />
          <BulletRow text="Works well for home, school, therapy, and community settings." />
          <BulletRow text="Can be individualized to favorite items and motivating activities." />
        </SectionCard>

        <SectionCard
          title="Good First Words to Teach"
          subtitle="Start with motivating, high-use words"
        >
          <View style={styles.chipsWrap}>
            {[
              'More',
              'Help',
              'Eat',
              'Drink',
              'Play',
              'All Done',
              'Mom',
              'Dad',
              'Go',
            ].map((item) => (
              <View key={item} style={styles.wordChip}>
                <Text style={styles.wordChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="How to Start Teaching PECS"
          subtitle="A simple step-by-step approach for home use"
        >
          <BulletRow text="Choose 1 to 3 highly motivating cards first." />
          <BulletRow text="Keep the card visible and easy to access." />
          <BulletRow text="Model the card right before giving the desired item or activity." />
          <BulletRow text="Prompt gently if needed, then reinforce immediately." />
          <BulletRow text="Repeat in real routines like meals, play, bath, and transitions." />
        </SectionCard>

        <SectionCard
          title="How to Make a Communication Book"
          subtitle="A simple parent guide for printing cards and assembling a PECS book at home"
        >
          <View style={styles.videoCard}>
            <View style={styles.videoIconWrap}>
              <Ionicons name="play-circle-outline" size={26} color="#4F46E5" />
            </View>

            <View style={styles.videoTextWrap}>
              <Text style={styles.videoTitle}>Watch Communication Book Tutorial</Text>
              <Text style={styles.videoDescription}>
                Learn how to print cards, organize categories, and assemble a basic
                communication book for home or therapy use.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryVideoBtn}
            onPress={() =>
              openUrl(
                'https://www.youtube.com/results?search_query=how+to+make+a+PECS+communication+book'
              )
            }
          >
            <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
            <Text style={styles.primaryVideoBtnText}>Watch Video</Text>
          </TouchableOpacity>

          <View style={styles.bookStepsBox}>
            <Text style={styles.bookStepsTitle}>Quick setup steps</Text>
            <Text style={styles.bookStepText}>• Print the most-used PECS cards first</Text>
            <Text style={styles.bookStepText}>• Laminate them if possible for durability</Text>
            <Text style={styles.bookStepText}>• Use hook-and-loop dots to attach cards</Text>
            <Text style={styles.bookStepText}>
              • Group cards by category like Needs, Food, and Actions
            </Text>
            <Text style={styles.bookStepText}>
              • Put high-frequency request cards on the front page
            </Text>
            <Text style={styles.bookStepText}>
              • Start small, then add more pages as the child learns
            </Text>
          </View>
        </SectionCard>

        <SectionCard
          title="Best Home Teaching Tips"
          subtitle="These habits make PECS more effective"
        >
          <BulletRow text="Teach during real-life moments, not just table time." />
          <BulletRow text="Say the word out loud every time you show the card." />
          <BulletRow text="Use highly preferred toys, foods, and activities." />
          <BulletRow text="Accept early attempts and build from success." />
          <BulletRow text="Keep sessions short, positive, and repeatable." />
        </SectionCard>

        <SectionCard
          title="Helpful Next Steps"
          subtitle="Open related tools inside the app"
        >
          <ActionTile
            icon="print-outline"
            title="Open PECS Printables"
            subtitle="Print cards and materials for home or therapy."
            onPress={() => router.push('/pecs-printables')}
            accent="#4F46E5"
            background="#EEF2FF"
          />

          <ActionTile
            icon="create-outline"
            title="Manage PECS Cards"
            subtitle="Edit, organize, and customize your card library."
            onPress={() => router.push('/manage-pecs')}
            accent="#EA580C"
            background="#FFF7ED"
          />

          <ActionTile
            icon="add-circle-outline"
            title="Create a New Card"
            subtitle="Add a custom PECS card for your child."
            onPress={() => router.push('/pecs-creator')}
            accent="#10B981"
            background="#ECFDF5"
          />
        </SectionCard>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/pecs-printables')}
          >
            <Ionicons name="print-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Open Printables</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/communication/parent-training-hub')}
          >
            <Ionicons name="school-outline" size={18} color="#4F46E5" />
            <Text style={styles.secondaryBtnText}>Back to Parent Hub</Text>
          </TouchableOpacity>
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
    marginBottom: 6,
  },

  sectionSubtitle: {
    color: '#64748B',
    lineHeight: 19,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },

  paragraphText: {
    color: '#334155',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '600',
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bulletText: {
    flex: 1,
    marginLeft: 10,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '600',
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  wordChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },

  wordChipText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },

  videoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  videoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoTextWrap: {
    flex: 1,
    marginLeft: 12,
  },

  videoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  videoDescription: {
    marginTop: 4,
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '600',
  },

  primaryVideoBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },

  primaryVideoBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  },

  bookStepsBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  bookStepsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 8,
  },

  bookStepText: {
    color: '#B45309',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },

  actionTile: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  actionSubtitle: {
    marginTop: 4,
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '600',
  },

  bottomActions: {
    marginTop: 4,
  },

  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },

  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  secondaryBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },
});