import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
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
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../lib/SelectedChildContext';
import { PECS_IMAGES } from '../lib/pecsImages';
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

type BuiltInVisualType =
  | 'help'
  | 'potty'
  | 'break'
  | 'all_done'
  | 'more'
  | 'stop'
  | 'eat'
  | 'drink'
  | 'snack'
  | 'happy'
  | 'sad'
  | 'mad'
  | 'scared'
  | 'go'
  | 'wait'
  | 'play'
  | 'sit'
  | 'mom'
  | 'dad'
  | 'teacher'
  | 'home'
  | 'store'
  | 'car'
  | 'park'
  | 'wake_up'
  | 'brush_teeth'
  | 'bath'
  | 'bedtime';

type PrintableCard = {
  id: string;
  label: string;
  helperText: string;
  category: CardCategory;
  icon?: keyof typeof Ionicons.glyphMap;
  imageUrl?: string | null;
  isCustom?: boolean;
  accentColor: string;
  backgroundColor: string;
  visualType?: BuiltInVisualType;
};

type LayoutOption = '2x2' | '2x3' | '3x3';

type SavedTemplate = {
  id: string;
  child_id: string;
  name: string;
  layout: LayoutOption;
  card_ids: string[];
  created_at?: string;
};

const CATEGORIES: Array<CardCategory | 'All'> = [
  'All',
  'Needs',
  'Food',
  'Feelings',
  'Actions',
  'People',
  'Places',
  'Routine',
  'Custom',
];

