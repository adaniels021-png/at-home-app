import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function HomeHeroIllustration() {
  return (
    <View style={styles.wrap}>
      <Image
        source={require('../assets/images/home-hero.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 235,
    marginBottom: -8,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});