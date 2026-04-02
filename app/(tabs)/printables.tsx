import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function PrintablesScreen() {
  const [childName, setChildName] = useState('Child');

  useEffect(() => {
    async function getName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('child_name').eq('id', user.id).single();
        if (data?.child_name) setChildName(data.child_name);
      }
    }
    getName();
  }, []);

  const createPDF = async () => {
    // This is the "Blueprint" for the printable page
    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 40px; text-align: center; }
            .trace-name { font-size: 80px; border: 2px dashed #ccc; padding: 20px; color: #eee; letter-spacing: 10px; margin-bottom: 50px; }
            .instruction { font-size: 18px; color: #666; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .pecs-card { border: 2px solid #000; padding: 20px; height: 120px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; }
          </style>
        </head>
        <body>
          <h1>Practice Sheet for ${childName}</h1>
          <p class="instruction">Trace the letters below:</p>
          <div class="trace-name">${childName.toUpperCase()}</div>
          
          <hr />
          
          <h2>Home PECS Board</h2>
          <div class="grid">
            <div class="pecs-card">EAT 🍎</div>
            <div class="pecs-card">DRINK 🥤</div>
            <div class="pecs-card">PLAY 🧸</div>
            <div class="pecs-card">TOILET 🚽</div>
            <div class="pecs-card">ALL DONE ✅</div>
            <div class="pecs-card">HELP 🙋‍♂️</div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Error", "Could not generate PDF");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Learning Hub</Text>
      <Text style={styles.sub}>Print custom tools for your home environment.</Text>

      <TouchableOpacity style={styles.printCard} onPress={createPDF}>
        <View style={styles.iconCircle}>
          <Ionicons name="print" size={28} color="#fff" />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.cardTitle}>Custom Tracing & PECS</Text>
          <Text style={styles.cardSub}>Includes {childName}'s name practice and 6 basic communication cards.</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          Tip: Laminate these cards to make a durable "Communication Book" for travel!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 8 },
  sub: { fontSize: 16, color: '#636366', marginBottom: 24 },
  printCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textGroup: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardSub: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  infoBox: { flexDirection: 'row', backgroundColor: '#E1EFFF', padding: 15, borderRadius: 12, marginTop: 30, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 10, color: '#004085', fontSize: 14, lineHeight: 20 }
});