const BUILT_IN_CARDS: PrintableCard[] = [
  {
    id: '1',
    label: 'Help',
    helperText: 'I need help',
    icon: 'hand-left',
    category: 'Needs',
    accentColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    visualType: 'help',
  },
  {
    id: '2',
    label: 'Potty',
    helperText: 'I need potty',
    icon: 'body',
    category: 'Needs',
    accentColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
    visualType: 'potty',
  },
  {
    id: '3',
    label: 'Break',
    helperText: 'I need a break',
    icon: 'pause-circle',
    category: 'Needs',
    accentColor: '#0F766E',
    backgroundColor: '#F0FDFA',
    visualType: 'break',
  },
  {
    id: '4',
    label: 'All Done',
    helperText: 'All done',
    icon: 'checkmark-circle',
    category: 'Needs',
    accentColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    visualType: 'all_done',
  },
  {
    id: '5',
    label: 'More',
    helperText: 'I want more',
    icon: 'add-circle',
    category: 'Needs',
    accentColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    visualType: 'more',
  },
  {
    id: '6',
    label: 'Stop',
    helperText: 'Stop please',
    icon: 'stop-circle',
    category: 'Needs',
    accentColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    visualType: 'stop',
  },
  {
    id: '7',
    label: 'Eat',
    helperText: 'I am hungry',
    icon: 'restaurant',
    category: 'Food',
    accentColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    visualType: 'eat',
  },
  {
    id: '8',
    label: 'Drink',
    helperText: 'I want a drink',
    icon: 'water',
    category: 'Food',
    accentColor: '#8B5CF6',
    backgroundColor: '#FAF5FF',
    visualType: 'drink',
  },
  {
    id: '9',
    label: 'Snack',
    helperText: 'I want a snack',
    icon: 'pizza',
    category: 'Food',
    accentColor: '#D97706',
    backgroundColor: '#FFFBEB',
    visualType: 'snack',
  },
  {
    id: '10',
    label: 'Happy',
    helperText: 'I am happy',
    icon: 'happy',
    category: 'Feelings',
    accentColor: '#65A30D',
    backgroundColor: '#F7FEE7',
    visualType: 'happy',
  },
  {
    id: '11',
    label: 'Sad',
    helperText: 'I am sad',
    icon: 'sad',
    category: 'Feelings',
    accentColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
    visualType: 'sad',
  },
  {
    id: '12',
    label: 'Mad',
    helperText: 'I am mad',
    icon: 'flame',
    category: 'Feelings',
    accentColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    visualType: 'mad',
  },
  {
    id: '13',
    label: 'Scared',
    helperText: 'I am scared',
    icon: 'alert-circle',
    category: 'Feelings',
    accentColor: '#9333EA',
    backgroundColor: '#FAF5FF',
    visualType: 'scared',
  },
  {
    id: '14',
    label: 'Go',
    helperText: 'I want to go',
    icon: 'arrow-forward-circle',
    category: 'Actions',
    accentColor: '#0891B2',
    backgroundColor: '#ECFEFF',
    visualType: 'go',
  },
  {
    id: '15',
    label: 'Wait',
    helperText: 'Please wait',
    icon: 'time',
    category: 'Actions',
    accentColor: '#6366F1',
    backgroundColor: '#EEF2FF',
    visualType: 'wait',
  },
  {
    id: '16',
    label: 'Play',
    helperText: 'I want to play',
    icon: 'game-controller',
    category: 'Actions',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    visualType: 'play',
  },
  {
    id: '17',
    label: 'Sit',
    helperText: 'Sit down',
    icon: 'bed',
    category: 'Actions',
    accentColor: '#0F766E',
    backgroundColor: '#F0FDFA',
    visualType: 'sit',
  },
  {
    id: '18',
    label: 'Mom',
    helperText: 'I want mom',
    icon: 'person',
    category: 'People',
    accentColor: '#DB2777',
    backgroundColor: '#FDF2F8',
    visualType: 'mom',
  },
  {
    id: '19',
    label: 'Dad',
    helperText: 'I want dad',
    icon: 'person-outline',
    category: 'People',
    accentColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    visualType: 'dad',
  },
  {
    id: '20',
    label: 'Teacher',
    helperText: 'I want teacher',
    icon: 'school',
    category: 'People',
    accentColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    visualType: 'teacher',
  },
  {
    id: '21',
    label: 'Home',
    helperText: 'I want to go home',
    icon: 'home',
    category: 'Places',
    accentColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    visualType: 'home',
  },
  {
    id: '22',
    label: 'Store',
    helperText: 'Go to the store',
    icon: 'cart',
    category: 'Places',
    accentColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    visualType: 'store',
  },
  {
    id: '23',
    label: 'Car',
    helperText: 'Go in the car',
    icon: 'car',
    category: 'Places',
    accentColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
    visualType: 'car',
  },
  {
    id: '24',
    label: 'Park',
    helperText: 'Go to the park',
    icon: 'leaf',
    category: 'Places',
    accentColor: '#65A30D',
    backgroundColor: '#F7FEE7',
    visualType: 'park',
  },
  {
    id: '25',
    label: 'Wake Up',
    helperText: 'Wake up time',
    icon: 'sunny',
    category: 'Routine',
    accentColor: '#D97706',
    backgroundColor: '#FFFBEB',
    visualType: 'wake_up',
  },
  {
    id: '26',
    label: 'Brush Teeth',
    helperText: 'Brush teeth',
    icon: 'sparkles',
    category: 'Routine',
    accentColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    visualType: 'brush_teeth',
  },
  {
    id: '27',
    label: 'Bath',
    helperText: 'Bath time',
    icon: 'water-outline',
    category: 'Routine',
    accentColor: '#0891B2',
    backgroundColor: '#ECFEFF',
    visualType: 'bath',
  },
  {
    id: '28',
    label: 'Bedtime',
    helperText: 'Time for bed',
    icon: 'moon',
    category: 'Routine',
    accentColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    visualType: 'bedtime',
  },
];
const getCategoryTheme = (category: CardCategory) => {
  switch (category) {
    case 'Needs':
      return { accentColor: '#2563EB', backgroundColor: '#EFF6FF' };
    case 'Food':
      return { accentColor: '#EA580C', backgroundColor: '#FFF7ED' };
    case 'Feelings':
      return { accentColor: '#7C3AED', backgroundColor: '#F5F3FF' };
    case 'Actions':
      return { accentColor: '#0891B2', backgroundColor: '#ECFEFF' };
    case 'People':
      return { accentColor: '#DB2777', backgroundColor: '#FDF2F8' };
    case 'Places':
      return { accentColor: '#16A34A', backgroundColor: '#F0FDF4' };
    case 'Routine':
      return { accentColor: '#D97706', backgroundColor: '#FFFBEB' };
    default:
      return { accentColor: '#4F46E5', backgroundColor: '#EEF2FF' };
  }
};

