import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useChild } from '../lib/SelectedChildContext';

export default function ProfileSwitcher() {
  const router = useRouter();
  const { selectedChild, children, setSelectedChild } = useChild() as any;

  const [open, setOpen] = useState(false);

  if (!selectedChild) return null;

  return (
    <>
      <TouchableOpacity style={styles.switcher} onPress={() => setOpen(true)}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color="#4F46E5" />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.name}>
            {selectedChild.child_name || selectedChild.name}
          </Text>

          <Text style={styles.subtext}>
            {selectedChild.caregiver_relationship || 'Child Profile'}
          </Text>
        </View>

        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Switch Child</Text>

              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close-circle" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {children?.map((child: any) => {
                const active = child.id === selectedChild.id;

                return (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.childItem, active && styles.childItemActive]}
                    onPress={() => {
                      setSelectedChild(child);
                      setOpen(false);
                    }}
                  >
                    <View style={styles.childAvatar}>
                      <Ionicons name="person" size={20} color="#4F46E5" />
                    </View>

                    <View style={styles.childTextWrap}>
                      <Text style={styles.childName}>
                        {child.child_name || child.name}
                      </Text>

                      <Text style={styles.childSub}>
                        {child.caregiver_relationship || 'Profile'}
                      </Text>
                    </View>

                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4F46E5"
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  setOpen(false);
                  router.push('/onboarding/add-child');
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addText}>Add Another Child</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  switcher: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textWrap: {
    flex: 1,
    marginLeft: 10,
  },

  name: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 15,
  },

  subtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '75%',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },

  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },

  childItemActive: {
    borderWidth: 2,
    borderColor: '#4F46E5',
  },

  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  childTextWrap: {
    flex: 1,
  },

  childName: {
    fontWeight: '800',
    color: '#1E293B',
    fontSize: 15,
  },

  childSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  addBtn: {
    marginTop: 10,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  addText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },
});