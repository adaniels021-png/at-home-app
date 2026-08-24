import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  canManageCaregivers,
  getRoleAccessSummary,
  type PermissionOverrides,
} from "../../lib/caregiverPermissions";
import { useChild } from "../../lib/SelectedChildContext";
import { useChildSubscription as useSubscription } from "../../lib/ChildSubscriptionContext";
import { hasEntitlement } from "../../lib/entitlements";
import { supabase } from "../../lib/supabase";
import {
  AccessSummary,
  PersonAvatar,
  RoleBadge,
  roleFriendlyName,
} from "../../components/caregivers/CaregiverAccessUI";

type Caregiver = {
  id: string;
  caregiver_user_id: string;
  role: string;
  status: string;
  created_at: string;
  display_name?: string;
  permission_overrides?: PermissionOverrides;
};

type PendingInvite = {
  id: string;
  invited_email: string;
  role: string;
  invite_code: string;
  created_at?: string;
};

const compactPermissionLabel = (label: string) =>
  label
    .replace("Lessons and daily support", "Lessons")
    .replace("Communication tools", "Communication")
    .replace("Progress tools", "Progress")
    .replace("Emergency and elopement response", "Emergency")
    .replace("Child profile editing", "Profile")
    .replace("Full Safety Profile", "Safety Profile")
    .replace("Caregiver management", "Caregivers");

