        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
EOF

cat <<EOF > app/\(tabs\)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: '#E5E5EA',
          backgroundColor: '#FFFFFF',
        },
        headerShown: false, // We use custom headers in our screens
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="curriculum"
        options={{
          title: '30-Day',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="printables"
        options={{
          title: 'Print',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'print' : 'print-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
EOF

cat <<EOF > app/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LandingPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const LEGAL_URL = "https://docs.google.com/document/d/1vQn3TzI3S1L0YV5I1v1v1v1v1v1v1v1v1v1v1v1v1v/edit"; // Replace with your specific Google Doc ID

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('profiles').select('onboarding_completed').eq('id', session.user.id).maybeSingle();
      if (data?.onboarding_completed) {
        router.replace('/(tabs)');
        return;
      }
    }
    setCheckingSession(false);
  }

  const handleGetStarted = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (!error) router.push('/onboarding');
  };

  if (checkingSession) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}><Ionicons name="home" size={60} color="#fff" /></View>
          <Text style={styles.appName}>ABA at Home</Text>
          <Text style={styles.tagline}>Empowering parents, one play-session at a time.</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGetStarted}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth')}>
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.legalLinks}>
            <Text style={styles.legalText}>By continuing, you agree to our </Text>
            <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URL)}>
              <Text style={[styles.legalText, styles.link]}>Terms & Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 30, justifyContent: 'space-between' },
  logoContainer: { alignItems: 'center', marginTop: 100 },
  logoCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 36, fontWeight: '900', color: '#1C1C1E' },
  tagline: { fontSize: 18, color: '#636366', textAlign: 'center', marginTop: 10 },
  footer: { marginBottom: 20 },
  buttonGroup: { gap: 15, marginBottom: 25 },
  primaryBtn: { backgroundColor: '#007AFF', padding: 20, borderRadius: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn: { padding: 20, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  secondaryBtnText: { color: '#007AFF', fontSize: 18, fontWeight: '600' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  legalText: { fontSize: 12, color: '#AEAEB2', textAlign: 'center' },
  link: { color: '#007AFF', textDecorationLine: 'underline' }
});
EOF

cat <<EOF > app/auth.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const router = useRouter();
  const LEGAL_URL = "https://docs.google.com/document/d/1vQn3TzI3S1L0YV5I1v1v1v1v1v1v1v1v1v1v1v1v1v/edit";

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.updateUser({ email, password });
        if (error) throw error;
        Alert.alert("Success!", "Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert("Auth Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="person-circle" size={80} color="#007AFF" style={styles.icon} />
        <Text style={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>
        
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isSignUp ? "Sign Up" : "Log In"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchBtn}>
          <Text style={styles.switchText}>{isSignUp ? "Already have an account? Log In" : "New here? Sign Up"}</Text>
        </TouchableOpacity>

        <View style={styles.legalFooter}>
          <Text style={styles.legalText}>View our </Text>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URL)}>
            <Text style={styles.legalLink}>Privacy Policy & Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 30, flex: 1, justifyContent: 'center' },
  icon: { alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#F2F2F7', padding: 18, borderRadius: 12, marginBottom: 15 },
  primaryBtn: { backgroundColor: '#007AFF', padding: 20, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#007AFF' },
  legalFooter: { marginTop: 40, alignItems: 'center' },
  legalText: { color: '#AEAEB2', fontSize: 12 },
  legalLink: { color: '#007AFF', fontSize: 12, textDecorationLine: 'underline', marginTop: 4 }
});
EOF

