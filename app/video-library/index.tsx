import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import {
  FAVORITES_KEY,
  VIDEOS,
  VIDEO_CATEGORIES,
  VideoCategory,
} from '../../lib/videosData';

function getYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : '';
}

export default function VideoLibraryScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<VideoCategory>('Communication');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavoriteIds(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to sync library favorites:', error);
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
      console.error('Error saving storage records:', error);
    }
  };

  const filteredVideos = useMemo(() => {
    return VIDEOS.filter((video) => {
      const matchesCategory =
        activeCategory === 'Favorites'
          ? favoriteIds.includes(video.id)
          : video.category === activeCategory;

      const matchesSearch =
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.parentTip && video.parentTip.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, favoriteIds, searchQuery]);

  const handlePlayVideo = (url: string) => {
    const id = getYouTubeId(url);
    if (id) {
      setIsVideoLoading(true);
      setActiveVideoId(id);
    } else {
      Alert.alert('Playback Error', 'Could not open video framework.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resource Library</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search titles, skills, or curriculum tips..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {VIDEO_CATEGORIES.map((category) => {
              const active = activeCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.tabChip, active && styles.tabChipActive]}
                  onPress={() => setActiveCategory(category)}
                >
                  <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredVideos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={42} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No matching items found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your spelling or toggle to a different educational branch above.
            </Text>
          </View>
        ) : (
          filteredVideos.map((video) => {
            const isFavorite = favoriteIds.includes(video.id);

            return (
              <View key={video.id} style={styles.videoCard}>
                <View style={styles.thumbnailWrapper}>
                  <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
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
                  
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>Week {video.week}</Text>
                  </View>
                </View>

                <View style={styles.videoContent}>
                  <View style={styles.metaRow}>
                    <View style={styles.ageBadge}>
                      <Ionicons name="person-outline" size={12} color="#4F46E5" />
                      <Text style={styles.ageBadgeText}>{video.ageRange}</Text>
                    </View>
                  </View>

                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoDescription}>{video.description}</Text>

                  {video.parentTip && (
                    <View style={styles.tipBox}>
                      <Ionicons name="bulb-outline" size={16} color="#7C3AED" style={{ marginTop: 1 }} />
                      <Text style={styles.tipText}>{video.parentTip}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() => handlePlayVideo(video.youtubeUrl)}
                  >
                    <Ionicons name="play-circle" size={18} color="#4F46E5" />
                    <Text style={styles.previewButtonText}>Preview Content Stream</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={activeVideoId !== null}
        animationType="fade"
        onRequestClose={() => setActiveVideoId(null)}
      >
        <View style={styles.modalVideoContainer}>
          {activeVideoId && (
            <View style={{ flex: 1, position: 'relative' }}>
              <WebView
                style={styles.webviewPlayer}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsFullscreenVideo={true}
                mediaPlaybackRequiresUserAction={false}
                onLoadEnd={() => setIsVideoLoading(false)}
                originWhitelist={['*']}
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                      <style>
                        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000000; overflow: hidden; }
                        #player { width: 100%; height: 100%; position: absolute; top:0; left:0; }
                      </style>
                    </head>
                    <body>
                      <div id="player"></div>
                      <script>
                        var tag = document.createElement('script');
                        tag.src = "https://www.youtube.com/iframe_api";
                        var firstScriptTag = document.getElementsByTagName('script')[0];
                        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                        var player;
                        function onYouTubeIframeAPIReady() {
                          player = new YT.Player('player', {
                            videoId: '${activeVideoId}',
                            playerVars: {
                              'autoplay': 1,
                              'controls': 1,
                              'modestbranding': 1,
                              'rel': 0,
                              'showinfo': 0,
                              'loop': 0,
                              'origin': 'https://www.youtube.com'
                            },
                            events: {
                              'onReady': onPlayerReady
                            }
                          });
                        }

                        function onPlayerReady(event) {
                          event.target.playVideo();
                        }
                      </script>
                    </body>
                    </html>
                  `,
                }}
              />
              
              {isVideoLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                </View>
              )}
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.closeModalButton} 
            onPress={() => {
              setIsVideoLoading(false);
              setActiveVideoId(null);
            }}
          >
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            <Text style={styles.closeModalText}>Exit Preview</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: '#0F172A' },
  headerSpacer: { width: 40 },
  searchSection: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 14, height: 48, marginBottom: 14 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '700' },
  tabsWrap: { marginBottom: 12 },
  tabChip: { backgroundColor: '#F1F5F9', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  tabChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  tabChipText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
  tabChipTextActive: { color: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40 },
  videoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  thumbnailWrapper: { position: 'relative' },
  thumbnail: { width: '100%', height: 180 },
  favoriteButton: { position: 'absolute', top: 12, right: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center' },
  weekBadge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: '#0F172A', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  weekBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  videoContent: { padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ageBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  ageBadgeText: { color: '#4F46E5', fontSize: 11, fontWeight: '900' },
  videoTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  videoDescription: { marginTop: 6, color: '#64748B', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  tipBox: { marginTop: 12, backgroundColor: '#F5F3FF', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start' },
  tipText: { flex: 1, marginLeft: 8, color: '#6D28D9', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  previewButton: { marginTop: 14, backgroundColor: '#EEF2FF', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#C7D2FE' },
  previewButtonText: { color: '#4F46E5', fontSize: 13, fontWeight: '900', marginLeft: 6 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 20 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '900', color: '#0F172A' },
  emptyText: { marginTop: 6, color: '#64748B', textAlign: 'center', lineHeight: 19, fontWeight: '600' },
  modalVideoContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  webviewPlayer: { flex: 1, backgroundColor: '#000000' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  closeModalButton: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  closeModalText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, marginLeft: 6 },
});