function getLayoutCardLimit(layout: LayoutOption) {
  if (layout === '2x2') return 4;
  if (layout === '2x3') return 6;
  return 9;
}

function getGridColumns(layout: LayoutOption) {
  if (layout === '2x2') return 2;
  if (layout === '2x3') return 2;
  return 3;
}

export default function PecsPrintablesScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [customCards, setCustomCards] = useState<PrintableCard[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CardCategory | 'All'>('All');
  const [layout, setLayout] = useState<LayoutOption>('2x3');
  const [childName, setChildName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    void loadData();
  }, [selectedChild?.id]);

  const loadData = async () => {
    if (!selectedChild?.id) {
      setCustomCards([]);
      setSavedTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [cardsRes, templatesRes] = await Promise.all([
        supabase
          .from('pecs_cards')
          .select('id, title, helper_text, category, image_url, icon_name, is_custom')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('pecs_templates')
          .select('id, child_id, name, layout, card_ids, created_at')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false }),
      ]);

      let mappedCards: PrintableCard[] = [];

      if (cardsRes.error) {
        const fallback = await supabase
          .from('pecs_cards')
          .select('id, title, category, image_url, icon_name, is_custom')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false });

        if (fallback.error) throw fallback.error;

        mappedCards =
          fallback.data?.map((item: any) => {
            const category = (item.category || 'Custom') as CardCategory;
            const theme = getCategoryTheme(category);

            return {
              id: `custom-${item.id}`,
              label: item.title,
              helperText: item.title,
              category,
              imageUrl: item.image_url || null,
              icon: item.icon_name || 'chatbubble',
              isCustom: !!item.is_custom,
              accentColor: theme.accentColor,
              backgroundColor: theme.backgroundColor,
            };
          }) || [];
      } else {
        mappedCards =
          cardsRes.data?.map((item: any) => {
            const category = (item.category || 'Custom') as CardCategory;
            const theme = getCategoryTheme(category);

            return {
              id: `custom-${item.id}`,
              label: item.title,
              helperText: item.helper_text || item.title,
              category,
              imageUrl: item.image_url || null,
              icon: item.icon_name || 'chatbubble',
              isCustom: !!item.is_custom,
              accentColor: theme.accentColor,
              backgroundColor: theme.backgroundColor,
            };
          }) || [];
      }

      setCustomCards(mappedCards);

      if (templatesRes.error) {
        console.error('Load templates error:', templatesRes.error);
        setSavedTemplates([]);
      } else {
        setSavedTemplates((templatesRes.data as SavedTemplate[]) || []);
      }
    } catch (error: any) {
      console.error('Load PECS printables error:', error);
      Alert.alert('Load Failed', error?.message || 'Could not load PECS cards.');
    } finally {
      setLoading(false);
    }
  };

  const allCards = useMemo(() => [...BUILT_IN_CARDS, ...customCards], [customCards]);

  const filteredCards = useMemo(() => {
    if (selectedCategory === 'All') return allCards;
    return allCards.filter((card) => card.category === selectedCategory);
  }, [allCards, selectedCategory]);

  const selectedCards = useMemo(() => {
    return selectedIds
      .map((id) => allCards.find((card) => card.id === id))
      .filter(Boolean) as PrintableCard[];
  }, [allCards, selectedIds]);

  const cardLimit = getLayoutCardLimit(layout);

  const toggleCardSelection = (cardId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }

      if (prev.length >= cardLimit) {
        Alert.alert(
          'Layout Limit Reached',
          `This ${layout} layout can hold up to ${cardLimit} cards.`
        );
        return prev;
      }

      return [...prev, cardId];
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const applyTemplate = (template: SavedTemplate) => {
    setLayout(template.layout);
    setSelectedIds((template.card_ids || []).slice(0, getLayoutCardLimit(template.layout)));
    setTemplateName(template.name || '');
  };
    const saveTemplate = async () => {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child first.');
      return;
    }

    if (!templateName.trim()) {
      Alert.alert('Missing Template Name', 'Please enter a template name.');
      return;
    }

    if (selectedIds.length === 0) {
      Alert.alert('No Cards Selected', 'Select at least one card before saving a template.');
      return;
    }

    setSavingTemplate(true);

    try {
      const payload = {
        child_id: selectedChild.id,
        name: templateName.trim(),
        layout,
        card_ids: selectedIds,
      };

      const { error } = await supabase.from('pecs_templates').insert(payload);

      if (error) throw error;

      Alert.alert('Template Saved', 'Your printable template has been saved.');
      setTemplateName('');
      await loadData();
    } catch (error: any) {
      console.error('Save template error:', error);
      Alert.alert('Save Failed', error?.message || 'Could not save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase.from('pecs_templates').delete().eq('id', templateId);

      if (error) throw error;

      setSavedTemplates((prev) => prev.filter((item) => item.id !== templateId));
    } catch (error: any) {
      console.error('Delete template error:', error);
      Alert.alert('Delete Failed', error?.message || 'Could not delete this template.');
    }
  };

  const getCardImageHtml = (card: PrintableCard) => {
    if (card.imageUrl) {
      return `<img src="${card.imageUrl}" class="card-image" />`;
    }

    if (card.visualType && PECS_IMAGES[card.visualType]) {
      return `<img src="${Image.resolveAssetSource(PECS_IMAGES[card.visualType]).uri}" class="card-image contain" />`;
    }

    return `
      <div class="icon-fallback" style="border-color:${card.accentColor}; color:${card.accentColor};">
        ${card.label}
      </div>
    `;
  };

  const buildCardHtml = (card: PrintableCard) => {
    return `
      <div class="pecs-card" style="border-color:${card.accentColor}; background:#FFFFFF;">
        <div class="visual-wrap" style="background:${card.backgroundColor}; border-color:${card.accentColor};">
          ${getCardImageHtml(card)}
        </div>
        <div class="word">${card.label}</div>
        <div class="phrase">${card.helperText}</div>
      </div>
    `;
  };

  const buildPdfHtml = () => {
    const columns = getGridColumns(layout);
    const printableCards = selectedCards.slice(0, cardLimit);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 24px; }

            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
              color: #0F172A;
              margin: 0;
              padding: 0;
              background: #FFFDF8;
            }

            .page {
              min-height: 100vh;
              padding: 10px;
              background:
                radial-gradient(circle at top right, #FCE7F3 0, #FFFDF8 28%),
                radial-gradient(circle at bottom left, #DBEAFE 0, #FFFDF8 32%);
            }

            .header { text-align: center; margin-bottom: 18px; }
            .title { font-size: 30px; font-weight: 800; margin-bottom: 8px; }
            .subtitle { font-size: 14px; color: #475569; }

            .child-name {
              display: inline-block;
              margin-top: 10px;
              background: #EEF2FF;
              color: #4F46E5;
              border-radius: 999px;
              padding: 7px 14px;
              font-size: 13px;
              font-weight: 800;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(${columns}, 1fr);
              gap: 16px;
            }

            .pecs-card {
              border: 3px solid #CBD5E1;
              border-radius: 22px;
              padding: 12px;
              min-height: 220px;
              box-sizing: border-box;
              page-break-inside: avoid;
            }

            .visual-wrap {
              height: 110px;
              border-radius: 18px;
              border: 2px solid #CBD5E1;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 12px;
              overflow: hidden;
            }

            .card-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .card-image.contain {
              object-fit: contain;
              background: #FFFFFF;
            }

            .icon-fallback {
              width: 82%;
              height: 78%;
              border-radius: 20px;
              border: 2px solid;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 8px;
              box-sizing: border-box;
              font-size: 20px;
              font-weight: 800;
              background: #FFFFFFAA;
            }

            .word {
              font-size: 24px;
              font-weight: 900;
              text-align: center;
              margin-bottom: 6px;
            }

            .phrase {
              font-size: 14px;
              line-height: 1.4;
              text-align: center;
              color: #475569;
              font-weight: 700;
            }

            .footer-note {
              margin-top: 18px;
              background: #FFFBEB;
              border-left: 4px solid #F59E0B;
              border-radius: 14px;
              padding: 12px;
              color: #92400E;
              font-size: 13px;
              line-height: 1.5;
            }

            .cut-note {
              margin-top: 10px;
              text-align: center;
              color: #64748B;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="title">PECS Printable Cards</div>
              <div class="subtitle">Cut, laminate, and use during routines, play, and outings.</div>
              ${childName.trim() ? `<div class="child-name">${childName.trim()}</div>` : ''}
            </div>

            <div class="grid">
              ${printableCards.map(buildCardHtml).join('')}
            </div>

            <div class="footer-note">
              Parent tip: Use these with the same words and phrases your child sees in the app to build consistency.
            </div>

            <div class="cut-note">
              Print on cardstock if possible. Cut around each card and laminate for longer use.
            </div>
          </div>
        </body>
      </html>
    `;
  };
    const createPdf = async () => {
    if (selectedCards.length === 0) {
      Alert.alert('No Cards Selected', 'Please choose at least one card to print.');
      return null;
    }

    const html = buildPdfHtml();
    const file = await Print.printToFileAsync({ html });
    return file.uri;
  };

  const handleSharePdf = async () => {
    setExporting(true);

    try {
      const uri = await createPdf();
      if (!uri) return;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PECS Printable Cards',
      });
    } catch (error: any) {
      console.error('Share PECS PDF error:', error);
      Alert.alert('Share Failed', error?.message || 'Could not share the PECS PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleEmailPdf = async () => {
    setExporting(true);

    try {
      const uri = await createPdf();
      if (!uri) return;

      await MailComposer.composeAsync({
        subject: 'PECS Printable Cards - ABA at Home',
        body: 'Hi,\n\nAttached are PECS printable cards from ABA at Home.\n\nThanks.',
        attachments: [uri],
      });
    } catch (error: any) {
      console.error('Email PECS PDF error:', error);
      Alert.alert('Email Failed', error?.message || 'Could not open email for the PECS PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    setExporting(true);

    try {
      if (selectedCards.length === 0) {
        Alert.alert('No Cards Selected', 'Please choose at least one card to print.');
        return;
      }

      const html = buildPdfHtml();
      await Print.printAsync({ html });
    } catch (error: any) {
      console.error('Print PECS PDF error:', error);
      Alert.alert('Print Failed', error?.message || 'Could not open the print dialog.');
    } finally {
      setExporting(false);
    }
  };

  const renderSelectedItem = ({ item, drag, isActive }: RenderItemParams<PrintableCard>) => {
    const imageSource = item.imageUrl
      ? { uri: item.imageUrl }
      : item.visualType && PECS_IMAGES[item.visualType]
        ? PECS_IMAGES[item.visualType]
        : null;

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={drag}
        delayLongPress={150}
        style={[styles.selectedCardRow, isActive && styles.selectedCardRowActive]}
      >
        <View style={styles.selectedCardLeft}>
          <View
            style={[
              styles.selectedThumbWrap,
              {
                backgroundColor: item.backgroundColor,
                borderColor: item.accentColor,
              },
            ]}
          >
            {imageSource ? (
              <Image
                source={imageSource}
                style={styles.selectedThumb}
                resizeMode={item.imageUrl ? 'cover' : 'contain'}
              />
            ) : (
              <Ionicons
                name={item.icon || 'chatbubble'}
                size={18}
                color={item.accentColor}
              />
            )}
          </View>

          <View style={styles.selectedCardTextWrap}>
            <Text style={styles.selectedCardLabel}>{item.label}</Text>
            <Text style={styles.selectedCardHelper}>{item.helperText}</Text>
          </View>
        </View>

        <View style={styles.selectedCardActions}>
          <Ionicons name="menu" size={20} color="#64748B" />
          <TouchableOpacity onPress={() => toggleCardSelection(item.id)}>
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!selectedChild && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="albums-outline" size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select a child profile first so custom PECS cards can be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>PECS Printables</Text>

          <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadData()}>
            <Ionicons name="refresh" size={20} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerSubtitle}>
          Build printable PECS sheets using both built-in and custom cards.
        </Text>

        <View style={styles.infoCard}>
          <Ionicons name="print-outline" size={18} color="#4F46E5" />
          <Text style={styles.infoText}>
            Choose a layout, select cards, reorder them, then print, share, or email a PECS card sheet.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Child Name (Optional)</Text>
          <TextInput
            value={childName}
            onChangeText={setChildName}
            placeholder="Enter child name"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Sheet Layout</Text>
          <View style={styles.layoutRow}>
            {(['2x2', '2x3', '3x3'] as LayoutOption[]).map((item) => {
              const active = layout === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.layoutChip, active && styles.layoutChipActive]}
                  onPress={() => {
                    setLayout(item);
                    setSelectedIds((prev) => prev.slice(0, getLayoutCardLimit(item)));
                  }}
                >
                  <Text style={[styles.layoutChipText, active && styles.layoutChipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helperText}>
            Current layout allows up to {cardLimit} cards.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Filter by Category</Text>
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.clearText}>Clear Selection</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
                <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Save Template</Text>
          <TextInput
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="Example: Morning Needs Board"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryWideBtn}
            onPress={() => void saveTemplate()}
            disabled={savingTemplate}
          >
            {savingTemplate ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryWideBtnText}>Save Template</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {savedTemplates.length > 0 ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Saved Templates</Text>

            {savedTemplates.map((template) => (
              <View key={template.id} style={styles.templateRow}>
                <TouchableOpacity
                  style={styles.templateMain}
                  onPress={() => applyTemplate(template)}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateMeta}>
                    {template.layout} • {(template.card_ids || []).length} cards
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => void deleteTemplate(template.id)}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>
            Selected Cards: {selectedIds.length} / {cardLimit}
          </Text>
          <Text style={styles.selectionText}>
            Tap cards below to add or remove them. Press and hold selected cards to drag and reorder.
          </Text>
        </View>

        {selectedCards.length > 0 ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Selected Order</Text>
            <DraggableFlatList
              data={selectedCards}
              keyExtractor={(item) => item.id}
              renderItem={renderSelectedItem}
              onDragEnd={({ data }) => setSelectedIds(data.map((item) => item.id))}
              scrollEnabled={false}
            />
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading cards...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredCards.map((card) => {
              const selected = selectedIds.includes(card.id);
              const imageSource = card.imageUrl
                ? { uri: card.imageUrl }
                : card.visualType && PECS_IMAGES[card.visualType]
                  ? PECS_IMAGES[card.visualType]
                  : null;

              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.card,
                    selected && styles.cardSelected,
                    { borderColor: selected ? card.accentColor : '#E2E8F0' },
                  ]}
                  onPress={() => toggleCardSelection(card.id)}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      styles.visualPanel,
                      {
                        backgroundColor: card.backgroundColor,
                        borderColor: card.accentColor,
                      },
                    ]}
                  >
                    {imageSource ? (
                      <Image
                        source={imageSource}
                        style={styles.cardImage}
                        resizeMode={card.imageUrl ? 'cover' : 'contain'}
                      />
                    ) : (
                      <View style={[styles.iconFallback, { borderColor: card.accentColor }]}>
                        <Ionicons
                          name={card.icon || 'chatbubble'}
                          size={28}
                          color={card.accentColor}
                        />
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardLabel}>{card.label}</Text>
                  <Text style={styles.cardHelper}>{card.helperText}</Text>

                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardTypeText, card.isCustom && styles.customText]}>
                      {card.isCustom ? 'Custom' : 'Built-in'}
                    </Text>

                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selected ? card.accentColor : '#94A3B8'}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Create Printable Sheet</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => void handlePrintPdf()}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#475569" />
              ) : (
                <>
                  <Ionicons name="print-outline" size={18} color="#475569" />
                  <Text style={styles.secondaryBtnText}>Print</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => void handleSharePdf()}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Share PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.emailBtn}
            onPress={() => void handleEmailPdf()}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={18} color="#4F46E5" />
                <Text style={styles.emailBtnText}>Email PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={18} color="#D97706" />
            <Text style={styles.tipTitle}>Level B printable tip</Text>
          </View>
          <Text style={styles.tipText}>
            Print on cardstock if possible, then laminate and cut the cards so they match the visuals used inside the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 18 },
  infoCard: { backgroundColor: '#EEF2FF', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoText: { marginLeft: 8, color: '#3730A3', fontWeight: '700', flex: 1, lineHeight: 20 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 12 },
  helperText: { marginTop: 8, color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  layoutRow: { flexDirection: 'row', gap: 10 },
  layoutChip: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  layoutChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  layoutChipText: { color: '#475569', fontWeight: '700' },
  layoutChipTextActive: { color: '#FFFFFF' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearText: { color: '#4F46E5', fontWeight: '800', fontSize: 13 },
  categoryRow: { paddingTop: 6 },
  categoryChip: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, marginRight: 10 },
  categoryChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  categoryChipText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  categoryChipTextActive: { color: '#FFFFFF' },
  primaryWideBtn: { backgroundColor: '#4F46E5', borderRadius: 16, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  primaryWideBtnText: { marginLeft: 8, color: '#FFFFFF', fontWeight: '800' },
  templateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, marginBottom: 10 },
  templateMain: { flex: 1, paddingRight: 12 },
  templateName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  templateMeta: { marginTop: 4, color: '#64748B', fontSize: 12, fontWeight: '600' },
  selectionCard: { backgroundColor: '#FFFBEB', borderRadius: 20, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  selectionTitle: { fontSize: 15, fontWeight: '800', color: '#92400E', marginBottom: 6 },
  selectionText: { color: '#B45309', lineHeight: 20, fontSize: 14 },
  selectedCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  selectedCardRowActive: { opacity: 0.9 },
  selectedCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  selectedThumbWrap: { width: 48, height: 48, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  selectedThumb: { width: '100%', height: '100%' },
  selectedCardTextWrap: { flex: 1, marginLeft: 10 },
  selectedCardLabel: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  selectedCardHelper: { marginTop: 4, fontSize: 12, color: '#64748B', fontWeight: '600' },
  selectedCardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingWrap: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748B', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 14, marginBottom: 14, borderWidth: 1 },
  cardSelected: { borderWidth: 2 },
  visualPanel: { height: 118, borderRadius: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  iconFallback: { width: '82%', height: '78%', borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFFAA', paddingHorizontal: 8 },
  cardLabel: { fontSize: 17, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  cardHelper: { marginTop: 6, fontSize: 12, lineHeight: 17, color: '#64748B', textAlign: 'center', fontWeight: '700' },
  cardFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTypeText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  customText: { color: '#10B981' },
  actionCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginTop: 4, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  secondaryBtn: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  secondaryBtnText: { marginLeft: 8, color: '#475569', fontWeight: '800' },
  primaryBtn: { flex: 1, backgroundColor: '#4F46E5', borderRadius: 16, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  primaryBtnText: { marginLeft: 8, color: '#FFFFFF', fontWeight: '800' },
  emailBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 16, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  emailBtnText: { marginLeft: 8, color: '#4F46E5', fontWeight: '800' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },
  tipCard: { backgroundColor: '#FFFBEB', borderRadius: 20, padding: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tipTitle: { marginLeft: 8, fontWeight: '800', color: '#92400E' },
  tipText: { color: '#B45309', lineHeight: 20, fontSize: 14 },
});