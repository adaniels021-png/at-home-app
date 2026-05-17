import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type VideoCategory = 'Communication' | 'Sensory' | 'Fun Learning' | 'Favorites';

type VideoItem = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnail: string;
  category: VideoCategory;
  ageRange: string;
  parentTip: string;
  week: number;
};

const VIDEO_CATEGORIES: VideoCategory[] = [
  'Communication',
  'Sensory',
  'Fun Learning',
  'Favorites',
];

const VIDEOS: VideoItem[] = [
  {
    id: 'communication-w1-1',
    week: 1,
    category: 'Communication',
    title: 'Pablo – How Are You?',
    description:
      'A calm cartoon that helps children understand greetings, feelings, and answering “How are you?”',
    youtubeUrl: 'https://www.youtube.com/watch?v=rx4Po9DS5DA',
    thumbnail: 'https://img.youtube.com/vi/rx4Po9DS5DA/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Pause after greetings and model simple responses like “I feel happy,” “I feel sad,” or “I need help.”',
  },
  {
    id: 'communication-w1-2',
    week: 1,
    category: 'Communication',
    title: 'Pablo – Learning with Friends Compilation',
    description:
      'A calm cartoon compilation focused on friendship, emotions, and communication.',
    youtubeUrl: 'https://www.youtube.com/watch?v=KZdipcMG_cU',
    thumbnail: 'https://img.youtube.com/vi/KZdipcMG_cU/hqdefault.jpg',
    ageRange: 'Ages 3–8',
    parentTip:
      'Watch in short sections. After each scene, ask one simple question or model one phrase your child can copy.',
  },
  {
    id: 'communication-w2-1',
    week: 2,
    category: 'Communication',
    title: 'Hi, Hello Song',
    description:
      'A greeting song that supports hello, goodbye, social routines, and simple imitation.',
    youtubeUrl: 'https://www.youtube.com/watch?v=T-wvRTDieGQ',
    thumbnail: 'https://img.youtube.com/vi/T-wvRTDieGQ/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Practice waving, saying hello, or using a gesture each time the greeting repeats.',
  },
  {
    id: 'communication-w2-2',
    week: 2,
    category: 'Communication',
    title: 'How Do We Say Hello',
    description:
      'A preschool greeting song that helps children practice social communication.',
    youtubeUrl: 'https://www.youtube.com/watch?v=p3XPRgf4qG4',
    thumbnail: 'https://img.youtube.com/vi/p3XPRgf4qG4/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Pause after “hello” and prompt your child to wave, look, sign, use PECS, or vocalize.',
  },
  {
    id: 'communication-w3-1',
    week: 3,
    category: 'Communication',
    title: 'Good Manners for Kids',
    description:
      'A child-friendly video about greetings, please, thank you, and polite communication.',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZbSZCBYKfHk',
    thumbnail: 'https://img.youtube.com/vi/ZbSZCBYKfHk/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Choose one phrase to practice after the video, such as “please,” “thank you,” or “help me.”',
  },
  {
    id: 'communication-w3-2',
    week: 3,
    category: 'Communication',
    title: 'Take Turns to Speak',
    description:
      'A social-skills video focused on conversation, waiting, and taking turns while talking.',
    youtubeUrl: 'https://www.youtube.com/watch?v=JscDaqa1z5Y',
    thumbnail: 'https://img.youtube.com/vi/JscDaqa1z5Y/hqdefault.jpg',
    ageRange: 'Ages 4–8',
    parentTip:
      'Practice “my turn” and “your turn” with a toy, snack, or short conversation after watching.',
  },

  {
    id: 'sensory-w1-1',
    week: 1,
    category: 'Sensory',
    title: 'Amazing Things Happen!',
    description:
      'A gentle animated video that explains autism, sensory differences, and acceptance.',
    youtubeUrl: 'https://www.youtube.com/watch?v=Ezv85LMFx2E',
    thumbnail: 'https://img.youtube.com/vi/Ezv85LMFx2E/hqdefault.jpg',
    ageRange: 'Ages 5–10',
    parentTip:
      'Use this as a family teaching video. Talk about how everyone’s body and brain can experience the world differently.',
  },
  {
    id: 'sensory-w1-2',
    week: 1,
    category: 'Sensory',
    title: 'Sesame Street – Feeling Worried',
    description:
      'A gentle video about worry and using breathing to feel calmer.',
    youtubeUrl: 'https://www.youtube.com/watch?v=cHdNB6zqewU',
    thumbnail: 'https://img.youtube.com/vi/cHdNB6zqewU/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Practice the breathing strategy before your child is upset so it becomes familiar.',
  },
  {
    id: 'sensory-w2-1',
    week: 2,
    category: 'Sensory',
    title: 'Breathe Like a Butterfly',
    description:
      'A Sesame Street calming activity for big feelings and regulation.',
    youtubeUrl: 'https://www.youtube.com/watch?v=3jmDVNaI3uU',
    thumbnail: 'https://img.youtube.com/vi/3jmDVNaI3uU/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Model the breathing with your child. Keep your voice calm and praise any attempt to copy.',
  },
  {
    id: 'sensory-w2-2',
    week: 2,
    category: 'Sensory',
    title: 'Sesame Street – Calmful Breathing',
    description:
      'A kid-friendly breathing video that supports calming and emotional regulation.',
    youtubeUrl: 'https://www.youtube.com/watch?v=MHFG8JR_ueI',
    thumbnail: 'https://img.youtube.com/vi/MHFG8JR_ueI/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Use this during calm moments first, then add it to transition or frustration routines.',
  },
  {
    id: 'sensory-w3-1',
    week: 3,
    category: 'Sensory',
    title: 'Count, Breathe, Relax',
    description:
      'Cookie Monster and Count practice a simple calming breathing exercise.',
    youtubeUrl: 'https://www.youtube.com/watch?v=n66r5Y6wguc',
    thumbnail: 'https://img.youtube.com/vi/n66r5Y6wguc/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Practice counting and breathing together. Use the same words later when your child needs support.',
  },
  {
    id: 'sensory-w3-2',
    week: 3,
    category: 'Sensory',
    title: 'Bubble Breathing with Abby Cadabby',
    description:
      'A calming breathing video using bubbles as a visual support.',
    youtubeUrl: 'https://www.youtube.com/watch?v=o9w8oXmEO04',
    thumbnail: 'https://img.youtube.com/vi/o9w8oXmEO04/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Pair the video with real bubbles or pretend bubbles to make breathing more concrete.',
  },

  {
    id: 'fun-w1-1',
    week: 1,
    category: 'Fun Learning',
    title: 'Ms. Rachel – Speech and Learning Practice',
    description:
      'Speech-friendly songs, imitation, gestures, and early communication learning.',
    youtubeUrl: 'https://www.youtube.com/watch?v=hTqtGJwsJVE',
    thumbnail: 'https://img.youtube.com/vi/hTqtGJwsJVE/hqdefault.jpg',
    ageRange: 'Ages 1–5',
    parentTip:
      'Sit with your child and model gestures or words. Reinforce any sound, sign, gesture, or attempt.',
  },
  {
    id: 'fun-w1-2',
    week: 1,
    category: 'Fun Learning',
    title: 'Super Simple Songs – Walking in the Jungle',
    description:
      'A fun interactive learning song for movement, imitation, listening, and animals.',
    youtubeUrl: 'https://www.youtube.com/watch?v=GoSq-yZcJ-4',
    thumbnail: 'https://img.youtube.com/vi/GoSq-yZcJ-4/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Pause the video and encourage imitation of motions, animal sounds, and action words.',
  },
  {
    id: 'fun-w2-1',
    week: 2,
    category: 'Fun Learning',
    title: 'Daniel Tiger – You Can Take a Turn',
    description:
      'A PBS KIDS song about turn-taking, waiting, and sharing.',
    youtubeUrl: 'https://www.youtube.com/watch?v=SNzirLwzs_0',
    thumbnail: 'https://img.youtube.com/vi/SNzirLwzs_0/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Practice turn-taking immediately after watching with a toy, ball, or simple game.',
  },
  {
    id: 'fun-w2-2',
    week: 2,
    category: 'Fun Learning',
    title: 'Daniel Tiger – Sharing is Fun for Me',
    description:
      'A cartoon song that supports sharing, peer play, and social learning.',
    youtubeUrl: 'https://www.youtube.com/watch?v=Zx92MUYdtgU',
    thumbnail: 'https://img.youtube.com/vi/Zx92MUYdtgU/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Use “share” and “my turn/your turn” language during a short play activity afterward.',
  },
  {
    id: 'fun-w3-1',
    week: 3,
    category: 'Fun Learning',
    title: 'Bluey – Sleepytime Full Episode',
    description:
      'A calm cartoon episode that can support bedtime, imagination, and emotional connection.',
    youtubeUrl: 'https://www.youtube.com/watch?v=TxoqJ0Pmux0',
    thumbnail: 'https://img.youtube.com/vi/TxoqJ0Pmux0/hqdefault.jpg',
    ageRange: 'Ages 2–7',
    parentTip:
      'Use during calm-down or bedtime routines. Talk briefly about comfort, feelings, and family.',
  },
  {
    id: 'fun-w3-2',
    week: 3,
    category: 'Fun Learning',
    title: 'Pinkfong – Share My Emotions',
    description:
      'A colorful learning song about identifying and sharing emotions.',
    youtubeUrl: 'https://www.youtube.com/watch?v=GQFWg0hafIA',
    thumbnail: 'https://img.youtube.com/vi/GQFWg0hafIA/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'After the song, ask your child to point to or choose a feeling using words, gestures, or visuals.',
  },
  {
  id: 'communication-w4-1',
  week: 4,
  category: 'Communication',
  title: 'Asking for Help Song',
  description:
    'A simple social learning song teaching children how to ask for help appropriately.',
  youtubeUrl: 'https://www.youtube.com/watch?v=1MJsz7mStoA',
  thumbnail: 'https://img.youtube.com/vi/1MJsz7mStoA/hqdefault.jpg',
  ageRange: 'Ages 3–7',
  parentTip:
    'Pause after “help” phrases and encourage your child to imitate the words, sign, or gesture.',
},

{
  id: 'communication-w4-2',
  week: 4,
  category: 'Communication',
  title: 'Please and Thank You Song',
  description:
    'A preschool-friendly song teaching polite communication and social phrases.',
  youtubeUrl: 'https://www.youtube.com/watch?v=2hjG7Jr4Y3M',
  thumbnail: 'https://img.youtube.com/vi/2hjG7Jr4Y3M/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Practice “please” and “thank you” naturally during snack time or play immediately after watching.',
},

{
  id: 'communication-w5-1',
  week: 5,
  category: 'Communication',
  title: 'The Feelings Song',
  description:
    'A learning song that teaches children to identify and label emotions.',
  youtubeUrl: 'https://www.youtube.com/watch?v=ZxfJicfyCdg',
  thumbnail: 'https://img.youtube.com/vi/ZxfJicfyCdg/hqdefault.jpg',
  ageRange: 'Ages 3–7',
  parentTip:
    'Pause and label emotions together using words, gestures, PECS, or AAC.',
},

{
  id: 'communication-w5-2',
  week: 5,
  category: 'Communication',
  title: 'Learn to Listen',
  description:
    'A social skills learning video focused on listening and following directions.',
  youtubeUrl: 'https://www.youtube.com/watch?v=mGTXttPLUQ4',
  thumbnail: 'https://img.youtube.com/vi/mGTXttPLUQ4/hqdefault.jpg',
  ageRange: 'Ages 3–7',
  parentTip:
    'Practice one-step directions after the video like “sit down,” “clap,” or “come here.”',
},

{
  id: 'communication-w6-1',
  week: 6,
  category: 'Communication',
  title: 'What’s Your Name?',
  description:
    'A simple greeting and social communication song for preschool learners.',
  youtubeUrl: 'https://www.youtube.com/watch?v=BAFSTrSNJMg',
  thumbnail: 'https://img.youtube.com/vi/BAFSTrSNJMg/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Practice introducing family members or stuffed animals after watching.',
},

{
  id: 'communication-w6-2',
  week: 6,
  category: 'Communication',
  title: 'Can You Say It Too?',
  description:
    'A language imitation and sound-learning video encouraging speech attempts.',
  youtubeUrl: 'https://www.youtube.com/watch?v=jh8zlfy8kzM',
  thumbnail: 'https://img.youtube.com/vi/jh8zlfy8kzM/hqdefault.jpg',
  ageRange: 'Ages 1–5',
  parentTip:
    'Reinforce all communication attempts including gestures, approximations, signs, or AAC responses.',
},

{
  id: 'sensory-w4-1',
  week: 4,
  category: 'Sensory',
  title: 'Mindful Breathing for Kids',
  description:
    'A calming breathing activity helping children regulate emotions and body energy.',
  youtubeUrl: 'https://www.youtube.com/watch?v=wf5K3pP2IUQ',
  thumbnail: 'https://img.youtube.com/vi/wf5K3pP2IUQ/hqdefault.jpg',
  ageRange: 'Ages 4–8',
  parentTip:
    'Practice this before stressful activities, appointments, or transitions.',
},

{
  id: 'sensory-w4-2',
  week: 4,
  category: 'Sensory',
  title: 'Rainbow Relaxation',
  description:
    'A visual relaxation activity designed to support calm attention and breathing.',
  youtubeUrl: 'https://www.youtube.com/watch?v=O29e4rRMrV4',
  thumbnail: 'https://img.youtube.com/vi/O29e4rRMrV4/hqdefault.jpg',
  ageRange: 'Ages 3–8',
  parentTip:
    'Dim lights and reduce background noise to create a calming sensory environment.',
},

{
  id: 'sensory-w5-1',
  week: 5,
  category: 'Sensory',
  title: 'Yoga for Kids – Cosmic Kids',
  description:
    'A sensory-friendly movement activity combining breathing, stretching, and imagination.',
  youtubeUrl: 'https://www.youtube.com/watch?v=R-BS87NTV5I',
  thumbnail: 'https://img.youtube.com/vi/R-BS87NTV5I/hqdefault.jpg',
  ageRange: 'Ages 3–8',
  parentTip:
    'Allow your child to participate at their own pace. Movement imitation is optional.',
},

{
  id: 'sensory-w5-2',
  week: 5,
  category: 'Sensory',
  title: 'Calm Down Song',
  description:
    'A gentle song helping children slow down and regulate emotions.',
  youtubeUrl: 'https://www.youtube.com/watch?v=sY0N0egXh8Q',
  thumbnail: 'https://img.youtube.com/vi/sY0N0egXh8Q/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Use consistent calming phrases from the song during daily routines.',
},

{
  id: 'sensory-w6-1',
  week: 6,
  category: 'Sensory',
  title: 'Breathing Exercise for Kids',
  description:
    'A simple breathing activity designed for emotional regulation and calm transitions.',
  youtubeUrl: 'https://www.youtube.com/watch?v=NmM4uQ17RL0',
  thumbnail: 'https://img.youtube.com/vi/NmM4uQ17RL0/hqdefault.jpg',
  ageRange: 'Ages 3–7',
  parentTip:
    'Practice together first, then use the same breathing cues during frustration.',
},

{
  id: 'sensory-w6-2',
  week: 6,
  category: 'Sensory',
  title: 'Relaxing Music for Children',
  description:
    'Soft calming visuals and music supporting quiet sensory regulation time.',
  youtubeUrl: 'https://www.youtube.com/watch?v=lFcSrYw-ARY',
  thumbnail: 'https://img.youtube.com/vi/lFcSrYw-ARY/hqdefault.jpg',
  ageRange: 'Ages 2–7',
  parentTip:
    'Good for quiet corners, calming routines, sensory breaks, or bedtime.',
},

{
  id: 'fun-w4-1',
  week: 4,
  category: 'Fun Learning',
  title: 'Freeze Dance Song',
  description:
    'An interactive movement game helping with listening, attention, and motor imitation.',
  youtubeUrl: 'https://www.youtube.com/watch?v=388Q44ReOWE',
  thumbnail: 'https://img.youtube.com/vi/388Q44ReOWE/hqdefault.jpg',
  ageRange: 'Ages 2–7',
  parentTip:
    'Pause after freeze moments and encourage body control and waiting.',
},

{
  id: 'fun-w4-2',
  week: 4,
  category: 'Fun Learning',
  title: 'The Kiboomers – Animal Action Song',
  description:
    'A movement and imitation learning song using animals and action words.',
  youtubeUrl: 'https://www.youtube.com/watch?v=p5qw9lSIJuo',
  thumbnail: 'https://img.youtube.com/vi/p5qw9lSIJuo/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Encourage your child to imitate movements, gestures, or sounds.',
},

{
  id: 'fun-w5-1',
  week: 5,
  category: 'Fun Learning',
  title: 'Count to 20 Song',
  description:
    'A preschool counting song teaching numbers through movement and repetition.',
  youtubeUrl: 'https://www.youtube.com/watch?v=0VLxWIHRD4E',
  thumbnail: 'https://img.youtube.com/vi/0VLxWIHRD4E/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Count real objects after the song to build generalization skills.',
},

{
  id: 'fun-w5-2',
  week: 5,
  category: 'Fun Learning',
  title: 'Clean Up Song',
  description:
    'A simple routine song helping children transition into cleanup time.',
  youtubeUrl: 'https://www.youtube.com/watch?v=oY-H2WGThc8',
  thumbnail: 'https://img.youtube.com/vi/oY-H2WGThc8/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Use this consistently during cleanup routines to build predictability.',
},

{
  id: 'fun-w6-1',
  week: 6,
  category: 'Fun Learning',
  title: 'Head Shoulders Knees and Toes',
  description:
    'A classic movement song supporting imitation, body awareness, and listening.',
  youtubeUrl: 'https://www.youtube.com/watch?v=h4eueDYPTIg',
  thumbnail: 'https://img.youtube.com/vi/h4eueDYPTIg/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Model the movements slowly and reinforce attempts to imitate.',
},

{
  id: 'fun-w6-2',
  week: 6,
  category: 'Fun Learning',
  title: 'ABC Song',
  description:
    'A preschool alphabet learning song supporting language and letter familiarity.',
  youtubeUrl: 'https://www.youtube.com/watch?v=75p-N9YKqNo',
  thumbnail: 'https://img.youtube.com/vi/75p-N9YKqNo/hqdefault.jpg',
  ageRange: 'Ages 2–6',
  parentTip:
    'Point to letters or trace them while singing to increase engagement.',
},
];

 function getCurrentRotationWeek(totalWeeks = 6) {
  const start = new Date(new Date().getFullYear(), 0, 1);
  const now = new Date();

  const diffDays = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (Math.floor(diffDays / 7) % totalWeeks) + 1;
}

