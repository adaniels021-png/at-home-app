import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CURRICULUM_CATEGORIES } from '../../lib/curriculum';
import {
  LessonLibraryItem,
  getLessonLibraryItems,
} from '../../lib/lessonLibrary';

export default function AdminLessonLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
  category?: string;
  skill?: string;
  stageNumber?: string;
}>();

const routeCategory = params.category ? String(params.category) : '';
const routeSkill = params.skill ? String(params.skill) : '';
const routeStageNumber = params.stageNumber ? Number(params.stageNumber) : null;

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonLibraryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('All');

const filteredLessons = lessons.filter((lesson) => {
  const matchesCategory =
    selectedCategory === 'All' || lesson.category === selectedCategory;

  const matchesSkill =
    !routeSkill || lesson.skill_area === routeSkill;

  const matchesStage =
    !routeStageNumber || Number(lesson.stage_number || 1) === routeStageNumber;

  return matchesCategory && matchesSkill && matchesStage;
});

useEffect(() => {
  if (routeCategory) {
    setSelectedCategory(routeCategory);
  }
}, [routeCategory]);

  async function loadLessons() {
    try {
      const data = await getLessonLibraryItems();
      setLessons(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadLessons();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadLessons();
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#29145F" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin Lesson Library</Text>
          <Text style={styles.subtitle}>
  {routeSkill
    ? `${routeSkill}${routeStageNumber ? ` · Stage ${routeStageNumber}` : ''}`
    : 'Review and manage lesson content'}
</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
  <TouchableOpacity
    style={styles.actionButton}
    onPress={() => router.push('/admin/create-lesson' as any)}
  >
    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
    <Text style={styles.actionButtonText}>Create Lesson</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.secondaryActionButton}
    onPress={() => router.push('/admin/lesson-review' as any)}
  >
    <Ionicons name="clipboard-outline" size={18} color="#7C3AED" />
    <Text style={styles.secondaryActionButtonText}>Review Queue</Text>
  </TouchableOpacity>
</View>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.filterRow}
>
  {['All', ...CURRICULUM_CATEGORIES].map((item) => {
    const active = selectedCategory === item;

    return (
      <TouchableOpacity
        key={item}
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={() => setSelectedCategory(item)}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>

      <FlatList
        data={filteredLessons}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
          />
        }
        contentContainerStyle={styles.listContent}
    renderItem={({ item }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      router.push(`/admin/lesson-review/${item.id}` as any)
    }
  >
    <View style={styles.cardTop}>
      <Text style={styles.category}>
        {item.category || 'General'}
      </Text>

      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </View>

    <Text style={styles.lessonTitle}>{item.title}</Text>

    <Text style={styles.skill}>
      {item.skill_area || 'Skill Area'}
    </Text>

    <View style={styles.footerRow}>
      <View
        style={[
          styles.statusBadge,
          item.is_active ? styles.activeBadge : styles.inactiveBadge,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            item.is_active ? styles.activeText : styles.inactiveText,
          ]}
        >
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>

      <Text style={styles.stage}>
        Stage {item.stage_number || 1}
      </Text>
    </View>

    <TouchableOpacity
      style={styles.editButton}
      onPress={() => router.push(`/admin/lesson-review/${item.id}` as any)}
    >
      <Ionicons name="create-outline" size={17} color="#4F46E5" />
      <Text style={styles.editButtonText}>Edit Lesson</Text>
    </TouchableOpacity>
  </TouchableOpacity>
)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F1',
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontSize: 26,
    fontWeight: '900',
    color: '#201047',
  },

  subtitle: {
    color: '#7C6F92',
    marginTop: 2,
    fontWeight: '700',
  },

  listContent: {
    padding: 20,
    paddingBottom: 120,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  category: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 12,
  },

  lessonTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E1B4B',
    marginBottom: 6,
  },

  skill: {
    color: '#64748B',
    fontWeight: '700',
  },

  footerRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  activeBadge: {
    backgroundColor: '#DCFCE7',
  },

  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontWeight: '800',
    fontSize: 12,
  },

  activeText: {
    color: '#15803D',
  },

  inactiveText: {
    color: '#DC2626',
  },

  stage: {
    color: '#64748B',
    fontWeight: '700',
  },

  actionRow: {
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 20,
  marginBottom: 6,
},

actionButton: {
  flex: 1,
  height: 46,
  borderRadius: 16,
  backgroundColor: '#7C3AED',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
},

actionButtonText: {
  marginLeft: 7,
  color: '#FFFFFF',
  fontWeight: '900',
},

secondaryActionButton: {
  flex: 1,
  height: 46,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  borderWidth: 1,
  borderColor: '#E9D5FF',
},

secondaryActionButtonText: {
  marginLeft: 7,
  color: '#7C3AED',
  fontWeight: '900',
},

editButton: {
  marginTop: 14,
  height: 44,
  borderRadius: 16,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
},

editButtonText: {
  marginLeft: 6,
  color: '#4F46E5',
  fontWeight: '900',
},

filterRow: {
  paddingHorizontal: 20,
  paddingBottom: 12,
  gap: 8,
},

filterChip: {
  backgroundColor: '#FFFFFF',
  borderRadius: 999,
  paddingHorizontal: 13,
  paddingVertical: 9,
  borderWidth: 1,
  borderColor: '#E9D5FF',
},

filterChipActive: {
  backgroundColor: '#7C3AED',
  borderColor: '#7C3AED',
},

filterChipText: {
  color: '#7C3AED',
  fontWeight: '900',
  fontSize: 12,
},

filterChipTextActive: {
  color: '#FFFFFF',
},
});