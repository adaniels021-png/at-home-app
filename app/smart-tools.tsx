import { Ionicons } from '@expo/vector-icons';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SmartToolsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI Smart Tools</Text>

        <Text style={styles.subtitle}>
          AI-powered support tools for caregivers, communication,
          routines, and ABA guidance.
        </Text>

        <View style={styles.grid}>
          <ToolCard
            icon="bulb-outline"
            title="Behavior Help"
            text="Get suggestions for difficult behaviors."
          />

          <ToolCard
            icon="chatbubble-ellipses-outline"
            title="Communication"
            text="Generate communication ideas and prompts."
          />

          <ToolCard
            icon="calendar-outline"
            title="Routine Builder"
            text="Create structured home routines."
          />

          <ToolCard
            icon="school-outline"
            title="Lesson Support"
            text="Get extra help for lesson teaching."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolCard({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color="#7C3AED" />
      </View>

      <Text style={styles.cardTitle}>{title}</Text>

      <Text style={styles.cardText}>{text}</Text>
    </TouchableOpacity>
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

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 22,
    fontSize: 15,
    marginBottom: 24,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },

  cardText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
});