cat <<EOF > app/\(tabs\)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  // --- 1. STATE & REF ---
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // --- 2. THE BRAIN (Data Fetching) ---
  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        // Fetch AI Activity based on saved profile data
        const aiResponse = await generateActivity(
          profileData.developmental_level,
          profileData.selected_milestones || []
        );
        setActivity(aiResponse);
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- 3. TIMER LOGIC ---
  const toggleTimer = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current);
      saveSession();
    } else {
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const saveSession = async () => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) {
      Alert.alert("Session Ended", "Sessions under 1 minute aren't logged to your progress.");
      setSeconds(0);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sessions').insert({
      user_id: user?.id,
      duration_minutes: mins
    });

    if (!error) {
      Alert.alert("Success", \`\${mins} minutes of pairing logged for \${profile?.child_name}!\`);
      setSeconds(0);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
  };

  // --- 4. LOADING RENDER ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Curating your daily plan...</Text>
      </View>
    );
  }

  // --- 5. MAIN UI RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Parent!</Text>
            <Text style={styles.subGreeting}>Focus for {profile?.child_name || 'your child'}:</Text>
          </View>
          <TouchableOpacity onPress={loadDashboard} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* THE AI ACTIVITY CARD */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={18} color="#5856D6" />
            <Text style={styles.aiBadgeText}>AI RECOMMENDED ACTIVITY</Text>
          </View>
          
          <Text style={styles.aiTitle}>{activity?.title || "Thinking of a game..."}</Text>
          
          <View style={styles.skillBadge}>
            <Text style={styles.skillText}>🎯 Goal: {activity?.objective}</Text>
          </View>
          
          <Text style={styles.instructionLabel}>How to Play:</Text>
          <Text style={styles.aiInstructions}>{activity?.instructions}</Text>
          
          <View style={styles.materialsBox}>
            <Ionicons name="cart-outline" size={16} color="#636366" />
            <Text style={styles.materialsText}> Needs: {activity?.materials}</Text>
          </View>
        </View>

        {/* THE TIMER CARD */}
        <View style={styles.timerCard}>
          <Text style={styles.timerTitle}>Pairing Timer</Text>
          <Text style={styles.timerSub}>Daily instruction-free play</Text>
          
          <View style={styles.timerCircle}>
            <Text style={styles.timerDigits}>{formatTime(seconds)}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.timerBtn, isTimerRunning ? styles.stopBtn : styles.startBtn]} 
            onPress={toggleTimer}
          >
            <Ionicons name={isTimerRunning ? "stop" : "play"} size={22} color="#fff" />
            <Text style={styles.timerBtnText}>{isTimerRunning ? "End & Save" : "Start Pairing"}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- 6. STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#8E8E93', fontWeight: '500' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' },
  subGreeting: { fontSize: 16, color: '#636366' },
  refreshBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  
  // AI Card Styles
  aiCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  aiBadgeText: { fontSize: 11, fontWeight: '800', color: '#5856D6', letterSpacing: 0.5 },
  aiTitle: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 6 },
  skillBadge: { backgroundColor: '#E1FFE8', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 15 },
  skillText: { color: '#1A7F37', fontSize: 13, fontWeight: '600' },
  instructionLabel: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' },
  aiInstructions: { fontSize: 16, color: '#3A3A3C', lineHeight: 24 },
  materialsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', padding: 12, borderRadius: 12, marginTop: 15 },
  materialsText: { fontSize: 14, color: '#636366', fontStyle: 'italic' },

  // Timer Styles
  timerCard: { backgroundColor: '#1C1C1E', borderRadius: 24, padding: 25, alignItems: 'center' },
  timerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  timerSub: { color: '#8E8E93', fontSize: 14, marginTop: 2 },
  timerCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  timerDigits: { color: '#fff', fontSize: 40, fontWeight: '300', fontVariant: ['tabular-nums'] },
  timerBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, gap: 10, width: '100%', justifyContent: 'center' },
  startBtn: { backgroundColor: '#007AFF' },
  stopBtn: { backgroundColor: '#FF3B30' },
  timerBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
EOF

npm install react-native-confetti-cannon
cat <<EOF > app/\(tabs\)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile(profileData);
        const aiResponse = await generateActivity(profileData.developmental_level, profileData.selected_milestones || []);
        setActivity(aiResponse);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const toggleTimer = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current);
      saveSession();
    } else {
      timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const saveSession = async () => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) {
      Alert.alert("Session Ended", "Sessions under 1 minute aren't logged.");
      setSeconds(0);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sessions').insert({
      user_id: user?.id,
      duration_minutes: mins
    });

    if (!error) {
      // TRIGGER CONFETTI
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000); // Reset after 5 seconds
      
      Alert.alert("Great Job!", \`You logged \${mins} minutes of pairing!\`);
      setSeconds(0);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Parent!</Text>
            <Text style={styles.subGreeting}>Focus for {profile?.child_name}:</Text>
          </View>
          <TouchableOpacity onPress={loadDashboard} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{activity?.title || "Thinking..."}</Text>
          <Text style={styles.aiInstructions}>{activity?.instructions}</Text>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerDigits}>{formatTime(seconds)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.timerBtn, isTimerRunning ? styles.stopBtn : styles.startBtn]} 
            onPress={toggleTimer}
          >
            <Text style={styles.timerBtnText}>{isTimerRunning ? "Finish" : "Start"}</Text>
          </TouchableOpacity>
        </View>

        {/* The Confetti Component */}
        {showConfetti && (
          <ConfettiCannon 
            count={200} 
            origin={{x: -10, y: 0}} 
            fadeOut={true}
            fallSpeed={3000}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold' },
  subGreeting: { fontSize: 16, color: '#636366' },
  refreshBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 12 },
  aiCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 25 },
  aiTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  aiInstructions: { fontSize: 16, lineHeight: 24 },
  timerCard: { backgroundColor: '#1C1C1E', borderRadius: 24, padding: 25, alignItems: 'center' },
  timerCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  timerDigits: { color: '#fff', fontSize: 40, fontVariant: ['tabular-nums'] },
  timerBtn: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, width: '100%', alignItems: 'center' },
  startBtn: { backgroundColor: '#007AFF' },
  stopBtn: { backgroundColor: '#FF3B30' },
  timerBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
EOF

cat <<EOF > lib/reporting.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const shareWeeklyReport = async (childName: string, sessionTotal: number, activityCount: number) => {
  const html = \`
    <html>
      <body style="font-family: sans-serif; padding: 50px;">
        <h1 style="color: #007AFF;">ABA at Home: Weekly Progress</h1>
        <p><strong>Child:</strong> \${childName}</p>
        <p><strong>Date:</strong> \${new Date().toLocaleDateString()}</p>
        <hr />
        <div style="background: #F2F2F7; padding: 20px; border-radius: 10px;">
          <h2>Summary</h2>
          <p>Total Pairing Time: <strong>\${sessionTotal} minutes</strong></p>
          <p>Activities Completed: <strong>\${activityCount}</strong></p>
        </div>
        <footer style="margin-top: 50px; font-size: 12px; color: #8E8E93;">
          Generated by ABA at Home App
        </footer>
      </body>
    </html>
  \`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
};
EOF

cat <<EOF > app/\(tabs\)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile(profileData);
        const aiResponse = await generateActivity(profileData.developmental_level, profileData.selected_milestones || []);
        setActivity(aiResponse);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const toggleTimer = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current);
      saveSession();
    } else {
      timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const saveSession = async () => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) {
      Alert.alert("Session Ended", "Sessions under 1 minute aren't logged.");
      setSeconds(0);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sessions').insert({
      user_id: user?.id,
      duration_minutes: mins
    });

    if (!error) {
      // TRIGGER CONFETTI
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000); // Reset after 5 seconds
      
      Alert.alert("Great Job!", \`You logged \${mins} minutes of pairing!\`);
      setSeconds(0);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Parent!</Text>
            <Text style={styles.subGreeting}>Focus for {profile?.child_name}:</Text>
          </View>
          <TouchableOpacity onPress={loadDashboard} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{activity?.title || "Thinking..."}</Text>
          <Text style={styles.aiInstructions}>{activity?.instructions}</Text>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerDigits}>{formatTime(seconds)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.timerBtn, isTimerRunning ? styles.stopBtn : styles.startBtn]} 
            onPress={toggleTimer}
          >
            <Text style={styles.timerBtnText}>{isTimerRunning ? "Finish" : "Start"}</Text>
          </TouchableOpacity>
        </View>

        {/* The Confetti Component */}
        {showConfetti && (
          <ConfettiCannon 
            count={200} 
            origin={{x: -10, y: 0}} 
            fadeOut={true}
            fallSpeed={3000}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold' },
  subGreeting: { fontSize: 16, color: '#636366' },
  refreshBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 12 },
  aiCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 25 },
  aiTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  aiInstructions: { fontSize: 16, lineHeight: 24 },
  timerCard: { backgroundColor: '#1C1C1E', borderRadius: 24, padding: 25, alignItems: 'center' },
  timerCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  timerDigits: { color: '#fff', fontSize: 40, fontVariant: ['tabular-nums'] },
  timerBtn: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, width: '100%', alignItems: 'center' },
  startBtn: { backgroundColor: '#007AFF' },
  stopBtn: { backgroundColor: '#FF3B30' },
  timerBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
EOF

cat <<EOF > app/\(tabs\)/progress.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { shareWeeklyReport } from '../../lib/reporting';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import Purchases from 'react-native-purchases';
import { useRouter } from 'expo-router';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('child_name')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessions } = await supabase
        .from('sessions')
        .select('duration_minutes, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (sessions) {
        const days = [0, 0, 0, 0, 0, 0, 0];
        let total = 0;
        sessions.forEach(s => {
          const dayIndex = new Date(s.created_at).getDay();
          days[dayIndex] += s.duration_minutes;
          total += s.duration_minutes;
        });
        setWeeklyStats(days);
        setTotalMinutes(total);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleShare = async () => {
    try {
      // 1. Check RevenueCat for active "pro" entitlement
      const customerInfo = await Purchases.getCustomerInfo();
      
      if (customerInfo.entitlements.active['pro']) {
        // User is Pro - allow sharing
        await shareWeeklyReport(profile?.child_name || 'Child', totalMinutes, 7);
      } else {
        // User is Free - redirect to paywall
        Alert.alert(
          "Premium Feature",
          "Sharing professional PDF reports requires an active Pro subscription.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "View Plans", onPress: () => router.push('/paywall') }
          ]
        );
      }
    } catch (e) {
      Alert.alert("Error", "Could not verify subscription status.");
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Progress</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Time</Text>
            <Text style={styles.statValue}>{totalMinutes}m</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Avg / Day</Text>
            <Text style={styles.statValue}>{Math.round(totalMinutes / 7)}m</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Pairing (Minutes)</Text>
          <BarChart
            data={{
              labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              datasets: [{ data: weeklyStats }]
            }}
            width={Dimensions.get("window").width - 60}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => \`rgba(0, 122, 255, \${opacity})\`,
              labelColor: (opacity = 1) => \`rgba(142, 142, 147, \${opacity})\`,
            }}
            style={styles.chart}
          />
        </View>

        {/* Premium Action Button */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <View style={styles.shareBtnInner}>
            <Ionicons name="share-outline" size={20} color="#007AFF" />
            <Text style={styles.shareBtnText}>Share Progress PDF</Text>
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
          <Text style={styles.refreshText}>Sync Latest Data</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  title: { fontSize: 34, fontWeight: 'bold', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  statLabel: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  chartCard: { backgroundColor: '#fff', padding: 15, borderRadius: 24 },
  chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  chart: { marginVertical: 8, borderRadius: 16 },
  shareBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 16, 
    marginTop: 25,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  shareBtnInner: { flexDirection: 'row', alignItems: 'center' },
  shareBtnText: { color: '#007AFF', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
  proBadge: { backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  proText: { fontSize: 10, fontWeight: '900', color: '#1C1C1E' },
  refreshBtn: { marginTop: 20, alignItems: 'center' },
  refreshText: { color: '#8E8E93' }
});
EOF

cat <<EOF > app/paywall.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PaywallScreen() {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const PRIVACY_URL = "https://docs.google.com/document/d/1vQn3TzI3S1L0YV5I1v1v1v1v1v1v1v1v1v1v1v1v1v/edit";

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['pro']) {
        Alert.alert("Success", "Welcome to ABA at Home Pro!");
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Error", e.message);
      }
    }
  };

  const FeatureItem = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <View style={styles.featureRow}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color="#007AFF" />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close-circle" size={32} color="#AEAEB2" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerLabel}>ABA AT HOME PRO</Text>
          <Text style={styles.mainTitle}>Unlock Your Child's Full Potential</Text>
        </View>

        <View style={styles.featuresList}>
          <FeatureItem 
            icon="sparkles" 
            title="Unlimited AI Activities" 
            desc="Personalized play ideas generated specifically for your child's developmental level." 
          />
          <FeatureItem 
            icon="document-text" 
            title="Professional PDF Reports" 
            desc="Export weekly clinical progress charts to share with your BCBA or pediatrician." 
          />
          <FeatureItem 
            icon="infinite" 
            title="Full 30-Day Curriculum" 
            desc="Access every lesson in our evidence-based developmental program." 
          />
        </View>

        <View style={styles.purchaseSection}>
          {packages.map((pkg) => (
            <TouchableOpacity key={pkg.identifier} style={styles.purchaseBtn} onPress={() => handlePurchase(pkg)}>
              <View>
                <Text style={styles.pkgName}>{pkg.product.title}</Text>
                <Text style={styles.pkgPrice}>{pkg.product.priceString} / month</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity onPress={() => Purchases.restorePurchases()} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore Previous Purchase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legalFooter}>
          <Text style={styles.legalNote}>Subscription automatically renews unless canceled 24h before period ends.</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.legalLink}>Terms of Use & Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 25 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 10 },
  header: { alignItems: 'center', marginBottom: 40 },
  headerLabel: { fontSize: 13, fontWeight: '800', color: '#007AFF', letterSpacing: 2, marginBottom: 10 },
  mainTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1C1C1E' },
  featuresList: { marginBottom: 40, gap: 25 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  featureDesc: { fontSize: 14, color: '#636366', marginTop: 2 },
  purchaseSection: { gap: 12 },
  purchaseBtn: { 
    backgroundColor: '#007AFF', 
    padding: 20, 
    borderRadius: 18, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  pkgName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pkgPrice: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  restoreBtn: { marginTop: 15, alignItems: 'center' },
  restoreText: { color: '#8E8E93', fontSize: 13 },
  legalFooter: { marginTop: 40, alignItems: 'center' },
  legalNote: { fontSize: 11, color: '#AEAEB2', textAlign: 'center', marginBottom: 10 },
  legalLink: { fontSize: 12, color: '#007AFF', textDecorationLine: 'underline' }
});
EOF

# Delete the massive redundant folder and build artifacts
rm -rf aba-at-home ios android
# Create a strict .easignore to keep the upload light
cat <<EOF > .easignore
node_modules/
.git/
.expo/
ios/
android/
dist/
build/
*.tar.gz
# Ignore the duplicate folder if it reappears
aba-at-home/
EOF

cat <<EOF > app/\(tabs\)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile(profileData);
        const aiResponse = await generateActivity(profileData.developmental_level, profileData.selected_milestones || []);
        setActivity(aiResponse);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const toggleTimer = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current);
      Alert.alert("Session Saved", "You've logged " + Math.floor(seconds / 60) + " minutes.");
    } else {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Daily Pairing</Text>
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{activity?.title || "Loading Activity..."}</Text>
          <Text style={styles.aiBody}>{activity?.instructions}</Text>
        </View>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}</Text>
          <TouchableOpacity 
            style={[styles.btn, isTimerRunning ? styles.btnStop : styles.btnStart]} 
            onPress={toggleTimer}
          >
            <Text style={styles.btnText}>{isTimerRunning ? "Stop Session" : "Start Session"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center' },
  greeting: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  aiCard: { backgroundColor: '#F2F2F7', padding: 20, borderRadius: 20, marginBottom: 20 },
  aiTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  aiBody: { fontSize: 16, lineHeight: 22, color: '#444' },
  timerContainer: { alignItems: 'center', marginTop: 20 },
  timerText: { fontSize: 60, fontWeight: '300', marginBottom: 20 },
  btn: { padding: 20, borderRadius: 15, width: '100%', alignItems: 'center' },
  btnStart: { backgroundColor: '#007AFF' },
  btnStop: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
EOF

npx eas build --profile development --platform ios
npx expo start --tunnel --clear
# Set the Supabase URL
npx eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://ewxjlaerwijuoymkmdtz.supabase.co --force --scope project
npx expo start --clear --tunnel
npx expo start --tunnel --clear
cat <<EOF > app/\(tabs\)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';

const MILESTONES = [
  "Eye Contact", "Following Point", "Functional Play", 
  "Imitation", "Requesting (Manding)", "Matching", "Turn Taking"
];

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (profileData) {
        setProfile(profileData);
        setSelectedGoals(profileData.selected_milestones || []);
        const aiResponse = await generateActivity(profileData.developmental_level, profileData.selected_milestones || []);
        setActivity(aiResponse);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const toggleGoal = (goal: string) => {
    const updated = selectedGoals.includes(goal) 
      ? selectedGoals.filter(g => g !== goal) 
      : [...selectedGoals, goal];
    setSelectedGoals(updated);
  };

  const refreshAI = async () => {
    setLoading(true);
    const aiResponse = await generateActivity(profile?.developmental_level, selectedGoals);
    setActivity(aiResponse);
    setLoading(false);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Daily Pairing</Text>
        
        <Text style={styles.sectionTitle}>What are we working on today?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestoneScroll}>
          {MILESTONES.map(goal => (
            <TouchableOpacity 
              key={goal} 
              style={[styles.chip, selectedGoals.includes(goal) && styles.chipActive]}
              onPress={() => toggleGoal(goal)}
            >
              <Text style={[styles.chipText, selectedGoals.includes(goal) && styles.chipTextActive]}>{goal}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.generateBtn} onPress={refreshAI}>
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.generateBtnText}>Generate Personalized Activity</Text>
        </TouchableOpacity>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{activity?.title || "Pick a goal above!"}</Text>
          <Text style={styles.aiBody}>{activity?.instructions}</Text>
          <Text style={styles.materials}>📦 Materials: {activity?.materials}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center' },
  greeting: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  milestoneScroll: { flexDirection: 'row', marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F2F2F7', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#8E8E93', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  generateBtn: { backgroundColor: '#5856D6', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 25 },
  generateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  aiCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  aiTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  aiBody: { fontSize: 16, lineHeight: 24, color: '#3A3A3C' },
  materials: { marginTop: 15, fontSize: 14, color: '#8E8E93', fontStyle: 'italic' }
});
EOF

cat <<EOF > app/\(tabs\)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';

const MILESTONES = [
  "Eye Contact", "Following Point", "Functional Play", 
  "Imitation", "Requesting (Manding)", "Matching", "Turn Taking"
];

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  // --- PERSISTENCE LAYER ---
  // This automatically saves to Supabase whenever selectedGoals changes
  useEffect(() => {
    if (profile) {
      saveGoalsToSupabase();
    }
  }, [selectedGoals]);

  async function saveGoalsToSupabase() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ selected_milestones: selectedGoals })
        .eq('id', user.id);
    } catch (e) {
      console.error("Failed to sync goals:", e);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (profileData) {
        setProfile(profileData);
        // Load the saved goals from the database into the UI
        setSelectedGoals(profileData.selected_milestones || []);
        
        const aiResponse = await generateActivity(
          profileData.developmental_level, 
          profileData.selected_milestones || []
        );
        setActivity(aiResponse);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const refreshAI = async () => {
    setLoading(true);
    const aiResponse = await generateActivity(profile?.developmental_level, selectedGoals);
    setActivity(aiResponse);
    setLoading(false);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Daily Pairing</Text>
          <TouchableOpacity onPress={loadDashboard} style={styles.refreshIcon}>
            <Ionicons name="reload" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>Focus Areas for {profile?.child_name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestoneScroll}>
          {MILESTONES.map(goal => (
            <TouchableOpacity 
              key={goal} 
              style={[styles.chip, selectedGoals.includes(goal) && styles.chipActive]}
              onPress={() => toggleGoal(goal)}
            >
              <Text style={[styles.chipText, selectedGoals.includes(goal) && styles.chipTextActive]}>{goal}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={[styles.generateBtn, selectedGoals.length === 0 && styles.btnDisabled]} 
          onPress={refreshAI}
          disabled={selectedGoals.length === 0}
        >
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.generateBtnText}>
            {selectedGoals.length === 0 ? "Select a Goal Above" : "Update AI Activity"}
          </Text>
        </TouchableOpacity>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{activity?.title || "Choose your goals to start"}</Text>
          <Text style={styles.aiBody}>{activity?.instructions}</Text>
          {activity?.materials && (
            <View style={styles.materialsBox}>
              <Text style={styles.materialsText}>📦 {activity.materials}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 32, fontWeight: 'bold', color: '#1C1C1E' },
  refreshIcon: { padding: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', marginBottom: 12, textTransform: 'uppercase' },
  milestoneScroll: { flexDirection: 'row', marginBottom: 20 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#8E8E93', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  generateBtn: { backgroundColor: '#5856D6', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 25 },
  btnDisabled: { backgroundColor: '#C7C7CC' },
  generateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  aiCard: { backgroundColor: '#fff', padding: 25, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  aiTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 12 },
  aiBody: { fontSize: 17, lineHeight: 26, color: '#3A3A3C' },
  materialsBox: { marginTop: 20, padding: 12, backgroundColor: '#F2F2F7', borderRadius: 12 },
  materialsText: { fontSize: 14, color: '#636366', fontWeight: '500' }
});
EOF

cat <<EOF > app/\(tabs\)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

const MILESTONES = ["Eye Contact", "Following Point", "Functional Play", "Imitation", "Manding", "Matching", "Turn Taking"];

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile(profileData);
        setSelectedGoals(profileData.selected_milestones || []);
        const aiResponse = await generateActivity(profileData.developmental_level, profileData.selected_milestones || []);
        setActivity(aiResponse);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const toggleTimer = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current);
      saveSession();
    } else {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const saveSession = async () => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) {
      Alert.alert("Session Ended", "Sessions under 1 minute aren't logged.");
      setSeconds(0);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sessions').insert({ 
      user_id: user?.id, 
      duration_minutes: mins,
      goals_practiced: selectedGoals // SAVING THE GOALS HERE
    });
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      Alert.alert("Success", "Logged " + mins + "m for: " + selectedGoals.join(', '));
      setSeconds(0);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Daily Pairing</Text>
        <Text style={styles.sectionTitle}>Current Focus</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestoneScroll}>
          {MILESTONES.map(goal => (
            <TouchableOpacity 
              key={goal} 
              style={[styles.chip, selectedGoals.includes(goal) && styles.chipActive]}
              onPress={() => setSelectedGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal])}
            >
              <Text style={[styles.chipText, selectedGoals.includes(goal) && styles.chipTextActive]}>{goal}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{activity?.title || "Pick a goal!"}</Text>
          <Text style={styles.aiBody}>{activity?.instructions}</Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerDigits}>{Math.floor(seconds/60)}:{(seconds%60).toString().padStart(2,'0')}</Text>
          <TouchableOpacity style={[styles.btn, isTimerRunning ? styles.btnStop : styles.btnStart]} onPress={toggleTimer}>
            <Text style={styles.btnText}>{isTimerRunning ? "Finish & Save" : "Start Pairing"}</Text>
          </TouchableOpacity>
        </View>
        {showConfetti && <ConfettiCannon count={200} origin={{x: -10, y: 0}} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center' },
  greeting: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase' },
  milestoneScroll: { flexDirection: 'row', marginBottom: 25 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#8E8E93', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  aiCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20 },
  aiTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  aiBody: { fontSize: 16, lineHeight: 22 },
  timerCard: { backgroundColor: '#1C1C1E', padding: 30, borderRadius: 24, alignItems: 'center' },
  timerDigits: { color: '#fff', fontSize: 48, fontWeight: '300', marginBottom: 20 },
  btn: { padding: 18, borderRadius: 15, width: '100%', alignItems: 'center' },
  btnStart: { backgroundColor: '#007AFF' },
  btnStop: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
EOF

cat <<EOF > app/\(tabs\)/progress.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [goalStats, setGoalStats] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const { data: sessions } = await supabase.from('sessions').select('goals_practiced');
      
      if (sessions) {
        const counts: any = {};
        sessions.forEach(s => {
          s.goals_practiced?.forEach((goal: string) => {
            counts[goal] = (counts[goal] || 0) + 1;
          });
        });

        const formatted = Object.keys(counts)
          .map(key => ({ name: key, count: counts[key] }))
          .sort((a, b) => b.count - a.count);
        
        setGoalStats(formatted);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Goal History</Text>
        <Text style={styles.subtitle}>Times each skill was practiced</Text>

        {goalStats.map((item, index) => (
          <View key={item.name} style={styles.statRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.goalName}>{item.name}</Text>
              <Text style={styles.goalCount}>{item.count} sessions</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: \`\${Math.min((item.count / 10) * 100, 100)}%\` }]} />
            </View>
          </View>
        ))}
        
        {goalStats.length === 0 && (
          <Text style={styles.empty}>Start a pairing session to see your progress here!</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center' },
  scrollContent: { padding: 25 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 30 },
  statRow: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalName: { fontSize: 17, fontWeight: '600' },
  goalCount: { fontSize: 14, color: '#8E8E93' },
  progressBarBg: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5 },
  progressBarFill: { height: 10, backgroundColor: '#007AFF', borderRadius: 5 },
  empty: { textAlign: 'center', marginTop: 50, color: '#8E8E93' }
});
EOF

supabase secrets set RESEND_API_KEY=re_Lzcc4L1m_7aqoq18gQu85gz7kgnmg9TzY
adaniels021@penguin:~$ supabase secrets set RESEND_API_KEY=re_Lzcc4L1m_7aqoq18gQu85gz7kgnmg9TzY
-bash: supabase: command not found
adaniels021@penguin:~$ npx supabase secrets set RESEND_API_KEY=re_Lzcc4L1m_7aqoq18gQu85gz7kgnmg9TzY
npx supabase secrets set RESEND_API_KEY=re_Lzcc4L1m_7aqoq18gQu85gz7kgnmg9TzY
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase link --project-ref ewxjlaerwijuoymkmdtz
npx supabase functions deploy weekly-summary
sudo service docker start
# 1. Initialize the function folder
npx supabase functions new weekly-summary
# 2. Paste the logic into the new file
cat <<EOF > supabase/functions/weekly-summary/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: reports } = await supabase
    .from('weekly_user_reports')
    .select('*, profiles(email, child_name)')

  for (const report of reports || []) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${Deno.env.get('RESEND_API_KEY')}\`
      },
      body: JSON.stringify({
        from: 'ABA at Home <reports@yourdomain.com>',
        to: [report.profiles.email],
        subject: \`Weekly Progress: \${report.profiles.child_name}\`,
        html: \`<h1>Weekly Clinical Summary</h1><p>Practice: \${report.total_minutes} mins.</p>\`
      })
    })
  }

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
})
EOF

npx supabase functions deploy weekly-summary
curl -i --location --request POST 'https://ewxjlaerwijuoymkmdtz.supabase.co/functions/v1/weekly-summary'   --header 'Authorization: Bearer YOUR_ANON_KEY'   --header 'Content-Type: application/json'   --data '{}'
# Force restart the docker service
sudo service docker restart
# Give your user permission to talk to Docker without 'sudo'
sudo usermod -aG docker $USER
# Refresh your group settings (so the permission takes effect)
newgrp docker
npx supabase functions deploy weekly-summary --no-verify-jwt --import-map supabase/functions/import_map.json
npx supabase functions deploy weekly-summary --no-verify-jwt
cat <<EOF > app/\(tabs\)/progress.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [goalStats, setGoalStats] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const { data: sessions } = await supabase.from('sessions').select('goals_practiced');
      if (sessions) {
        const counts: any = {};
        sessions.forEach(s => {
          s.goals_practiced?.forEach((goal: string) => {
            counts[goal] = (counts[goal] || 0) + 1;
          });
        });
        const formatted = Object.keys(counts)
          .map(key => ({ name: key, count: counts[key] }))
          .sort((a, b) => b.count - a.count);
        setGoalStats(formatted);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Goal History</Text>
        <Text style={styles.subtitle}>Practice frequency per skill</Text>
        {goalStats.map((item) => (
          <View key={item.name} style={styles.statRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.goalName}>{item.name}</Text>
              <Text style={styles.goalCount}>{item.count} sessions</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: \`\${Math.min((item.count / 10) * 100, 100)}%\` }]} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 25 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 30 },
  statRow: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalName: { fontSize: 17, fontWeight: '600' },
  goalCount: { fontSize: 14, color: '#8E8E93' },
  progressBarBg: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5 },
  progressBarFill: { height: 10, backgroundColor: '#007AFF', borderRadius: 5 }
});
EOF

npx supabase functions deploy weekly-summary --use-api --project-ref ewxjlaerwijuoymkmdtz
curl -i --location --request POST 'https://ewxjlaerwijuoymkmdtz.supabase.co/functions/v1/weekly-summary'   --header 'Authorization: Bearer YOUR_ANON_KEY'   --header 'Content-Type: application/json'   --data '{}'
curl -i --location --request POST 'https://ewxjlaerwijuoymkmdtz.supabase.co/functions/v1/weekly-summary'   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eGpsYWVyd2lqdW95bWttZHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTQ4MjMsImV4cCI6MjA4ODc3MDgyM30.3VysQLuZloprWut2GcNaepf6sOd6QKVO-ZomZIGSSb0'   --header 'Content-Type: application/json'   --data '{}'
cat <<EOF > app/\(tabs\)/progress.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [goalStats, setGoalStats] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const { data: sessions } = await supabase.from('sessions').select('goals_practiced');
      if (sessions) {
        const counts: any = {};
        sessions.forEach(s => {
          s.goals_practiced?.forEach((goal: string) => {
            counts[goal] = (counts[goal] || 0) + 1;
          });
        });
        const formatted = Object.keys(counts)
          .map(key => ({ name: key, count: counts[key] }))
          .sort((a, b) => b.count - a.count);
        setGoalStats(formatted);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Goal History</Text>
        <Text style={styles.subtitle}>Practice frequency per skill</Text>
        {goalStats.map((item) => (
          <View key={item.name} style={styles.statRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.goalName}>{item.name}</Text>
              <Text style={styles.goalCount}>{item.count} sessions</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: \`\${Math.min((item.count / 10) * 100, 100)}%\` }]} />
            </View>
          </View>
        ))}
        {goalStats.length === 0 && (
          <Text style={styles.empty}>No sessions logged this week.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 25 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 30 },
  statRow: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalName: { fontSize: 17, fontWeight: '600' },
  goalCount: { fontSize: 14, color: '#8E8E93' },
  progressBarBg: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5 },
  progressBarFill: { height: 10, backgroundColor: '#007AFF', borderRadius: 5 },
  empty: { textAlign: 'center', marginTop: 40, color: '#8E8E93' }
});
EOF

cat <<EOF > app/paywall.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import Purchases from 'react-native-purchases';

export default function PaywallScreen() {
  const handlePurchase = async () => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      if (customerInfo.entitlements.active['pro']) {
        Alert.alert("Welcome to Pro!", "All features are now unlocked.");
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock ABA at Home Pro</Text>
      <Text style={styles.benefit}>✅ Weekly Clinical Progress Reports</Text>
      <Text style={styles.benefit}>✅ Unlimited AI-Generated Activities</Text>
      <Text style={styles.benefit}>✅ Multi-Child Profile Support</Text>
      
      <TouchableOpacity style={styles.button} onPress={handlePurchase}>
        <Text style={styles.buttonText}>Subscribe - $9.99/mo</Text>
      </TouchableOpacity>
      
      <Text style={styles.footer} onPress={() => Linking.openURL('https://docs.google.com/document/d/YOUR_ID')}>
        Privacy Policy & Terms of Use
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  benefit: { fontSize: 18, marginBottom: 15, color: '#444' },
  button: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, marginTop: 30 },
  buttonText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  footer: { marginTop: 40, color: '#8E8E93', textAlign: 'center', textDecorationLine: 'underline' }
});
EOF

# 1. Ensure you are logged into EAS
npx eas login
# 2. Configure the build (Select 'iOS')
npx eas build:configure
# 3. Start the production build
npx eas build --platform ios --profile production
# 1. Ensure you are logged into EAS
npx eas login
# 2. Configure the build (Select 'iOS')
npx eas build:configure
# 3. Start the production build
npx eas build --platform ios --profile production
cat <<EOF > .easignore
node_modules
.git
.expo
dist
build
EOF

npx eas build --platform ios --profile production --clear-cache
cat <<EOF > .easignore
# Dependencies
node_modules/

# Build outputs
ios/
android/
dist/
build/
*.ipa
*.apk
*.aab

# Temp/Cache files
.expo/
.cache/
.npm/

# Environment/Secrets
.env.local
.env.*.local

# Large Assets/Logs
*.log
EOF

# This shows the size of the project minus node_modules
du -sh . --exclude=node_modules
npx eas build --platform ios --profile production
npx eas submit --platform ios
npx eas secret:list
# Set the Supabase URL
npx eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://ewxjlaerwijuoymkmdtz.supabase.co --force --scope project
# Set the Anon Key
npx eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_ACTUAL_ANON_KEY_HERE --force --scope project
git commit -m "Ready for the new MacBook
git push origin main
