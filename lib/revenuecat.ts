import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

// Use the verified iOS Public SDK Key
const REVENUECAT_API_KEY = 'appl_oYFGztbuDzENRwfGfnSqRFISsLd';

export const initRevenueCat = async () => {
  if (Platform.OS === 'ios') {
    try {
      // Initialize the SDK
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      
      // Enable debug logs to confirm connection in the terminal
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      
      console.log("✅ RevenueCat: SDK configured successfully.");
    } catch (error) {
      console.error("❌ RevenueCat: Configuration failed:", error);
    }
  } else {
    console.log("⚠️ RevenueCat: Platform not supported in this config.");
  }
};
