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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Navigation bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#9F1239" />
          </TouchableOpacity>

          <View style={styles.topTitleWrap}>
            <Text style={styles.topEyebrow}>Parent Support</Text>
            <Text style={styles.topTitle}>Daily Permission</Text>
          </View>

          <View style={styles.backButtonPlaceholder} />
        </View>

        <Text style={styles.pageIntro}>
          A small daily note to help you lower the pressure without turning it
          into another task.
        </Text>

        {/* State Conditional Layout: Sealed Envelope vs Revealed Slip */}
        {!revealed ? (
          <TouchableOpacity
            style={styles.envelopeWrap}
            activeOpacity={0.9}
            onPress={() => setRevealed(true)}
          >
            <View style={styles.envelopeBack}>
              <View style={styles.envelopeFlap} />

              <View style={styles.envelopePaperPreview}>
                <Text style={styles.previewStamp}>TODAY</Text>
                <Text style={styles.previewTitle}>Permission Slip</Text>
              </View>

              <View style={styles.envelopeFront}>
                <View style={styles.seal}>
                  <Ionicons name="heart" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.envelopeText}>Tap to open</Text>
                <Text style={styles.envelopeSubtext}>
                  No streaks. No homework. Just one permission.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            {/* The Notebook Page Simulation */}
            <View style={styles.paperShadow}>
              <View style={styles.paper}>
                <View style={styles.paperHoleRow}>
                  <View style={styles.paperHole} />
                  <View style={styles.paperHole} />
                  <View style={styles.paperHole} />
                </View>

                <View style={styles.paperHeader}>
                  <View style={styles.stampBox}>
                    <Ionicons
                      name={getCategoryIcon(slip.category) as any}
                      size={16}
                      color="#BE123C"
                    />
                    <Text style={styles.stampText}>
                      {getCategoryLabel(slip.category)}
                    </Text>
                  </View>

                  {claimed && (
                    <View style={styles.claimedStamp}>
                      <Ionicons name="checkmark-circle" size={15} color="#0F766E" />
                      <Text style={styles.claimedStampText}>Claimed</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.paperLabel}>TODAY’S PERMISSION</Text>
                <Text style={styles.slipTitle}>{slip.title}</Text>
                <View style={styles.divider} />
                <Text style={styles.permissionText}>{slip.permission}</Text>

                <View style={styles.signatureLine}>
                  <View style={styles.signatureDash} />
                  <Text style={styles.signatureText}>
                    Signed, the part of you that needs room to breathe
                  </Text>
                </View>
              </View>
            </View>

            {/* Micro / Mini / Macro Customization Segment Control */}
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

            {/* Dynamic Interactive Strategy Action Box */}
            <View style={styles.noteCard}>
              <View style={styles.noteIcon}>
                <Ionicons name="leaf-outline" size={22} color="#BE123C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteLabel}>Use it this way</Text>
                <Text style={styles.noteText}>{selectedAction}</Text>
              </View>
            </View>

            {/* Psychological Subtext Container */}
            <View style={styles.whyStrip}>
              <Text style={styles.whyLabel}>Why it matters</Text>
              <Text style={styles.whyText}>{slip.why}</Text>
            </View>

            {/* Footer Interactive Actions Row */}
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
                <Ionicons name="refresh-outline" size={19} color="#BE123C" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.footerNote}>
          This is not a score, streak, or assignment. It is simply a permission
          you are allowed to carry today.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF1F2' },
  container: { padding: 20, paddingBottom: 50 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  backButtonPlaceholder: { width: 42 },
  topTitleWrap: { flex: 1, alignItems: 'center' },
  topEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#BE123C',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  topTitle: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageIntro: {
    color: '#9F1239',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  envelopeWrap: { marginTop: 18, marginBottom: 26 },
  envelopeBack: {
    height: 330,
    borderRadius: 34,
    backgroundColor: '#FECDD3',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 5,
  },
  envelopeFlap: {
    position: 'absolute',
    top: -110,
    left: -40,
    right: -40,
    height: 240,
    backgroundColor: '#FFE4E6',
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  envelopePaperPreview: {
    position: 'absolute',
    top: 38,
    left: 34,
    right: 34,
    height: 132,
    backgroundColor: '#FFFBF7',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE2E7',
  },
  previewStamp: { color: '#BE123C', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  previewTitle: { marginTop: 12, color: '#0F172A', fontSize: 26, fontWeight: '900' },
  envelopeFront: {
    height: 190,
    backgroundColor: '#BE123C',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  seal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#9F1239',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFE4E6',
    marginBottom: 14,
  },
  envelopeText: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginBottom: 6 },
  envelopeSubtext: { color: '#FFE4E6', fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  paperShadow: {
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 5,
    marginBottom: 16,
  },
  paper: { backgroundColor: '#FFFBF7', borderRadius: 10, padding: 22, borderWidth: 1, borderColor: '#FDE2E7' },
  paperHoleRow: { position: 'absolute', top: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly' },
  paperHole: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' },
  paperHeader: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stampBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BE123C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    transform: [{ rotate: '-2deg' }],
  },
  stampText: { marginLeft: 5, color: '#BE123C', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  claimedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  claimedStampText: { marginLeft: 5, color: '#0F766E', fontSize: 11, fontWeight: '900' },
  paperLabel: { marginTop: 24, color: '#BE123C', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  slipTitle: { marginTop: 8, color: '#0F172A', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7 },
  divider: { height: 1, backgroundColor: '#FDE2E7', marginVertical: 16 },
  permissionText: { color: '#334155', fontSize: 16, lineHeight: 25, fontWeight: '700' },
  signatureLine: { marginTop: 20 },
  signatureDash: {
  height: 1,
  backgroundColor: '#E2E8F0',
  width: '72%',
  marginBottom: 8,
},
  signatureText: { color: '#94A3B8', fontSize: 12, lineHeight: 17, fontWeight: '800', fontStyle: 'italic' },
  timeSelector: { flexDirection: 'row', gap: 9, marginBottom: 14 },
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
  timeChipActive: { backgroundColor: '#BE123C', borderColor: '#BE123C' },
  timeChipTop: { color: '#BE123C', fontSize: 14, fontWeight: '900' },
  timeChipTopActive: { color: '#FFFFFF' },
  timeChipBottom: { marginTop: 2, color: '#9F1239', fontSize: 10, fontWeight: '800' },
  timeChipBottomActive: { color: '#FFE4E6' },
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
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noteLabel: { color: '#BE123C', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  noteText: { color: '#475569', fontSize: 14, lineHeight: 21, fontWeight: '800' },
  whyStrip: { backgroundColor: '#FFF7ED', borderRadius: 22, padding: 15, borderWidth: 1, borderColor: '#FED7AA', marginBottom: 14 },
  whyLabel: { color: '#9A3412', fontSize: 13, fontWeight: '900', marginBottom: 5 },
  whyText: { color: '#7C2D12', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  claimButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#BE123C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  claimButtonDone: { backgroundColor: '#0F766E' },
  claimButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginLeft: 7 },
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
  footerNote: { marginTop: 4, color: '#9F1239', fontSize: 13, lineHeight: 20, fontWeight: '700', textAlign: 'center', paddingHorizontal: 10 },
});