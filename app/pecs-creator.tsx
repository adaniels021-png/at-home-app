import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../lib/SelectedChildContext';
import { useChildSubscription as useSubscription } from '../lib/ChildSubscriptionContext';
import { hasEntitlement } from '../lib/entitlements';
import { supabase } from '../lib/supabase';

type CardCategory =
  | 'Needs'
  | 'Food'
  | 'Feelings'
  | 'Actions'
  | 'People'
  | 'Places'
  | 'Routine'
  | 'Custom';

type VisualStyle = 'Cartoon' | 'Real Photo' | 'Simple Icon';

type PecsTemplate = {
  id: string;
  label: string;
  helperText: string;
  category: CardCategory;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  backgroundColor: string;
  cartoonPrompt: string;
};

const CATEGORIES: CardCategory[] = [
  'Needs',
  'Food',
  'Feelings',
  'Actions',
  'People',
  'Places',
  'Routine',
  'Custom',
];

const VISUAL_STYLES: VisualStyle[] = ['Cartoon', 'Real Photo', 'Simple Icon'];

const ICON_OPTIONS: Array<keyof typeof Ionicons.glyphMap> = [
  'chatbubble',
  'hand-left',
  'restaurant',
  'water',
  'happy',
  'sad',
  'flame',
  'walk',
  'home',
  'car',
  'school',
  'pause-circle',
  'checkmark-circle',
  'play',
  'bed',
  'star',
  'game-controller',
  'leaf',
  'sunny',
  'sparkles',
  'moon',
  'alert-circle',
  'person',
  'cart',
  'add-circle',
  'stop-circle',
  'time',
  'arrow-forward-circle',
  'body',
];

const CATEGORY_THEME: Record<CardCategory, { accent: string; bg: string }> = {
  Needs: { accent: '#2563EB', bg: '#EFF6FF' },
  Food: { accent: '#EA580C', bg: '#FFF7ED' },
  Feelings: { accent: '#7C3AED', bg: '#F5F3FF' },
  Actions: { accent: '#0891B2', bg: '#ECFEFF' },
  People: { accent: '#DB2777', bg: '#FDF2F8' },
  Places: { accent: '#16A34A', bg: '#F0FDF4' },
  Routine: { accent: '#D97706', bg: '#FFFBEB' },
  Custom: { accent: '#4F46E5', bg: '#EEF2FF' },
};

