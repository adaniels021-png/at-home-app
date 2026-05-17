import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'JayNaeMonet@gmail.com';

const SUPPORT_PAGE_URL =
  'https://evening-lancer-9c9.notion.site/ABA-at-Home-Support-d5f753a2e41f40c7855b6b6b35be7a5f';

export default function SupportScreen() {
  const router = useRouter();

  const [message, setMessage] = useState('');

  const openHelpCenter = async () => {
    try {
      await Linking.openURL(SUPPORT_PAGE_URL);
    } catch (error) {
      Alert.alert(
        'Unable to Open',
        'Could not open the Help Center right now.'
      );
    }
  };

  const contactSupport = async () => {
    try {
      const cleanMessage = message.trim();

      const subject = encodeURIComponent(
        'ABA at Home Support Request'
      );

      const body = encodeURIComponent(
        cleanMessage ||
          'Hi ABA at Home Support,\n\nI need help with:\n\n'
      );

      const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

      const supported = await Linking.canOpenURL(emailUrl);

      if (!supported) {
        Alert.alert(
          'Email Not Available',
          `Please email support directly at ${SUPPORT_EMAIL}`
        );
        return;
      }

      await Linking.openURL(emailUrl);
    } catch (error) {
      Alert.alert(
        'Support Error',
        `Please contact support directly at ${SUPPORT_EMAIL}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons
            name="help-circle-outline"
            size={46}
            color="#FFFFFF"
          />

          <Text style={styles.heroTitle}>
            Help & Support
          </Text>

          <Text style={styles.heroText}>
            Need help with the app, lessons, profiles,
            subscriptions, or settings? We’re here to help.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Support Resources
          </Text>

          <TouchableOpacity
            style={styles.helpCenterBtn}
            onPress={openHelpCenter}
          >
            <Ionicons
              name="globe-outline"
              size={20}
              color="#4F46E5"
            />

            <View style={styles.helpCenterTextWrap}>
              <Text style={styles.helpCenterTitle}>
                Open Help Center
              </Text>

              <Text style={styles.helpCenterSubtitle}>
                FAQs, walkthroughs, and support resources
              </Text>
            </View>

            <Ionicons
              name="open-outline"
              size={18}
              color="#94A3B8"
            />
          </TouchableOpacity>

          <SupportOption
            icon="mail-outline"
            title="Contact Support"
            subtitle="Send an email directly to app support."
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Message
          </Text>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what you need help with..."
            placeholderTextColor="#94A3B8"
            multiline
            style={styles.textArea}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={contactSupport}
          >
            <Ionicons
              name="send-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.primaryText}>
              Email Support
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.faqCard}>
          <Text style={styles.faqTitle}>
            Quick Tips
          </Text>

          <Text style={styles.faqText}>
            • Restart the app after major updates.
          </Text>

          <Text style={styles.faqText}>
            • Pull down to refresh lessons or activities.
          </Text>

          <Text style={styles.faqText}>
            • Make sure a child profile is selected.
          </Text>

          <Text style={styles.faqText}>
            • Restore purchases if Pro access is missing.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportOption({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.supportOption}>
      <View style={styles.supportIcon}>
        <Ionicons
          name={icon}
          size={20}
          color="#4F46E5"
        />
      </View>

      <View style={styles.supportTextWrap}>
        <Text style={styles.supportTitle}>
          {title}
        </Text>

        <Text style={styles.supportSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
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

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  hero: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 22,
    marginBottom: 20,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 10,
  },

  heroText: {
    color: '#E0E7FF',
    marginTop: 8,
    lineHeight: 21,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  helpCenterBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  helpCenterTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  helpCenterTitle: {
    color: '#3730A3',
    fontWeight: '900',
    fontSize: 14,
  },

  helpCenterSubtitle: {
    color: '#4F46E5',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  supportIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  supportTextWrap: {
    flex: 1,
  },

  supportTitle: {
    color: '#0F172A',
    fontWeight: '900',
  },

  supportSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    fontWeight: '600',
  },

  textArea: {
    minHeight: 130,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    color: '#0F172A',
    fontWeight: '700',
    textAlignVertical: 'top',
  },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
  },

  faqCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  faqTitle: {
    color: '#065F46',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
  },

  faqText: {
    color: '#047857',
    fontWeight: '700',
    lineHeight: 21,
  },
});