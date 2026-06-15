import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
};

export default function PremiumLessonCard({
  title,
  onPress,
}: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={['#7C4DFF', '#5B34F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 32,
          padding: 28,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: '#fff',
            opacity: 0.8,
            fontWeight: '700',
            marginBottom: 8,
          }}
        >
          Today's Lesson
        </Text>

        <Text
          style={{
            color: '#fff',
            fontSize: 32,
            fontWeight: '800',
            marginBottom: 12,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: '#fff',
            opacity: 0.9,
            fontSize: 16,
          }}
        >
          Open today's personalized lesson and
          keep progress moving.
        </Text>

        <ChevronRight
          color="#fff"
          size={30}
          style={{
            position: 'absolute',
            right: 24,
            top: 24,
          }}
        />
      </LinearGradient>
    </TouchableOpacity>
  );
}