const QUICK_TEMPLATES: PecsTemplate[] = [
  {
    id: 'help',
    label: 'Help',
    helperText: 'I need help',
    category: 'Needs',
    icon: 'hand-left',
    accentColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child raising one hand and looking toward a helpful adult, simple background, clear help action, AAC style.',
  },
  {
    id: 'potty',
    label: 'Potty',
    helperText: 'I need potty',
    category: 'Needs',
    icon: 'body',
    accentColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child walking toward a bathroom with a toilet symbol, very clear potty meaning, AAC style.',
  },
  {
    id: 'break',
    label: 'Break',
    helperText: 'I need a break',
    category: 'Needs',
    icon: 'pause-circle',
    accentColor: '#0F766E',
    backgroundColor: '#F0FDFA',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child resting calmly on a bean bag or quiet mat, clear break meaning, AAC style.',
  },
  {
    id: 'all-done',
    label: 'All Done',
    helperText: 'All done',
    category: 'Needs',
    icon: 'checkmark-circle',
    accentColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child smiling with finished hands gesture, clear all-done meaning, AAC style.',
  },
  {
    id: 'more',
    label: 'More',
    helperText: 'I want more',
    category: 'Needs',
    icon: 'add-circle',
    accentColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child reaching forward asking for more, simple clear requesting gesture, AAC style.',
  },
  {
    id: 'stop',
    label: 'Stop',
    helperText: 'Stop please',
    category: 'Needs',
    icon: 'stop-circle',
    accentColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child holding one hand forward in a stop gesture, very clear action, AAC style.',
  },
  {
    id: 'eat',
    label: 'Eat',
    helperText: 'I am hungry',
    category: 'Food',
    icon: 'restaurant',
    accentColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child with spoon and bowl ready to eat, clear eating meaning, AAC style.',
  },
  {
    id: 'drink',
    label: 'Drink',
    helperText: 'I want a drink',
    category: 'Food',
    icon: 'water',
    accentColor: '#8B5CF6',
    backgroundColor: '#FAF5FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child drinking from a cup with straw, clear drink action, AAC style.',
  },
  {
    id: 'snack',
    label: 'Snack',
    helperText: 'I want a snack',
    category: 'Food',
    icon: 'restaurant',
    accentColor: '#D97706',
    backgroundColor: '#FFFBEB',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child holding a small snack like crackers or apple slices, AAC style.',
  },
  {
    id: 'happy',
    label: 'Happy',
    helperText: 'I am happy',
    category: 'Feelings',
    icon: 'happy',
    accentColor: '#65A30D',
    backgroundColor: '#F7FEE7',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a smiling child with cheerful face and open body language, clear happy feeling, AAC style.',
  },
  {
    id: 'sad',
    label: 'Sad',
    helperText: 'I am sad',
    category: 'Feelings',
    icon: 'sad',
    accentColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child with sad face and teary eyes, gentle and easy to understand, AAC style.',
  },
  {
    id: 'mad',
    label: 'Mad',
    helperText: 'I am mad',
    category: 'Feelings',
    icon: 'flame',
    accentColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child with crossed arms and angry face, safe and simple, AAC style.',
  },
  {
    id: 'go',
    label: 'Go',
    helperText: 'I want to go',
    category: 'Actions',
    icon: 'arrow-forward-circle',
    accentColor: '#0891B2',
    backgroundColor: '#ECFEFF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child walking forward excitedly, very clear go action, AAC style.',
  },
  {
    id: 'wait',
    label: 'Wait',
    helperText: 'Please wait',
    category: 'Actions',
    icon: 'time',
    accentColor: '#6366F1',
    backgroundColor: '#EEF2FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child standing still with one finger up to mean wait, AAC style.',
  },
  {
    id: 'play',
    label: 'Play',
    helperText: 'I want to play',
    category: 'Actions',
    icon: 'game-controller',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child playing happily with toys or a ball, clear play action, AAC style.',
  },
  {
    id: 'sit',
    label: 'Sit',
    helperText: 'Sit down',
    category: 'Actions',
    icon: 'bed',
    accentColor: '#0F766E',
    backgroundColor: '#F0FDFA',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a young child sitting calmly on a chair, clear sit action, AAC style.',
  },
  {
    id: 'mom',
    label: 'Mom',
    helperText: 'I want mom',
    category: 'People',
    icon: 'person',
    accentColor: '#DB2777',
    backgroundColor: '#FDF2F8',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a smiling mother figure waving gently, very clear mom meaning, AAC style.',
  },
  {
    id: 'dad',
    label: 'Dad',
    helperText: 'I want dad',
    category: 'People',
    icon: 'person-outline',
    accentColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a smiling father figure waving gently, very clear dad meaning, AAC style.',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    helperText: 'I want teacher',
    category: 'People',
    icon: 'school',
    accentColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a friendly teacher figure in a simple classroom setting, AAC style.',
  },
  {
    id: 'home',
    label: 'Home',
    helperText: 'I want to go home',
    category: 'Places',
    icon: 'home',
    accentColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a cozy house with door and windows, very easy for a child to recognize as home, AAC style.',
  },
  {
    id: 'store',
    label: 'Store',
    helperText: 'Go to the store',
    category: 'Places',
    icon: 'cart',
    accentColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a small store with shopping bag or cart, easy to understand, AAC style.',
  },
  {
    id: 'car',
    label: 'Car',
    helperText: 'Go in the car',
    category: 'Places',
    icon: 'car',
    accentColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a bright simple family car, very easy for a child to recognize, AAC style.',
  },
  {
    id: 'park',
    label: 'Park',
    helperText: 'Go to the park',
    category: 'Places',
    icon: 'leaf',
    accentColor: '#65A30D',
    backgroundColor: '#F7FEE7',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a playground with slide and tree, clear park setting, AAC style.',
  },
  {
    id: 'wake-up',
    label: 'Wake Up',
    helperText: 'Wake up time',
    category: 'Routine',
    icon: 'sunny',
    accentColor: '#D97706',
    backgroundColor: '#FFFBEB',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a child stretching in bed with morning sun, clear wake-up routine, AAC style.',
  },
  {
    id: 'brush-teeth',
    label: 'Brush Teeth',
    helperText: 'Brush teeth',
    category: 'Routine',
    icon: 'sparkles',
    accentColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a child brushing teeth with toothbrush, clear routine, AAC style.',
  },
  {
    id: 'bath',
    label: 'Bath',
    helperText: 'Bath time',
    category: 'Routine',
    icon: 'water',
    accentColor: '#0891B2',
    backgroundColor: '#ECFEFF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a child sitting in a bubble bath, clear bath routine, AAC style.',
  },
  {
    id: 'bedtime',
    label: 'Bedtime',
    helperText: 'Time for bed',
    category: 'Routine',
    icon: 'moon',
    accentColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    cartoonPrompt:
      'A child-friendly cartoon picture showing a child tucked into bed with moon and stars, clear bedtime routine, AAC style.',
  },
];

