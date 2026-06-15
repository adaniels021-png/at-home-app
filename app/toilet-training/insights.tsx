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

export default function ToiletTrainingInsightsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color="#0F172A"
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Smart Insights</Text>
            <Text style={styles.subtitle}>
              Discover potty-training patterns and opportunities.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.lockBadge}>
            <Ionicons
              name="lock-closed"
              size={13}
              color="#FFFFFF"
            />
            <Text style={styles.lockBadgeText}>Pro</Text>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="sparkles-outline"
                size={30}
                color="#7C3AED"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>
                Personalized Potty Insights
              </Text>

              <Text style={styles.heroText}>
                As you log more potty visits, ABA at Home
                will identify patterns and provide
                personalized coaching.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Coming Soon for Pro Members
        </Text>

        <InsightCard
          icon="time-outline"
          title="Best Potty Window"
          description="Identify the times of day when your child is most successful."
          example="Most successes occur between 10:00 AM and 12:00 PM."
        />

        <InsightCard
          icon="trending-up-outline"
          title="Progress Trends"
          description="Track whether success rates are improving week-to-week."
          example="Success rate increased by 18% this week."
        />

        <InsightCard
          icon="warning-outline"
          title="Accident Patterns"
          description="Spot common accident times and routines."
          example="Most accidents happen after dinner."
        />

        <InsightCard
          icon="calendar-outline"
          title="Routine Recommendations"
          description="Receive schedule suggestions based on your logs."
          example="Consider adding a potty sit 15 minutes after lunch."
        />

        <InsightCard
          icon="analytics-outline"
          title="Success Analytics"
          description="See advanced potty training reports and charts."
          example="Average success rate: 72%"
        />

        <View style={styles.upgradeCard}>
          <Ionicons
            name="diamond-outline"
            size={34}
            color="#7C3AED"
          />

          <Text style={styles.upgradeTitle}>
            Unlock Potty Training Pro
          </Text>

          <Text style={styles.upgradeText}>
            Gain access to advanced potty insights,
            coaching tools, printable reports, and
            future multi-caregiver potty tracking.
          </Text>

          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>
              Upgrade to Pro
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#2563EB"
          />

          <Text style={styles.infoText}>
            Insights become more accurate as more potty
            visits are logged over time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type InsightCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  example: string;
};

function InsightCard({
  icon,
  title,
  description,
  example,
}: InsightCardProps) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={24}
            color="#7C3AED"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.insightTitle}>
            {title}
          </Text>

          <Text style={styles.insightDescription}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.exampleBox}>
        <Text style={styles.exampleLabel}>
          Example Insight
        </Text>

        <Text style={styles.exampleText}>
          {example}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },

  heroCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 24,
  },

  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4C1D95',
  },

  heroText: {
    fontSize: 13,
    color: '#6D28D9',
    marginTop: 4,
    lineHeight: 19,
  },

  lockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },

  lockBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },

  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  insightTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  insightDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },

  exampleBox: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  exampleLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  exampleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  upgradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },

  upgradeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 10,
  },

  upgradeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  upgradeButton: {
    marginTop: 16,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },

  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
    fontWeight: '600',
  },
});