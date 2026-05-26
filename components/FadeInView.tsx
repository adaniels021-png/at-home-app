import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StyleProp,
    ViewStyle,
} from 'react-native';

type FadeInViewProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  distance?: number;
};

export default function FadeInView({
  children,
  style,
  delay = 0,
  distance = 10,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, distance, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}