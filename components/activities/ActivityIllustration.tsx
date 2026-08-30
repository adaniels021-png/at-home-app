import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {
  ACTIVITY_CATEGORY_PRESENTATION,
  ActivityCategory,
} from '../../lib/activityCategories';

type Props = {
  category: ActivityCategory;
  compact?: boolean;
  imageSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
};

export function ActivityIllustration({
  category,
  compact = false,
  imageSource,
  style,
}: Props) {
  const presentation = ACTIVITY_CATEGORY_PRESENTATION[category];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        compact ? styles.compact : styles.full,
        {
          backgroundColor: presentation.background,
          borderColor: presentation.border,
        },
        style,
      ]}
    >
      {imageSource ? (
        <Image resizeMode="cover" source={imageSource} style={styles.image} />
      ) : (
        <>
          <View style={[styles.orb, { backgroundColor: `${presentation.accent}18` }]} />
          <View style={[styles.dot, { backgroundColor: `${presentation.accent}25` }]} />
          <Ionicons
            name={presentation.icon}
            size={compact ? 28 : 54}
            color={presentation.accent}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  compact: { width: 78, height: 78, borderRadius: 20 },
  full: { width: '100%', height: 190 },
  image: { width: '100%', height: '100%' },
  orb: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    right: -24,
    top: -28,
  },
  dot: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    left: 16,
    bottom: 15,
  },
});
