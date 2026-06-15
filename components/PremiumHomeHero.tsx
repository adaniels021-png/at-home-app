import { Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  caregiverName?: string;
  childName?: string;
};

export default function PremiumHomeHero({
  caregiverName,
  childName,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Good Afternoon 💜
        </Text>

        <Text style={styles.subtitle}>
          You're doing an amazing job.
        </Text>

        <Text style={styles.description}>
          Today's lesson and support tools
          are ready for {childName || 'your child'}.
        </Text>
      </View>

      <Image
        source={require('../assets/images/home-hero.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF4FF',
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#101828',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7C4DFF',
    marginBottom: 12,
  },

  description: {
    fontSize: 17,
    lineHeight: 26,
    color: '#475467',
  },

  image: {
    width: 170,
    height: 170,
  },
});