export default function PecsCreatorScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro: subscriptionIsPro, loading: subscriptionLoading } = useSubscription();
  const isPro = hasEntitlement(
    { isPro: subscriptionIsPro },
    'pecs_customize'
  );

  const [label, setLabel] = useState('');
  const [helperText, setHelperText] = useState('');
  const [category, setCategory] = useState<CardCategory>('Needs');
  const [selectedIcon, setSelectedIcon] =
    useState<keyof typeof Ionicons.glyphMap>('chatbubble');

  const [visualStyle, setVisualStyle] = useState<VisualStyle>('Cartoon');
  const [cartoonPrompt, setCartoonPrompt] = useState('');

  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return label.trim().length > 0 && !!selectedChild?.id && !uploading;
  }, [label, selectedChild, uploading]);

  const previewTitle = useMemo(() => {
    return label.trim() || 'My Card';
  }, [label]);

  const previewHelper = useMemo(() => {
    return helperText.trim() || 'Short child-friendly phrase';
  }, [helperText]);

  const previewImageSource = uploadedImageUrl || localImageUri;
  const theme = CATEGORY_THEME[category];

  const filteredTemplates = useMemo(() => {
    if (category === 'Custom') return QUICK_TEMPLATES;
    return QUICK_TEMPLATES.filter((item) => item.category === category);
  }, [category]);

  const applyTemplate = (template: PecsTemplate) => {
    setSelectedTemplateId(template.id);
    setLabel(template.label);
    setHelperText(template.helperText);
    setCategory(template.category);
    setSelectedIcon(template.icon);
    setVisualStyle('Cartoon');
    setCartoonPrompt(template.cartoonPrompt);
  };

  const clearForm = () => {
    setSelectedTemplateId(null);
    setLabel('');
    setHelperText('');
    setCategory('Needs');
    setSelectedIcon('chatbubble');
    setVisualStyle('Cartoon');
    setCartoonPrompt('');
    setLocalImageUri(null);
    setUploadedImageUrl(null);
  };

  const pickImageFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow photo access to upload PECS card images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setLocalImageUri(asset.uri);

      if (!asset.base64) {
        Alert.alert('Upload failed', 'Could not read the selected image.');
        return;
      }

      await uploadImageToSupabase(asset.base64, asset.mimeType || 'image/jpeg');
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Image error', error?.message || 'Could not pick image.');
    }
  };

  const uploadImageToSupabase = async (base64: string, mimeType: string) => {
    if (!selectedChild?.id) {
      Alert.alert('No child selected', 'Please select a child first.');
      return;
    }

    setUploading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData.user;
      if (!user) {
        Alert.alert('Not signed in', 'Please sign in again.');
        return;
      }

      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const filePath = `${user.id}/${selectedChild.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('pecs-images')
        .upload(filePath, decode(base64), {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('pecs-images')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Could not generate public image URL.');
      }

      setUploadedImageUrl(publicUrlData.publicUrl);
      Alert.alert('Image uploaded', 'Your PECS image is ready to save.');
    } catch (error: any) {
      console.error('Supabase upload error:', error);
      Alert.alert('Upload failed', error?.message || 'Could not upload image.');
      setUploadedImageUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setLocalImageUri(null);
    setUploadedImageUrl(null);
  };

  const saveCard = async () => {
    if (!selectedChild?.id) {
      Alert.alert('No child selected', 'Please select a child before creating a PECS card.');
      return;
    }

    if (!label.trim()) {
      Alert.alert('Missing label', 'Please enter a card label.');
      return;
    }

    if (!isPro) {
      Alert.alert(
        'Pro Feature',
        'Custom PECS card creation is available with ABA at Home Pro.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData.user;
      if (!user) {
        Alert.alert('Not signed in', 'Please sign in again.');
        return;
      }

      const payload = {
        user_id: user.id,
        child_id: selectedChild.id,
        title: label.trim(),
        category,
        image_url: uploadedImageUrl,
        icon_name: selectedIcon,
        is_custom: true,
        helper_text: helperText.trim() || label.trim(),
        visual_style: visualStyle,
        cartoon_prompt: cartoonPrompt.trim() || null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('pecs_cards').insert([payload]);

      if (error) {
        if (
          typeof error.message === 'string' &&
          (error.message.toLowerCase().includes('helper_text') ||
            error.message.toLowerCase().includes('visual_style') ||
            error.message.toLowerCase().includes('cartoon_prompt'))
        ) {
          const fallbackPayload = {
            user_id: user.id,
            child_id: selectedChild.id,
            title: label.trim(),
            category,
            image_url: uploadedImageUrl,
            icon_name: selectedIcon,
            is_custom: true,
            created_at: new Date().toISOString(),
          };

          const { error: fallbackError } = await supabase
            .from('pecs_cards')
            .insert([fallbackPayload]);

          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      Alert.alert(
        'Card Saved',
        'Your custom PECS card was saved successfully.',
        [
          {
            text: 'Create Another',
            onPress: clearForm,
          },
          {
            text: 'Open Communication',
            onPress: () => router.replace('/communication'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Save PECS card error:', error);
      Alert.alert('Save failed', error?.message || 'Could not save the PECS card.');
    } finally {
      setSaving(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Checking subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const proPreviewMode = !isPro;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Create PECS Card</Text>

          <View style={styles.backBtnPlaceholder} />
        </View>

        <Text style={styles.headerSubtitle}>
          Build child-friendly visual cards with a simple word, short phrase, and clear picture.
        </Text>

        {proPreviewMode ? (
          <View style={styles.lockedBanner}>
            <View style={styles.lockedHeader}>
              <Ionicons name="lock-closed" size={18} color="#7C2D12" />
              <Text style={styles.lockedTitle}>Pro Feature Preview</Text>
            </View>
            <Text style={styles.lockedText}>
              You can build and preview PECS cards here during development. Saving custom cards is a Pro feature.
            </Text>
            <TouchableOpacity
              style={styles.lockedButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.lockedButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={18} color="#D97706" />
            <Text style={styles.tipTitle}>Level B Communication Design</Text>
          </View>
          <Text style={styles.tipText}>
            The strongest PECS cards for your app use one clear word, one short helper phrase,
            and a child-friendly cartoon visual that clearly shows the action or meaning.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Category</Text>

          <View style={styles.chipWrap}>
            {CATEGORIES.map((item) => {
              const active = item === category;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.templateHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Start Templates</Text>
            <TouchableOpacity onPress={clearForm}>
              <Text style={styles.clearTemplateText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            Tap a template to auto-fill the card with a child-friendly word, phrase, icon, and cartoon idea.
          </Text>

          <View style={styles.templateGrid}>
            {filteredTemplates.map((template) => {
              const active = selectedTemplateId === template.id;

              return (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateCard,
                    active && styles.templateCardActive,
                    { borderColor: active ? template.accentColor : '#E2E8F0' },
                  ]}
                  onPress={() => applyTemplate(template)}
                >
                  <View
                    style={[
                      styles.templateIconWrap,
                      { backgroundColor: template.backgroundColor },
                    ]}
                  >
                    <Ionicons
                      name={template.icon}
                      size={24}
                      color={template.accentColor}
                    />
                  </View>

                  <Text style={styles.templateLabel}>{template.label}</Text>
                  <Text style={styles.templateHelper}>{template.helperText}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Live Preview</Text>

          <View style={styles.previewTile}>
            <View
              style={[
                styles.previewVisualPanel,
                { backgroundColor: theme.bg, borderColor: theme.accent },
              ]}
            >
              {previewImageSource ? (
                <Image
                  source={{ uri: previewImageSource }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.previewPlaceholderWrap}>
                  <View style={[styles.previewIconCircle, { backgroundColor: `${theme.accent}22` }]}>
                    <Ionicons name={selectedIcon} size={42} color={theme.accent} />
                  </View>
                  <Text style={styles.previewPlaceholderText}>
                    {visualStyle === 'Cartoon'
                      ? 'Upload a cartoon-style visual for the strongest child understanding'
                      : visualStyle === 'Real Photo'
                        ? 'Upload a real-life photo visual'
                        : 'This card will use a simple icon style'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.previewLabel}>{previewTitle}</Text>
            <Text style={styles.previewHelperText}>{previewHelper}</Text>
            <Text style={styles.previewCategory}>{category}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Card Details</Text>

          <Text style={styles.inputLabel}>Main Word</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Example: Help"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Child-Friendly Phrase</Text>
          <TextInput
            value={helperText}
            onChangeText={setHelperText}
            placeholder="Example: I need help"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.helperText}>
            Keep the phrase short, simple, and easy for a child to understand.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Visual Style</Text>
          <Text style={styles.helperText}>
            Cartoon visuals usually work best for Level B because they clearly show the action to the child.
          </Text>

          <View style={styles.visualStyleRow}>
            {VISUAL_STYLES.map((style) => {
              const active = style === visualStyle;
              return (
                <TouchableOpacity
                  key={style}
                  style={[styles.visualStyleChip, active && styles.visualStyleChipActive]}
                  onPress={() => setVisualStyle(style)}
                >
                  <Text
                    style={[
                      styles.visualStyleChipText,
                      active && styles.visualStyleChipTextActive,
                    ]}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Cartoon Prompt Helper</Text>
          <Text style={styles.helperText}>
            Use this to guide what kind of child-friendly cartoon image should be created or uploaded.
          </Text>

          <TextInput
            value={cartoonPrompt}
            onChangeText={setCartoonPrompt}
            placeholder="Example: A child-friendly cartoon picture showing a young child raising one hand and looking for help."
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.multilineInput]}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.promptTipBox}>
            <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
            <Text style={styles.promptTipText}>
              Best prompt style: “A child-friendly cartoon picture showing…” and then describe the action clearly.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Photo / Cartoon Image</Text>

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => void pickImageFromLibrary()}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="images-outline" size={18} color="#FFFFFF" />
                <Text style={styles.uploadBtnText}>
                  {visualStyle === 'Cartoon' ? 'Choose Cartoon Image' : 'Choose Image'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {previewImageSource ? (
            <View style={styles.selectedImageWrap}>
              <Image
                source={{ uri: previewImageSource }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity style={styles.removeBtn} onPress={removeImage}>
                <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                <Text style={styles.removeBtnText}>Remove Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.helperText}>
              For Level B, try to use visuals that clearly show the action, person, place, or feeling in a child-friendly way.
            </Text>
          )}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Fallback Icon</Text>
          <Text style={styles.helperText}>
            This icon is used if no image is attached.
          </Text>

          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((icon) => {
              const active = icon === selectedIcon;
              return (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconTile, active && styles.iconTileActive]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Ionicons
                    name={icon}
                    size={26}
                    color={active ? '#FFFFFF' : '#4F46E5'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="sparkles" size={18} color="#F59E0B" />
            <Text style={styles.infoTitle}>Level B PECS Goal</Text>
          </View>
          <Text style={styles.infoText}>
            Build cards that are visually obvious for a child: clear action, short phrase, bright contrast, and minimal clutter.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || proPreviewMode) && styles.saveBtnDisabled]}
          onPress={() => void saveCard()}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {proPreviewMode ? 'Pro Required to Save' : 'Save Custom Card'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },

  lockedBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lockedTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#9A3412',
    fontSize: 15,
  },
  lockedText: {
    color: '#9A3412',
    lineHeight: 20,
    fontSize: 14,
    marginBottom: 12,
  },
  lockedButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  lockedButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  tipCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#92400E',
  },
  tipText: {
    color: '#B45309',
    lineHeight: 20,
    fontSize: 14,
  },

  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 14,
  },

  templateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  clearTemplateText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 13,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  templateCard: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
    padding: 14,
    marginBottom: 12,
  },
  templateCardActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  templateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  templateLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  templateHelper: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    fontWeight: '700',
  },

  previewTile: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  previewVisualPanel: {
    width: '100%',
    height: 170,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  previewPlaceholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  previewIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  previewPlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  previewLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  previewHelperText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  previewCategory: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 8,
  },

  visualStyleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  visualStyleChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
  },
  visualStyleChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  visualStyleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  visualStyleChipTextActive: {
    color: '#FFFFFF',
  },

  promptTipBox: {
    marginTop: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  promptTipText: {
    marginLeft: 8,
    color: '#6D28D9',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  uploadBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  uploadBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  selectedImageWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  selectedImage: {
    width: 160,
    height: 160,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  removeBtnText: {
    marginLeft: 6,
    color: '#B91C1C',
    fontWeight: '700',
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  iconTile: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconTileActive: {
    backgroundColor: '#4F46E5',
  },

  infoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 22,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 18,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  infoText: {
    color: '#B45309',
    lineHeight: 21,
    fontSize: 14,
  },

  saveBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
