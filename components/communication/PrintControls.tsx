import React from 'react';

import { Text, TouchableOpacity, View } from 'react-native';


type Props = {

  printGridSize: '2x2' | '3x3' | '4x4';

  setPrintGridSize: (size: '2x2' | '3x3' | '4x4') => void;

  selectedPrintCardIds: string[];

  clearPrintSelection: () => void;

};

export default function PrintControls({

  printGridSize,

  setPrintGridSize,

  selectedPrintCardIds,

  clearPrintSelection,

}: Props) {

  return (

    <View style={styles.printControlsCard}>

      <Text style={styles.printControlsTitle}>Print Options</Text>

      <View style={styles.printGridRow}>

        {(['2x2', '3x3', '4x4'] as const).map((size) => (

          <TouchableOpacity

            key={size}

            style={[

              styles.printGridChip,

              printGridSize === size && styles.printGridChipActive,

            ]}

            onPress={() => setPrintGridSize(size)}

          >

            <Text

              style={[

                styles.printGridChipText,

                printGridSize === size && styles.printGridChipTextActive,

              ]}

            >

              {size}

            </Text>

          </TouchableOpacity>

        ))}

      </View>

      <Text style={styles.printSelectionText}>

        {selectedPrintCardIds.length > 0

          ? `${selectedPrintCardIds.length} selected for print`

          : 'No cards selected — printing all visible cards'}

      </Text>

      {selectedPrintCardIds.length > 0 && (

        <TouchableOpacity onPress={clearPrintSelection}>

          <Text style={styles.clearPrintSelectionText}>

            Clear selection

          </Text>

        </TouchableOpacity>

      )}

    </View>

  );

}

const styles = {

  printControlsCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 20,

    padding: 16,

    marginBottom: 14,

    borderWidth: 1,

    borderColor: '#E2E8F0',

  },

  printControlsTitle: {

    fontSize: 15,

    fontWeight: '800' as const,

    color: '#0F172A',

    marginBottom: 10,

  },

  printGridRow: {

    flexDirection: 'row' as const,

    gap: 8,

    marginBottom: 10,

  },

  printGridChip: {

    flex: 1,

    borderRadius: 14,

    paddingVertical: 10,

    alignItems: 'center' as const,

    backgroundColor: '#F8FAFC',

    borderWidth: 1,

    borderColor: '#CBD5E1',

  },

  printGridChipActive: {

    backgroundColor: '#4F46E5',

    borderColor: '#4F46E5',

  },

  printGridChipText: {

    fontWeight: '800' as const,

    color: '#475569',

  },

  printGridChipTextActive: {

    color: '#FFFFFF',

  },

  printSelectionText: {

    fontSize: 12,

    color: '#64748B',

    fontWeight: '600' as const,

  },

  clearPrintSelectionText: {

    marginTop: 8,

    color: '#DC2626',

    fontWeight: '800' as const,

    fontSize: 13,

  },

};