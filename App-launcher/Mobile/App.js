import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const TARGET_URL = 'https://digaspi.vercel.app/'; // URL exata do Vercel

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#09090b" />
      <WebView 
        source={{ uri: TARGET_URL }} 
        style={styles.webview}
        pullToRefreshEnabled={true}
        bounces={false}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Compensa a status bar no Android
  },
  webview: {
    flex: 1,
    backgroundColor: '#09090b',
  },
});