const FAVORITES_KEY = 'video_hub_favorites';

export default function VideoHubScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] =
    useState<VideoCategory>('Communication');

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const currentWeek = getCurrentRotationWeek(6);

  useEffect(() => {
    const loadFavorites = async () => {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);

      if (stored) {
        setFavoriteIds(JSON.parse(stored));
      }
    };

    void loadFavorites();
  }, []);

  const toggleFavorite = async (videoId: string) => {
    const updated = favoriteIds.includes(videoId)
      ? favoriteIds.filter((id) => id !== videoId)
      : [...favoriteIds, videoId];

    setFavoriteIds(updated);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  };

  const filteredVideos = useMemo(() => {
    if (selectedCategory === 'Favorites') {
      return VIDEOS.filter((video) => favoriteIds.includes(video.id));
    }

    return VIDEOS.filter(
      (video) =>
        video.category === selectedCategory &&
        video.week === currentWeek
    );
  }, [selectedCategory, favoriteIds, currentWeek]);

  const openVideo = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Unable to open video',
        'Please try again later.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Video Hub</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.parentBadge}>
            <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />

            <Text style={styles.parentBadgeText}>For Parents</Text>
          </View>

          <Text style={styles.heroTitle}>Parent-Controlled Video Hub</Text>

          <Text style={styles.heroText}>
            Curated educational and sensory-friendly videos for caregivers and
            children. Week {currentWeek} videos are showing now.
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
                  <Text
                    style={[
                      styles.tabChipText,
                      active && styles.tabChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filteredVideos.length === 0 ? (
          <View style={styles.emptyFavoritesCard}>
            <Ionicons name="heart-outline" size={38} color="#94A3B8" />
            <Text style={styles.emptyFavoritesTitle}>No saved videos yet</Text>
            <Text style={styles.emptyFavoritesText}>
              Tap the heart on any video to save it to Favorites.
            </Text>
          </View>
        ) : (
          filteredVideos.map((video) => {
            const isFavorite = favoriteIds.includes(video.id);

            return (
              <View key={video.id} style={styles.videoCard}>
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: video.thumbnail }}
                    style={styles.thumbnail}
                  />

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
                </View>

                <View style={styles.videoContent}>
                  <View style={styles.ageBadge}>
                    <Ionicons name="person-outline" size={13} color="#4F46E5" />

                    <Text style={styles.ageBadgeText}>{video.ageRange}</Text>
                  </View>

                  <Text style={styles.videoTitle}>{video.title}</Text>

                  <Text style={styles.videoDescription}>
                    {video.description}
                  </Text>

                  <View style={styles.tipBox}>
                    <Ionicons name="bulb-outline" size={16} color="#7C3AED" />

                    <Text style={styles.tipText}>{video.parentTip}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.watchButton}
                    onPress={() => openVideo(video.youtubeUrl)}
                  >
                    <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />

                    <Text style={styles.watchButtonText}>
                      Watch on YouTube
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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

  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
  },

  parentBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },

  parentBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    marginLeft: 6,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
  },

  heroText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  tabsWrap: {
    marginBottom: 18,
  },

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
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },

  tabChipText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 13,
  },

  tabChipTextActive: {
    color: '#FFFFFF',
  },

  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  thumbnail: {
    width: '100%',
    height: 200,
  },

  videoContent: {
    padding: 18,
  },

  ageBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },

  ageBadgeText: {
    marginLeft: 5,
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '900',
  },

  videoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  videoDescription: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },

  tipBox: {
    marginTop: 14,
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  tipText: {
    flex: 1,
    marginLeft: 8,
    color: '#6D28D9',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  watchButton: {
    marginTop: 16,
    backgroundColor: '#EF4444',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  watchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },
  favoriteButton: {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: 'rgba(15,23,42,0.72)',
  alignItems: 'center',
  justifyContent: 'center',
},

emptyFavoritesCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 24,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

emptyFavoritesTitle: {
  marginTop: 12,
  fontSize: 18,
  fontWeight: '900',
  color: '#0F172A',
},

emptyFavoritesText: {
  marginTop: 6,
  color: '#64748B',
  textAlign: 'center',
  lineHeight: 20,
  fontWeight: '600',
},
});