import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  type?: 'home' | 'lesson' | 'calm' | 'support' | 'assessment';
};

export default function AppIllustration({ type = 'home' }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobRight} />
      <View style={styles.bgBlobCenter} />

      <View style={styles.artCard}>
        <View style={styles.bookBase}>
          <Ionicons name="book" size={46} color="#5B3FF4" />
        </View>

        <View style={styles.starMain}>
          <Ionicons name="star" size={32} color="#FFFFFF" />
        </View>

        <View style={styles.chatBubble}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#7C3AED" />
        </View>

        <View style={styles.leafBubble}>
          <Ionicons name="leaf" size={22} color="#0F766E" />
        </View>

        <View style={styles.sparkleOne}>
          <Ionicons name="sparkles" size={18} color="#A855F7" />
        </View>

        <View style={styles.sparkleTwo}>
          <Ionicons name="sparkles" size={15} color="#38BDF8" />
        </View>

        <Text style={styles.heroMiniText}>Today’s calm plan</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 190,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  bgBlobLeft: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(91,63,244,0.13)',
    left: 18,
    top: 4,
  },

  bgBlobRight: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(168,85,247,0.10)',
    right: 18,
    top: 12,
  },

  bgBlobCenter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(14,165,233,0.11)',
    bottom: 10,
  },

  artCard: {
    width: 270,
    height: 136,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },

  bookBase: {
    width: 82,
    height: 82,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  starMain: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 24,
    backgroundColor: '#5B3FF4',
    top: 18,
    left: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatBubble: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    right: 46,
    top: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  leafBubble: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    left: 64,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sparkleOne: {
    position: 'absolute',
    right: 76,
    bottom: 30,
  },

  sparkleTwo: {
    position: 'absolute',
    left: 116,
    top: 24,
  },

  heroMiniText: {
    position: 'absolute',
    bottom: 17,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});