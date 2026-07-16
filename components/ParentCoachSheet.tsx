import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export type CoachSection = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  items: string[];
};

type ParentCoachSheetProps = {
  visible: boolean;
  onClose: () => void;
  lessonTitle?: string;
  stepIndex: number;
  totalSteps: number;
  sections: CoachSection[];
};

export default function ParentCoachSheet({
  visible,
  onClose,
  lessonTitle,
  stepIndex,
  totalSteps,
  sections,
}: ParentCoachSheetProps) {
  const usableSections = useMemo(
    () => sections.filter((section) => section.items.length > 0),
    [sections]
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={20} color="#6D28D9" />
            </View>

            <View style={styles.headerTextWrap}>
              <Text style={styles.eyebrow}>PARENT COACH</Text>
              <Text style={styles.title}>Help for this step</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {lessonTitle || 'Today’s lesson'} · Step {stepIndex + 1} of {totalSteps}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Parent Coach"
              hitSlop={10}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {usableSections.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={22} color="#7C3AED" />
                <Text style={styles.emptyTitle}>Keep it simple and positive</Text>
                <Text style={styles.emptyText}>
                  Give one clear direction, wait a few seconds, and praise any meaningful attempt.
                </Text>
              </View>
            ) : (
              usableSections.map((section) => (
                <View
                  key={section.key}
                  style={[styles.sectionCard, { backgroundColor: section.backgroundColor }]}
                >
                  <View style={styles.sectionHeader}>
                    <View
                      style={[
                        styles.sectionIcon,
                        { backgroundColor: `${section.color}18` },
                      ]}
                    >
                      <Ionicons name={section.icon} size={18} color={section.color} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: section.color }]}> 
                      {section.title}
                    </Text>
                  </View>

                  {section.items.map((item, index) => (
                    <View key={`${section.key}-${index}`} style={styles.itemRow}>
                      <View style={[styles.bullet, { backgroundColor: section.color }]} />
                      <Text style={styles.itemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Back to Lesson</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  sheet: { maxHeight: '82%', backgroundColor: '#F8FAFC', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 22, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20 },
  handle: { width: 46, height: 5, borderRadius: 999, alignSelf: 'center', backgroundColor: '#CBD5E1', marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTextWrap: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '900', color: '#7C3AED', letterSpacing: 0.8 },
  title: { marginTop: 2, fontSize: 20, fontWeight: '900', color: '#0F172A' },
  subtitle: { marginTop: 3, fontSize: 12.5, lineHeight: 18, fontWeight: '700', color: '#64748B' },
  closeButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  scrollContent: { paddingBottom: 8 },
  sectionCard: { borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.20)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 },
  sectionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '900' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 999, marginTop: 7, marginRight: 9 },
  itemText: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '700', color: '#334155' },
  emptyCard: { borderRadius: 22, backgroundColor: '#F5F3FF', padding: 18, alignItems: 'center', marginBottom: 12 },
  emptyTitle: { marginTop: 8, fontSize: 16, fontWeight: '900', color: '#312E81' },
  emptyText: { marginTop: 6, textAlign: 'center', fontSize: 13.5, lineHeight: 20, color: '#5B21B6', fontWeight: '700' },
  doneButton: { marginTop: 4, borderRadius: 18, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5' },
  doneButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
