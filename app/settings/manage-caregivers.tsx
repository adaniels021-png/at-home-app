import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

type Caregiver = {
  id: string;
  caregiver_user_id: string;
  role: string;
  status: string;
  created_at: string;
};

export default function ManageCaregiversScreen() {
  const router = useRouter();

  const { selectedChild } = useChild() as any;

  const [loading, setLoading] = useState(true);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  const loadCaregivers = async () => {
    if (!selectedChild?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('child_caregivers')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCaregivers(data || []);
    } catch (error: any) {
      console.error(error);

      Alert.alert(
        'Load Error',
        error?.message || 'Unable to load caregivers.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadCaregivers();
    }, [selectedChild?.id])
  );

  const removeCaregiver = (caregiver: Caregiver) => {
    Alert.alert(
      'Remove Caregiver',
      'Are you sure you want to remove this caregiver?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('child_caregivers')
                .delete()
                .eq('id', caregiver.id);

              if (error) throw error;

              setCaregivers((current) =>
                current.filter((item) => item.id !== caregiver.id)
              );
            } catch (error: any) {
              Alert.alert(
                'Remove Failed',
                error?.message || 'Could not remove caregiver.'
              );
            }
          },
        },
      ]
    );
  };

  const childName =
    selectedChild?.child_name ||
    selectedChild?.name ||
    'Child';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons
            name="people"
            size={40}
            color="#FFFFFF"
          />

          <Text style={styles.heroTitle}>
            Manage Caregivers
          </Text>

          <Text style={styles.heroText}>
            View caregivers who currently have access to
            {` ${childName}'s `}
            profile.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#4F46E5"
          />

          <Text style={styles.infoText}>
             Multi-Caregiver Sync is coming soon. In a future update, you’ll be able to invite trusted caregivers, share child progress, and sync lessons, routines, PECS tools, and calming plans securely.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator
              size="large"
              color="#4F46E5"
            />

            <Text style={styles.loadingText}>
              Loading caregivers...
            </Text>
          </View>
        ) : caregivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="people-outline"
              size={42}
              color="#94A3B8"
            />

            <Text style={styles.emptyTitle}>
              Multi-Caregiver Sync Coming Soon
            </Text>

            <Text style={styles.emptyText}>
              We’re preparing this feature carefully so shared family data stays private, secure, and easy to manage.
            </Text>
          </View>
        ) : (
          caregivers.map((caregiver) => (
            <View
              key={caregiver.id}
              style={styles.caregiverCard}
            >
              <View style={styles.avatar}>
                <Ionicons
                  name="person"
                  size={20}
                  color="#4F46E5"
                />
              </View>

              <View style={styles.caregiverInfo}>
                <Text style={styles.roleText}>
                  {caregiver.role}
                </Text>

                <Text style={styles.statusText}>
                  Status: {caregiver.status}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeCaregiver(caregiver)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#DC2626"
                />
              </TouchableOpacity>
            </View>
          ))
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

  backButton: {
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
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },

  heroText: {
    color: '#E0E7FF',
    marginTop: 8,
    lineHeight: 21,
    fontWeight: '600',
  },

  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    marginBottom: 20,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#4338CA',
    fontWeight: '700',
    lineHeight: 18,
  },

  centered: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 20,
  },

  caregiverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  caregiverInfo: {
    flex: 1,
    marginLeft: 12,
  },

  roleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  statusText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});