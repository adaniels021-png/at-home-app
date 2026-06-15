import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FAVORITES_KEY,
  VIDEOS,
  VIDEO_CATEGORIES,
  VideoCategory,
  getCurrentRotationWeek,
} from '../lib/videosData';

export default function VideoHubScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>('Communication');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isChildLocked, setIsChildLocked] = useState(false);
  const [lockProgress] = useState(new Animated.Value(0));
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentWeek = getCurrentRotationWeek(6);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) setFavoriteIds(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load video favorites:', error);
      }
    };

    void loadFavorites();
  }, []);

  const toggleFavorite = async (videoId: string) => {
    const updated = favoriteIds.includes(videoId)
      ? favoriteIds.filter((id) => id !== videoId)
      : [...favoriteIds, videoId];

    setFavoriteIds(updated);

    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving video favorites:', error);
    }
  };

  const CATEGORY_COLORS: Record<
  VideoCategory,
  { bg: string; text: string }
> = {
  Communication: {
    bg: '#DBEAFE',
    text: '#1D4ED8',
  },
  Sensory: {
    bg: '#CCFBF1',
    text: '#0F766E',
  },
  'Fun Learning': {
    bg: '#F3E8FF',
    text: '#7C3AED',
  },
  Favorites: {
    bg: '#FFE4E6',
    text: '#E11D48',
  },
};

  const filteredVideos = useMemo(() => {
    if (selectedCategory === 'Favorites') {
      return VIDEOS.filter((video) => favoriteIds.includes(video.id));
    }

    return VIDEOS.filter(
      (video) => video.category === selectedCategory && video.week === currentWeek
    );
  }, [selectedCategory, favoriteIds, currentWeek]);

 const normalizeYouTubeUrl = (url: string) => {
  if (!url) return null;

  const trimmed = url.trim();

  if (trimmed.includes('youtube.com/playlist?list=')) {
    return trimmed;
  }

  if (trimmed.includes('youtube.com/watch?v=')) {
    return trimmed;
  }

  if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  }

  if (trimmed.includes('youtube.com/embed/')) {
    const videoId = trimmed.split('embed/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  }

  if (trimmed.startsWith('http')) {
    return trimmed;
  }

  return null;
};

const handlePlayVideo = async (url: string) => {
  const safeUrl = normalizeYouTubeUrl(url);

  if (!safeUrl) {
    Alert.alert(
      'Video unavailable',
      'This video link is missing or no longer works.'
    );
    return;
  }

  try {
    await WebBrowser.openBrowserAsync(safeUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  } catch (error) {
    console.error('Could not open video:', error);

    Alert.alert(
      'Playback Error',
      'This video could not be opened. It may have been removed or restricted.'
    );
  }
};

  const handleLockPressIn = () => {
    Animated.timing(lockProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    holdTimer.current = setTimeout(() => {
      setIsChildLocked((prev) => !prev);
      lockProgress.setValue(0);
    }, 3000);
  };

  const handleLockPressOut = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);

    Animated.timing(lockProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const lockInterpolateColor = lockProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#475569', '#14B8A6'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {isChildLocked && (
        <View style={styles.childModeBanner}>
          <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
          <Text style={styles.childModeBannerText}>Child Protection Mode Active</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, isChildLocked && styles.contentChildMode]}
        showsVerticalScrollIndicator={false}
      >
        {!isChildLocked && (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/(tabs)');
                }}
              >
                <Ionicons name="arrow-back" size={22} color="#0F172A" />
              </TouchableOpacity>

              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Video Hub</Text>
                <Text style={styles.headerSubtitle}>Curated parent-selected videos</Text>
              </View>

              <TouchableOpacity style={styles.lockButton} onPress={() => setIsChildLocked(true)}>
                <Ionicons name="lock-open-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
  <View style={styles.heroDecoration1} />
  <View style={styles.heroDecoration2} />

  <View style={styles.heroTopRow}>
                <View style={styles.parentBadge}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                  <Text style={styles.parentBadgeText}>Weekly Rotation</Text>
                </View>

                <View style={styles.weekPill}>
                  <Text style={styles.weekPillText}>Week {currentWeek}/6</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Helpful Videos for Home Practice</Text>
             <Text style={styles.heroText}>
               Browse communication, sensory, and fun learning videos...
              </Text>

            </View>

          <View style={styles.tabsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {VIDEO_CATEGORIES.map((category) => {
                  const active = selectedCategory === category;

                  return (
                    <TouchableOpacity
                      key={category}
                      style={[styles.tabChip, active && styles.tabChipActive]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>
               {selectedCategory === 'Favorites' ? 'Saved Videos' : `${selectedCategory} Videos`}
           </Text>

           <Text style={styles.sectionCount}>
             {filteredVideos.length} videos
          </Text>
        </View>
          </>
        )}

        {filteredVideos.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-outline" size={30} color="#64748B" />
            </View>
            <Text style={styles.emptyTitle}>No saved videos yet</Text>
            <Text style={styles.emptyText}>
              Tap the heart on any video card to save it here for quick access later.
            </Text>
          </View>
        ) : (
          filteredVideos.map((video) => {
            const isFavorite = favoriteIds.includes(video.id);

            return (
              <View key={video.id} style={[styles.videoCard, isChildLocked && styles.videoCardChildMode]}>
                <View style={styles.thumbnailWrapper}>
                 <Image
  source={{ uri: video.thumbnail }}
  style={styles.thumbnail}
/>

                  <View
  style={[
    styles.categoryBadge,
    {
      backgroundColor:
        CATEGORY_COLORS[video.category].bg,
    },
  ]}
>
  <Text
    style={[
      styles.categoryBadgeText,
      {
        color:
          CATEGORY_COLORS[video.category].text,
      },
    ]}
  >
    {video.category}
  </Text>
</View>

                  {!isChildLocked && (
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={() => void toggleFavorite(video.id)}
                    >
                      <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isFavorite ? '#EF4444' : '#FFFFFF'}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.videoContent}>
                  <Text style={[styles.videoTitle, isChildLocked && styles.videoTitleChildMode]}>
                    {video.title}
                  </Text>

                  {!isChildLocked && (
                    <>
                      <Text style={styles.videoDescription}>{video.description}</Text>

                      {video.parentTip && (
                        <View style={styles.tipBox}>
  <View style={styles.tipHeader}>
    <Ionicons
      name="bulb"
      size={14}
      color="#7C3AED"
    />
    <Text style={styles.tipLabel}>
      Parent Tip
    </Text>
  </View>

  <Text style={styles.tipText}>
    {video.parentTip}
  </Text>
</View>
                      )}
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.watchButton, isChildLocked && styles.watchButtonChildMode]}
                    onPress={() => void handlePlayVideo(video.youtubeUrl)}
                  >
                    <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.watchButtonText}>
                      {isChildLocked ? 'Tap to Play Video' : 'Open Video'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {isChildLocked && (
          <View style={styles.lockMechanismWrap}>
            <Animated.View style={[styles.lockProgressTrack, { backgroundColor: lockInterpolateColor }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={handleLockPressIn}
                onPressOut={handleLockPressOut}
                style={styles.lockIconButton}
              >
                <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.lockHelpText}>Press and hold 3 seconds to unlock</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 44 },
  contentChildMode: { paddingTop: 14, paddingBottom: 100 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerTextWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  headerSubtitle: { marginTop: 2, fontSize: 11, fontWeight: '700', color: '#64748B' },

  childModeBanner: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childModeBannerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', marginLeft: 6 },

  heroCard: {
    backgroundColor: '#ECFEFF',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parentBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11, marginLeft: 6 },
  weekPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  weekPillText: { color: '#0369A1', fontSize: 11, fontWeight: '900' },
  heroTitle: { color: '#0F172A', fontSize: 23, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  heroText: { color: '#475569', fontSize: 13, lineHeight: 20, fontWeight: '600' },
 
  tabsWrap: { marginBottom: 18 },
  tabChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
 tabChipActive: {
  backgroundColor: '#2563EB',
  borderColor: '#2563EB',
  shadowColor: '#2563EB',
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: {
    width: 0,
    height: 4,
  },
  elevation: 3,
},

  tabChipText: { color: '#475569', fontWeight: '800', fontSize: 13 },
  tabChipTextActive: { color: '#FFFFFF' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  sectionCount: { fontSize: 12, fontWeight: '800', color: '#64748B' },

  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  videoCardChildMode: {
    borderRadius: 30,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnailWrapper: { position: 'relative', backgroundColor: '#E2E8F0' },
  thumbnail: { width: '100%', height: 190 },
  categoryBadge: {
  position: 'absolute',
  bottom: 12,
  left: 12,
  borderRadius: 999,
  paddingVertical: 6,
  paddingHorizontal: 12,
},

categoryBadgeText: {
  fontSize: 11,
  fontWeight: '900',
},
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15,23,42,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoContent: { padding: 16 },
  videoTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  videoTitleChildMode: { fontSize: 20, textAlign: 'center', paddingVertical: 6 },
  videoDescription: { marginTop: 7, color: '#64748B', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  tipBox: {
  marginTop: 12,
  backgroundColor: '#F5F3FF',
  borderRadius: 16,
  padding: 12,
},
 tipText: {
  color: '#6D28D9',
  fontSize: 12,
  lineHeight: 18,
  fontWeight: '700',
},

  watchButton: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  watchButtonChildMode: { backgroundColor: '#14B8A6', paddingVertical: 18, borderRadius: 22, marginTop: 10 },
  watchButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginLeft: 8 },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '900', color: '#0F172A' },
  emptyText: { marginTop: 6, color: '#64748B', textAlign: 'center', lineHeight: 19, fontWeight: '600' },

  lockMechanismWrap: { alignItems: 'center', marginTop: 15, marginBottom: 30 },
  lockProgressTrack: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockHelpText: { marginTop: 10, fontSize: 12, fontWeight: '800', color: '#64748B' },

  heroDecoration1: {
  position: 'absolute',
  top: -30,
  right: -20,
  width: 90,
  height: 90,
  borderRadius: 45,
  backgroundColor: 'rgba(59,130,246,0.06)',
},

heroDecoration2: {
  position: 'absolute',
  bottom: -20,
  left: -10,
  width: 70,
  height: 70,
  borderRadius: 35,
  backgroundColor: 'rgba(20,184,166,0.05)',
},

tipHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},

tipLabel: {
  marginLeft: 6,
  color: '#7C3AED',
  fontWeight: '900',
  fontSize: 12,
},
});