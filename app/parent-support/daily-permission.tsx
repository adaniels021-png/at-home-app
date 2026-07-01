import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ALL_PERMISSION_SLIPS,
  PermissionSlip,
  getCategoryLabel,
} from '@/lib/dailyPermissionSlips';

type TimeLevel = 'micro' | 'mini' | 'macro';

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function getTodaySlipIndex() {
  return getDayOfYear(new Date()) % ALL_PERMISSION_SLIPS.length;
}

function getCategoryIcon(category: PermissionSlip['category']) {
  switch (category) {
    case 'survival':
      return 'shield-checkmark-outline';
    case 'connection':
      return 'heart-outline';
    case 'joy':
      return 'sparkles-outline';
    case 'guilt':
      return 'leaf-outline';
    default:
      return 'document-text-outline';
  }
}

function getDisplayDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DailyPermissionSlipScreen() {
  const router = useRouter();

  const [revealed, setRevealed] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [level, setLevel] = useState<TimeLevel>('micro');
  const [slipIndex, setSlipIndex] = useState(getTodaySlipIndex);

  const slip = ALL_PERMISSION_SLIPS[slipIndex];

  const selectedAction = useMemo(() => {
    if (level === 'micro') return slip.micro;
    if (level === 'mini') return slip.mini;
    return slip.macro;
  }, [level, slip]);

  const showDifferentSlip = () => {
    setSlipIndex((current) => (current + 1) % ALL_PERMISSION_SLIPS.length);
    setClaimed(false);
    setRevealed(true);
    setLevel('micro');
  };

  const claimSlip = () => {
    setClaimed(true);
    Alert.alert(
      'Permission Claimed',
      'Keep this permission with you today. No streaks. No pressure. Just a little more room to breathe.'
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundCircleOne} />
      <View style={styles.backgroundCircleTwo} />
      <View style={styles.backgroundHeartOne}>
        <Ionicons name="heart" size={34} color="rgba(244,63,94,0.08)" />
      </View>
      <View style={styles.backgroundHeartTwo}>
        <Ionicons name="mail-outline" size={48} color="rgba(190,18,60,0.06)" />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={27} color="#BE123C" />
        </TouchableOpacity>

        <View style={styles.headerWrap}>
          <Text style={styles.topEyebrow}>Parent Support</Text>
          <Text style={styles.topTitle}>Today’s Permission</Text>

          <View style={styles.headerHeartRow}>
            <View style={styles.headerDash} />
            <Ionicons name="heart" size={18} color="#E11D48" />
            <View style={styles.headerDash} />
          </View>

          <Text style={styles.pageIntro}>One gentle reminder for yourself today.</Text>
        </View>

        {!revealed ? (
          <TouchableOpacity
            style={styles.envelopeWrap}
            activeOpacity={0.9}
            onPress={() => setRevealed(true)}
          >
            <View style={styles.paperPreview}>
              <Text style={styles.previewStamp}>TODAY</Text>
              <Text style={styles.previewDate}>{getDisplayDate()}</Text>
              <Text style={styles.previewTitle}>Permission Slip</Text>
              <View style={styles.previewDivider}>
                <View style={styles.previewLine} />
                <Ionicons name="heart" size={16} color="#FDA4AF" />
                <View style={styles.previewLine} />
              </View>
            </View>

            <View style={styles.envelopeBack}>
              <View style={styles.envelopeLeftFold} />
              <View style={styles.envelopeRightFold} />
              <View style={styles.envelopeCenterLine} />

              <View style={styles.seal}>
                <Ionicons name="heart" size={28} color="#BE123C" />
              </View>

              <Text style={styles.envelopeText}>Open Today’s Permission</Text>
              <Text style={styles.envelopeSubtext}>
                No streaks. No homework. Just one permission.
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.paperShadow}>
              <View style={styles.paper}>
                <View style={styles.paperHeader}>
                  <View style={styles.stampBox}>
                    <Ionicons
                      name={getCategoryIcon(slip.category) as any}
                      size={15}
                      color="#BE123C"
                    />
                    <Text style={styles.stampText}>
                      {getCategoryLabel(slip.category)}
                    </Text>
                  </View>

                  {claimed ? (
                    <View style={styles.claimedStamp}>
                      <Ionicons name="checkmark-circle" size={15} color="#0F766E" />
                      <Text style={styles.claimedStampText}>Claimed</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.paperLabel}>TODAY’S PERMISSION</Text>
                <Text style={styles.slipTitle}>{slip.title}</Text>

                <View style={styles.paperDivider}>
                  <View style={styles.paperLine} />
                  <Ionicons name="heart" size={16} color="#FDA4AF" />
                  <View style={styles.paperLine} />
                </View>

                <Text style={styles.permissionText}>{slip.permission}</Text>

                <View style={styles.signatureLine}>
                  <View style={styles.signatureDash} />
                  <Text style={styles.signatureText}>
                    Signed, the part of you that needs room to breathe
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.timeSelector}>
              <TouchableOpacity
                style={[styles.timeChip, level === 'micro' && styles.timeChipActive]}
                onPress={() => setLevel('micro')}
              >
                <Text style={[styles.timeChipTop, level === 'micro' && styles.timeChipTopActive]}>
                  30 sec
                </Text>
                <Text style={[styles.timeChipBottom, level === 'micro' && styles.timeChipBottomActive]}>
                  tiny reset
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timeChip, level === 'mini' && styles.timeChipActive]}
                onPress={() => setLevel('mini')}
              >
                <Text style={[styles.timeChipTop, level === 'mini' && styles.timeChipTopActive]}>
                  5 min
                </Text>
                <Text style={[styles.timeChipBottom, level === 'mini' && styles.timeChipBottomActive]}>
                  short pause
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timeChip, level === 'macro' && styles.timeChipActive]}
                onPress={() => setLevel('macro')}
              >
                <Text style={[styles.timeChipTop, level === 'macro' && styles.timeChipTopActive]}>
                  15+
                </Text>
                <Text style={[styles.timeChipBottom, level === 'macro' && styles.timeChipBottomActive]}>
                  bigger shift
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.noteCard}>
              <View style={styles.noteIcon}>
                <Ionicons name="heart-outline" size={25} color="#BE123C" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.noteLabel}>Use it this way</Text>
                <Text style={styles.noteText}>{selectedAction}</Text>
              </View>
            </View>

            <View style={styles.whyStrip}>
              <View style={styles.whyIcon}>
                <Ionicons name="sparkles-outline" size={22} color="#E11D48" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.whyLabel}>Gentle Reminder</Text>
                <Text style={styles.whyText}>{slip.why}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.claimButton, claimed && styles.claimButtonDone]}
                onPress={claimSlip}
                activeOpacity={0.86}
              >
                <Ionicons
                  name={claimed ? 'checkmark-circle' : 'heart-circle-outline'}
                  size={21}
                  color="#FFFFFF"
                />
                <Text style={styles.claimButtonText}>
                  {claimed ? 'Claimed Today' : 'Claim This'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newSlipButton}
                onPress={showDifferentSlip}
                activeOpacity={0.84}
              >
                <Ionicons name="refresh-outline" size={20} color="#BE123C" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {!revealed ? (
          <View style={styles.reminderCard}>
            <View style={styles.reminderIcon}>
              <Ionicons name="heart-outline" size={36} color="#BE123C" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>Gentle Reminder</Text>
              <Text style={styles.reminderText}>
                This isn’t another task. It’s simply something you’re allowed to believe today.
              </Text>
            </View>

            <Ionicons name="sparkles" size={22} color="#FDA4AF" />
          </View>
        ) : null}

        <Text style={styles.footerNote}>
          This is not a score, streak, or assignment. It is simply a permission
          you are allowed to carry today.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF1F2',
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 95,
  },

  backgroundCircleOne: {
    position: 'absolute',
    top: -90,
    right: -100,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },

  backgroundCircleTwo: {
    position: 'absolute',
    bottom: -100,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },

  backgroundHeartOne: {
    position: 'absolute',
    top: 160,
    right: 42,
  },

  backgroundHeartTwo: {
    position: 'absolute',
    bottom: 90,
    right: 22,
    transform: [{ rotate: '-12deg' }],
  },

  backButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },

  headerWrap: {
    alignItems: 'center',
    marginTop: -18,
    marginBottom: 10,
  },

  topEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BE123C',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },

  topTitle: {
    marginTop: 7,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
    textAlign: 'center',
  },

  headerHeartRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerDash: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FDA4AF',
  },

  pageIntro: {
    marginTop: 24,
    color: '#64748B',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 12,
  },

 envelopeWrap: {
  marginTop: 8,
  marginBottom: 22,
  minHeight: 390,
  justifyContent: 'flex-end',
},

  paperPreview: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 30,
    height: 220,
    backgroundColor: '#FFFBF7',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 2,
    zIndex: 1,
  },

  previewStamp: {
    color: '#BE123C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.4,
  },

  previewDate: {
    marginTop: 12,
    color: '#BE123C',
    fontSize: 15,
    fontWeight: '700',
  },

  previewTitle: {
    marginTop: 22,
    color: '#0F172A',
    fontSize: 33,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  previewDivider: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  previewLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#FECDD3',
  },

  envelopeBack: {
    height: 255,
    borderRadius: 34,
    backgroundColor: '#BE123C',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingBottom: 32,
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
    zIndex: 2,
  },

  envelopeLeftFold: {
    position: 'absolute',
    left: -30,
    top: 0,
    width: '72%',
    height: 210,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '23deg' }],
  },

  envelopeRightFold: {
    position: 'absolute',
    right: -30,
    top: 0,
    width: '72%',
    height: 210,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '-23deg' }],
  },

  envelopeCenterLine: {
    position: 'absolute',
    right: -36,
    bottom: 42,
    width: 210,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '-32deg' }],
  },

  seal: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#FFE4E6',
    marginBottom: 24,
    shadowColor: '#7F1D1D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },

  envelopeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },

  envelopeSubtext: {
    color: '#FFE4E6',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  paperShadow: {
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
    marginBottom: 16,
  },

  paper: {
    backgroundColor: '#FFFBF7',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },

  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stampBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  stampText: {
    marginLeft: 6,
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  claimedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  claimedStampText: {
    marginLeft: 5,
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '900',
  },

  paperLabel: {
    marginTop: 26,
    color: '#BE123C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  slipTitle: {
    marginTop: 8,
    color: '#0F172A',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  paperDivider: {
    marginVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  paperLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#FECDD3',
  },

  permissionText: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '700',
  },

  signatureLine: {
    marginTop: 22,
  },

  signatureDash: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '72%',
    marginBottom: 8,
  },

  signatureText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    fontStyle: 'italic',
  },

  timeSelector: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },

  timeChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  timeChipActive: {
    backgroundColor: '#BE123C',
    borderColor: '#BE123C',
  },

  timeChipTop: {
    color: '#BE123C',
    fontSize: 14,
    fontWeight: '900',
  },

  timeChipTopActive: {
    color: '#FFFFFF',
  },

  timeChipBottom: {
    marginTop: 2,
    color: '#9F1239',
    fontSize: 10,
    fontWeight: '800',
  },

  timeChipBottomActive: {
    color: '#FFE4E6',
  },

  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  noteIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  noteLabel: {
    color: '#BE123C',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },

  noteText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '800',
  },

  whyStrip: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },

  whyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  whyLabel: {
    color: '#BE123C',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 5,
  },

  whyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  claimButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#BE123C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },

  claimButtonDone: {
    backgroundColor: '#0F766E',
    shadowColor: '#0F766E',
  },

  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 7,
  },

  newSlipButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reminderCard: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },

  reminderIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  reminderTitle: {
    color: '#BE123C',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 5,
  },

  reminderText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },

  footerNote: {
    marginTop: 20,
    color: '#9F1239',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
