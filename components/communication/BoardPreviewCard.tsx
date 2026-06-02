import React from 'react';

import { Image, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

type Props = {

  item: any;

  drag: () => void;

  isActive: boolean;

  onRemove: (id: string) => void;

  getCardImageSource: (card: any) => any;

};

export default function BoardPreviewCard({

  item,

  drag,

  isActive,

  onRemove,

  getCardImageSource,

}: Props) {

  const imageSource = getCardImageSource(item);

  return (

    <TouchableOpacity

      activeOpacity={0.95}

      onLongPress={drag}

      delayLongPress={150}

      style={[

        styles.card,

        isActive && { opacity: 0.9 },

      ]}

    >

      <View style={styles.row}>

        <View style={styles.left}>

          <View

            style={[

              styles.thumb,

              {

                backgroundColor: item.backgroundColor,

                borderColor: item.accentColor,

              },

            ]}

          >

            {imageSource ? (

              <Image

                source={imageSource}

                style={styles.image}

                resizeMode="contain"

              />

            ) : (

              <Ionicons

                name={item.icon || 'chatbubble'}

                size={22}

                color={item.accentColor}

              />

            )}

          </View>

          <View style={{ flex: 1 }}>

            <Text style={styles.label}>{item.label}</Text>

            <Text style={styles.helper}>{item.helperText}</Text>

          </View>

        </View>

        <View style={styles.actions}>

          <TouchableOpacity onLongPress={drag}>

            <Ionicons name="menu" size={18} color="#64748B" />

          </TouchableOpacity>

          <TouchableOpacity onPress={() => onRemove(item.boardCardId)}>

            <Ionicons name="trash-outline" size={16} color="#B91C1C" />

          </TouchableOpacity>

        </View>

      </View>

    </TouchableOpacity>

  );

}

const styles = {

  card: {

    backgroundColor: '#F8FAFC',

    borderRadius: 16,

    padding: 12,

    marginBottom: 10,

    borderWidth: 1,

    borderColor: '#E2E8F0',

  },

  row: {

    flexDirection: 'row' as const,

    justifyContent: 'space-between' as const,

    alignItems: 'center' as const,

  },

  left: {

    flexDirection: 'row' as const,

    alignItems: 'center' as const,

    flex: 1,

  },

  thumb: {

    width: 54,

    height: 54,

    borderRadius: 14,

    borderWidth: 2,

    marginRight: 10,

    alignItems: 'center' as const,

    justifyContent: 'center' as const,

    overflow: 'hidden' as const,

  },

 image: {
  width: '100%' as const,
  height: '100%' as const,
  },

  label: {

    fontSize: 14,

    fontWeight: '800' as const,

    color: '#0F172A',

  },

  helper: {

    fontSize: 12,

    color: '#64748B',

    marginTop: 2,

  },

  actions: {

    flexDirection: 'row' as const,

    gap: 12,

  },

};