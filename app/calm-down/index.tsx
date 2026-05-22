import { Text, View } from 'react-native';

export default function CalmDownScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: '800',
        }}
      >
        Calm-Down Toolkit
      </Text>
    </View>
  );
}
