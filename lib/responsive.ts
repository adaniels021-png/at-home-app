import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  return {
    width,
    isTablet,
    isLargeTablet,
    maxContentWidth: isTablet ? 980 : undefined,
    horizontalPadding: isTablet ? 32 : 20,
    gridColumns: isLargeTablet ? 4 : isTablet ? 3 : 2,
    cardGap: isTablet ? 18 : 12,
    touchSize: isTablet ? 58 : 48,
  };
}