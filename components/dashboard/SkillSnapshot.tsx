import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function SkillSnapshot() {
  const screenWidth = Dimensions.get("window").width;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Skill Snapshot (Last 5 Sessions)</Text>
      <LineChart
        data={{
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          datasets: [
            {
              data: [2, 5, 4, 8, 11], // Mock data for now
              color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
              strokeWidth: 3
            }
          ],
          legend: ["Independent Success"]
        }}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: { r: "5", strokeWidth: "2", stroke: "#4F46E5" }
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, alignItems: 'center' },
  header: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, alignSelf: 'flex-start', paddingLeft: 20 },
  chart: { marginVertical: 8, borderRadius: 16 }
});