export default function ManageCaregiversScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();
  const hasProAccess = hasEntitlement({ isPro }, "manage_caregivers");
  const role = selectedChild?.caregiver_access_role;
  const canInvite = canManageCaregivers(role);

  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  const childName =
    selectedChild?.child_name || selectedChild?.name || "your child";

  const loadCaregivers = useCallback(async () => {
    if (!selectedChild?.id || !canInvite) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [{ data, error }, { data: invites }, { data: overrideRows }] =
        await Promise.all([
          supabase
            .from("child_caregivers")
            .select("*")
            .eq("child_id", selectedChild.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("caregiver_invites")
            .select("*")
            .eq("child_id", selectedChild.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("child_caregiver_permission_overrides")
            .select("caregiver_user_id, permission, allowed")
            .eq("child_id", selectedChild.id),
        ]);

      if (error) throw error;
      setPendingInvites((invites || []) as PendingInvite[]);

      const members = (data || []) as Caregiver[];
      const userIds = members
        .map((item) => item.caregiver_user_id)
        .filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds)
        : { data: [] };

      const overridesByUser = (overrideRows || []).reduce<
        Record<string, PermissionOverrides>
      >((result, row: any) => {
        result[row.caregiver_user_id] = {
          ...result[row.caregiver_user_id],
          [row.permission]: row.allowed,
        };
        return result;
      }, {});

      setCaregivers(
        members.map((item) => ({
          ...item,
          display_name:
            profiles?.find(
              (profile: any) => profile.id === item.caregiver_user_id,
            )?.full_name || roleFriendlyName(item.role),
          permission_overrides: overridesByUser[item.caregiver_user_id],
        })),
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert("Load Error", error?.message || "Unable to load caregivers.");
    } finally {
      setLoading(false);
    }
  }, [canInvite, selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      if (canInvite && !hasProAccess) {
        router.replace("/subscription");
        return;
      }
      void loadCaregivers();
    }, [canInvite, hasProAccess, loadCaregivers, router]),
  );

  const cancelInvite = (inviteId: string) => {
    Alert.alert(
      "Cancel Invite",
      "Are you sure you want to cancel this invitation?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Invite",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("caregiver_invites")
                .delete()
                .eq("id", inviteId);
              if (error) throw error;
              setPendingInvites((current) =>
                current.filter((item) => item.id !== inviteId),
              );
              await loadCaregivers();
            } catch (error: any) {
              console.error("Cancel invite error:", error);
              Alert.alert(
                "Cancel Failed",
                error?.message || "Could not cancel invite.",
              );
            }
          },
        },
      ],
    );
  };

  const ownerMember = useMemo(
    () => caregivers.find((caregiver) => caregiver.role === "owner"),
    [caregivers],
  );
  const activeCaregivers = useMemo(
    () =>
      caregivers.filter(
        (caregiver) =>
          caregiver.role !== "owner" &&
          (caregiver.status === "accepted" || caregiver.status === "active"),
      ),
    [caregivers],
  );
  const ownerName = ownerMember?.display_name || "You";

  const openInvite = () => {
    if (!canInvite) {
      Alert.alert(
        "Not Available",
        "Only the child profile owner can invite caregivers.",
      );
      return;
    }
    if (!hasProAccess) {
      router.push("/subscription");
      return;
    }
    router.push("/settings/invite-caregiver");
  };

  if (!canInvite) {
    const accessSummary = getRoleAccessSummary(role);
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header
            title="Family Access"
            subtitle={`Your access to ${childName}'s profile and support tools.`}
            onBack={() => router.back()}
          />
          <View style={styles.nonOwnerCard}>
            <PersonAvatar name={roleFriendlyName(role)} size={58} />
            <View style={styles.nonOwnerIdentity}>
              <Text style={styles.cardTitle}>Your Access</Text>
              <Text style={styles.cardSubtitle}>Supporting {childName}</Text>
            </View>
            <RoleBadge role={role} />
          </View>
          <AccessSummary
            available={accessSummary.available}
            restricted={accessSummary.restricted}
          />
          <TouchableOpacity
            style={styles.secondaryWideButton}
            onPress={() => router.push("/settings/accept-caregiver-invite")}
          >
            <Ionicons name="key-outline" size={19} color="#6842A0" />
            <Text style={styles.secondaryWideButtonText}>Accept an Invite</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="Manage Caregivers"
          subtitle={`View and manage who has access to ${childName}'s profile and what they can do.`}
          onBack={() => router.back()}
          contextName={childName}
        />

        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Access Overview</Text>
          <View style={styles.statsRow}>
            <StatTile
              icon="people-outline"
              value={String(activeCaregivers.length)}
              label="Active Caregivers"
            />
            <StatTile
              icon="mail-unread-outline"
              value={String(pendingInvites.length)}
              label={
                pendingInvites.length === 1
                  ? "Pending Invite"
                  : "Pending Invites"
              }
            />
            <StatTile
              icon="shield-checkmark-outline"
              value="You"
              label="Owner"
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={openInvite}>
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Invite Caregiver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/settings/accept-caregiver-invite")}
            >
              <Ionicons name="key-outline" size={18} color="#6842A0" />
              <Text style={styles.secondaryButtonText}>Accept an Invite</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.choiceStrip}>
            <View style={styles.choiceIcon}>
              <Ionicons name="heart-outline" size={18} color="#6842A0" />
            </View>
            <View style={styles.choiceCopy}>
              <Text style={styles.choiceTitle}>Your child. Your choice.</Text>
              <Text style={styles.choiceText}>
                You decide who can help with {childName}&apos;s care and what
                each person can access.
              </Text>
            </View>
          </View>
        </View>

        <SectionHeading title="Your Access" />
        <View style={styles.ownerCard}>
          <PersonAvatar name={ownerName} size={50} />
          <View style={styles.identityCopy}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {ownerName === "You" ? "You" : `${ownerName} (You)`}
            </Text>
            <Text style={styles.cardSubtitle}>Full access to everything</Text>
          </View>
          <View style={styles.ownerStatus}>
            <RoleBadge role="owner" />
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Always Active</Text>
            </View>
          </View>
        </View>

        <SectionHeading
          title="Active Caregivers"
          count={activeCaregivers.length}
        />
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6842A0" />
            <Text style={styles.loadingText}>Loading your support team…</Text>
          </View>
        ) : activeCaregivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={24} color="#6842A0" />
            </View>
            <Text style={styles.emptyTitle}>Build your support team</Text>
            <Text style={styles.emptyText}>
              Invite someone you trust to help support {childName}.
            </Text>
            <TouchableOpacity style={styles.emptyAction} onPress={openInvite}>
              <Text style={styles.emptyActionText}>Invite Caregiver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeCaregivers.map((caregiver) => (
            <CaregiverRow
              key={caregiver.id}
              caregiver={caregiver}
              onManage={() =>
                router.push({
                  pathname: "/settings/caregiver-access/[id]",
                  params: { id: caregiver.id },
                })
              }
            />
          ))
        )}

        <SectionHeading
          title="Pending Invitations"
          count={pendingInvites.length}
        />
        {pendingInvites.length === 0 ? (
          <View style={styles.compactEmptyCard}>
            <Ionicons name="mail-open-outline" size={20} color="#8B7D96" />
            <Text style={styles.compactEmptyText}>
              No invitations are waiting.
            </Text>
          </View>
        ) : (
          pendingInvites.map((invite) => (
            <PendingInviteRow
              key={invite.id}
              invite={invite}
              childName={childName}
              onCancel={() => cancelInvite(invite.id)}
            />
          ))
        )}

        <View style={styles.bottomInfo}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color="#70627A"
          />
          <Text style={styles.bottomInfoText}>
            Caregivers need to accept an invitation before they can access{" "}
            {childName}&apos;s profile.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  title,
  subtitle,
  onBack,
  contextName,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  contextName?: string;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color="#182033" />
      </TouchableOpacity>
      <View style={styles.headerBody}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        {contextName ? (
          <View style={styles.profileContext}>
            <PersonAvatar name={contextName} size={38} />
            <View style={styles.profileContextCopy}>
              <Text style={styles.profileContextName} numberOfLines={1}>
                {contextName}
              </Text>
              <Text style={styles.profileContextLabel}>Profile</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color="#6842A0" />
      </View>
      <View style={styles.statCopy}>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
        <Text
          style={styles.statLabel}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof count === "number" ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CaregiverRow({
  caregiver,
  onManage,
}: {
  caregiver: Caregiver;
  onManage: () => void;
}) {
  const available = getRoleAccessSummary(
    caregiver.role,
    caregiver.permission_overrides,
  ).available.map(compactPermissionLabel);
  const shownPermissions = available.slice(0, 3);
  const remaining = Math.max(available.length - shownPermissions.length, 0);

  return (
    <View style={styles.caregiverCard}>
      <View style={styles.caregiverHeader}>
        <PersonAvatar name={caregiver.display_name} size={48} />
        <View style={styles.caregiverIdentity}>
          <Text style={styles.caregiverName} numberOfLines={1}>
            {caregiver.display_name}
          </Text>
          <Text style={styles.caregiverMeta} numberOfLines={1}>
            {roleFriendlyName(caregiver.role)} • Active
          </Text>
        </View>
        <RoleBadge role={caregiver.role} />
      </View>
      <View style={styles.permissionRow}>
        {shownPermissions.map((permission) => (
          <View style={styles.permissionChip} key={permission}>
            <Ionicons name="checkmark" size={12} color="#467462" />
            <Text style={styles.permissionChipText}>{permission}</Text>
          </View>
        ))}
        {remaining > 0 ? (
          <View style={styles.moreChip}>
            <Text style={styles.moreChipText}>+{remaining} more</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        style={styles.manageButton}
        accessibilityRole="button"
        accessibilityLabel={`Manage ${caregiver.display_name}'s access`}
        onPress={onManage}
      >
        <Text style={styles.manageButtonText}>Manage Access</Text>
        <Ionicons name="chevron-forward" size={16} color="#6842A0" />
      </Pressable>
    </View>
  );
}

function PendingInviteRow({
  invite,
  childName,
  onCancel,
}: {
  invite: PendingInvite;
  childName: string;
  onCancel: () => void;
}) {
  const dateLabel = invite.created_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(invite.created_at))
    : null;

  return (
    <View style={styles.pendingCard}>
      <View style={styles.pendingHeader}>
        <PersonAvatar name={roleFriendlyName(invite.role)} size={46} />
        <View style={styles.pendingIdentity}>
          <Text style={styles.pendingEmail} numberOfLines={1}>
            {invite.invited_email}
          </Text>
          <Text style={styles.pendingMeta}>
            Invited as {roleFriendlyName(invite.role)}
            {dateLabel ? ` • ${dateLabel}` : ""}
          </Text>
        </View>
        <View style={styles.pendingBadge}>
          <View style={styles.pendingDot} />
          <Text style={styles.pendingBadgeText}>Pending</Text>
        </View>
      </View>
      <View style={styles.inviteCodeRow}>
        <View style={styles.codePill}>
          <Text style={styles.codeLabel}>Invite code</Text>
          <Text style={styles.codeValue}>{invite.invite_code}</Text>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() =>
            void Share.share({
              message: `Use invite code ${invite.invite_code} to join ${childName}'s support team in ABA at Home.`,
            })
          }
        >
          <Ionicons name="share-outline" size={15} color="#6842A0" />
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F7FC" },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 48 },
  header: { marginBottom: 20 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E2ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerBody: { flexDirection: "row", alignItems: "flex-start" },
  headerCopy: { flex: 1, paddingTop: 1 },
  headerTitle: { color: "#182033", fontSize: 22, fontWeight: "900" },
  headerSubtitle: {
    color: "#697188",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 5,
  },
  profileContext: {
    maxWidth: 118,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    paddingTop: 2,
  },
  profileContextCopy: { flex: 1, minWidth: 0, marginLeft: 8 },
  profileContextName: { color: "#20283B", fontSize: 12, fontWeight: "900" },
  profileContextLabel: {
    color: "#747A8D",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  overviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E1EE",
    shadowColor: "#4C3A61",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  overviewTitle: { color: "#222A3D", fontSize: 16, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 13 },
  statTile: {
    flex: 1,
    minHeight: 78,
    borderRadius: 17,
    padding: 10,
    backgroundColor: "#F7F4FC",
    borderWidth: 1,
    borderColor: "#ECE7F5",
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EDE5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  statCopy: { flex: 1, minWidth: 0, marginLeft: 8 },
  statValue: { color: "#252C40", fontSize: 18, fontWeight: "900" },
  statLabel: {
    color: "#777D91",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
    marginTop: 1,
  },
  actionRow: { gap: 10, marginTop: 14 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "#6842A0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#CFC1E4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryButtonText: { color: "#6842A0", fontSize: 12, fontWeight: "900" },
  choiceStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F5F1FA",
    borderRadius: 16,
    padding: 12,
    marginTop: 13,
  },
  choiceIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#E9DFF4",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCopy: { flex: 1, marginLeft: 10 },
  choiceTitle: { color: "#41334E", fontSize: 13, fontWeight: "900" },
  choiceText: {
    color: "#72697A",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 2,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 23,
    marginBottom: 10,
  },
  sectionTitle: { color: "#20283B", fontSize: 17, fontWeight: "900" },
  countBadge: {
    minWidth: 25,
    height: 25,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: "#EDE7F5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  countText: { color: "#6842A0", fontSize: 11, fontWeight: "900" },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E1EA",
  },
  identityCopy: { flex: 1, minWidth: 0, marginHorizontal: 12 },
  cardTitle: { color: "#20283B", fontSize: 15, fontWeight: "900" },
  cardSubtitle: {
    color: "#747A8D",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 3,
  },
  ownerStatus: { alignItems: "flex-end", gap: 7 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4F8A70",
  },
  activeBadgeText: { color: "#4F7A68", fontSize: 10, fontWeight: "900" },
  centered: { alignItems: "center", paddingVertical: 28 },
  loadingText: { color: "#73798C", fontWeight: "700", marginTop: 10 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E4E1EA",
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#EEE8F7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#222A3D",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#747A8D",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },
  emptyAction: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#EEE7F6",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  emptyActionText: { color: "#6842A0", fontSize: 12, fontWeight: "900" },
  caregiverCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4E1EA",
    marginBottom: 10,
  },
  caregiverHeader: { flexDirection: "row", alignItems: "center" },
  caregiverIdentity: { flex: 1, minWidth: 0, marginHorizontal: 11 },
  caregiverName: { color: "#20283B", fontSize: 15, fontWeight: "900" },
  caregiverMeta: {
    color: "#70778A",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  permissionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  permissionChip: {
    minHeight: 27,
    borderRadius: 999,
    paddingHorizontal: 9,
    backgroundColor: "#EDF6F1",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  permissionChipText: { color: "#4D6F61", fontSize: 10, fontWeight: "800" },
  moreChip: {
    minHeight: 27,
    borderRadius: 999,
    paddingHorizontal: 9,
    backgroundColor: "#F0ECF6",
    alignItems: "center",
    justifyContent: "center",
  },
  moreChipText: { color: "#6C6075", fontSize: 10, fontWeight: "800" },
  manageButton: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: "#F4F0F8",
    marginTop: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  manageButtonText: { color: "#6842A0", fontSize: 12, fontWeight: "900" },
  compactEmptyCard: {
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E1EA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  compactEmptyText: { color: "#7A7180", fontSize: 12, fontWeight: "700" },
  pendingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4E1EA",
    marginBottom: 10,
  },
  pendingHeader: { flexDirection: "row", alignItems: "center" },
  pendingIdentity: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  pendingEmail: { color: "#20283B", fontSize: 13, fontWeight: "900" },
  pendingMeta: {
    color: "#747A8D",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 3,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "#FFF4DA",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C78929",
  },
  pendingBadgeText: { color: "#9B6A20", fontSize: 9, fontWeight: "900" },
  inviteCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },
  codePill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    backgroundColor: "#F6F3F9",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codeLabel: {
    color: "#888092",
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codeValue: {
    color: "#51405D",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 1,
  },
  shareButton: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "#EEE7F6",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  shareText: { color: "#6842A0", fontSize: 10, fontWeight: "900" },
  cancelButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#A64D50", fontSize: 10, fontWeight: "900" },
  bottomInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 17,
    backgroundColor: "#F0EDF5",
    padding: 13,
    marginTop: 18,
    gap: 9,
  },
  bottomInfoText: {
    flex: 1,
    color: "#706779",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  nonOwnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E4E1EA",
    padding: 16,
    marginBottom: 14,
  },
  nonOwnerIdentity: { flex: 1, minWidth: 0, marginHorizontal: 12 },
  secondaryWideButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#CFC1E4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
  },
  secondaryWideButtonText: {
    color: "#6842A0",
    fontSize: 13,
    fontWeight: "900",
  },
});
