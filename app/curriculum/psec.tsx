import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - 60) / COLUMN_COUNT;

const INITIAL_BOARDS = [
  // --- Core Requests ---
  { id: '1', label: 'I Want', image: '🙋‍♂️', color: '#3B82F6', type: 'emoji' },
  { id: '2', label: 'More', image: '➕', color: '#10B981', type: 'emoji' },
  { id: '3', label: 'Help', image: '🆘', color: '#EF4444', type: 'emoji' },
  
  // --- Daily Essentials ---
  { id: '4', label: 'Eat', image: '🍎', color: '#10B981', type: 'emoji' },
  { id: '5', label: 'Drink', image: '🧃', color: '#60A5FA', type: 'emoji' },
  { id: '6', label: 'Bathroom', image: '🚽', color: '#F59E0B', type: 'emoji' },

  // --- Regulation & Boundaries ---
  { id: '7', label: 'Stop', image: '🛑', color: '#EF4444', type: 'emoji' },
  { id: '8', label: 'Break', image: '🧘', color: '#8B5CF6', type: 'emoji' },
  { id: '9', label: 'I Don\'t Like', image: '👎', color: '#6B7280', type: 'emoji' },

  // --- Social Responses ---
  { id: '10', label: 'Yes', image: '✅', color: '#10B981', type: 'emoji' },
  { id: '11', label: 'No', image: '❌', color: '#EF4444', type: 'emoji' },
  { id: '12', label: 'All Done', image: '🏁', color: '#6B7280', type: 'emoji' },
];

export default function PSECCommunication() {
  const router = useRouter();
  const [boards, setBoards] = useState(INITIAL_BOARDS);
  const [lastPressed, setLastPressed] = useState<string | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);

  const handlePress = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Speech.speak(label, { pitch: 1.2, rate: 0.9 });
    setLastPressed(label);
    setTimeout(() => setLastPressed(null), 2000);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setNewImage(result.assets[0].uri);
    }
  };

  const addButton = () => {
    if (newLabel) {
      const newBoard = {
        id: Date.now().toString(),
        label: newLabel,
        image: newImage || '✨',
        color: '#8B5CF6',
        type: newImage ? 'photo' : 'emoji'
      };
      setBoards([...boards, newBoard]);
      setModalVisible(false);
      setNewLabel('');
      setNewImage(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PSEC Assistant</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={32} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.messageBar}>
        <Text style={styles.messageText}>
          {lastPressed ? lastPressed : "Tap to Speak"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {boards.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.commButton, 
              { borderColor: item.color },
              lastPressed === item.label && { backgroundColor: item.color + '15' }
            ]}
            onPress={() => handlePress(item.label)}
          >
            <View style={styles.imageWrapper}>
              {item.type === 'photo' ? (
                <Image source={{ uri: item.image }} style={styles.photoImage} />
              ) : (
                <Text style={styles.emojiImage}>{item.image}</Text>
              )}
            </View>
            <Text style={styles.buttonLabel} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Button</Text>
            
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              {newImage ? (
                <Image source={{ uri: newImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={40} color="#9CA3AF" />
                  <Text style={styles.imagePlaceholderText}>Upload Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Button Label (e.g. My Blanket)"
              value={newLabel}
              onChangeText={setNewLabel}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={addButton}
              >
                <Text style={styles.saveBtnText}>Add Button</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  messageBar: { backgroundColor: '#FFF', margin: 16, padding: 24, borderRadius: 24, borderWidth: 4, borderColor: '#DBEAFE', alignItems: 'center', minHeight: 100 },
  messageText: { fontSize: 28, fontWeight: '900', color: '#2563EB' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'center', gap: 12 },
  commButton: { width: ITEM_WIDTH, height: ITEM_WIDTH * 1.3, backgroundColor: '#FFF', borderRadius: 24, borderWidth: 4, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  imageWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emojiImage: { fontSize: 44 },
  photoImage: { width: 60, height: 60, borderRadius: 12 },
  buttonLabel: { fontSize: 13, fontWeight: '800', color: '#111827', paddingHorizontal: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  imagePickerBtn: { width: 120, height: 120, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { fontSize: 12, color: '#9CA3AF', marginTop: 8, fontWeight: '600' },
  input: { width: '100%', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 24, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#2563EB' },
  cancelBtnText: { color: '#4B5563', fontWeight: '700' },
  saveBtnText: { color: '#FFF', fontWeight: '700' }
});