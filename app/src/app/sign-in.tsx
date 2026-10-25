import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { useSession } from '../lib/session';
import { colors, fonts } from '../lib/theme';

const PLATES = [
  { emoji: '🍝', rotate: '-8deg', top: 18, left: '6%' },
  { emoji: '🍣', rotate: '5deg', top: 0, left: '36%' },
  { emoji: '🥘', rotate: '-3deg', top: 26, left: '64%' },
] as const;

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(mode, username.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#5A2614', '#2A1A12', colors.ink]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.plates}>
            {PLATES.map((p) => (
              <View key={p.emoji} style={[styles.polaroid, { top: p.top, left: p.left, transform: [{ rotate: p.rotate }] }]}>
                <View style={styles.polaroidPhoto}>
                  <Text style={styles.plateEmoji}>{p.emoji}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.wordmark}>
            dinner<Text style={{ color: colors.accent }}>.</Text>
          </Text>
          <Text style={styles.tagline}>One plate a night, shared with everyone at the table.</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="rgba(251,244,234,0.45)"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(251,244,234,0.45)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button
              title={mode === 'login' ? 'Sign in' : 'Pull up a chair'}
              onPress={submit}
              busy={busy}
              style={{ marginTop: 6 }}
            />
            <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} hitSlop={8}>
              <Text style={styles.switch}>
                {mode === 'login' ? 'New here? ' : 'Already have an account? '}
                <Text style={styles.switchLink}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 },
  plates: { height: 150, marginBottom: 28 },
  polaroid: {
    position: 'absolute',
    width: '30%',
    padding: 7,
    paddingBottom: 20,
    backgroundColor: colors.cream,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  polaroidPhoto: {
    aspectRatio: 1,
    borderRadius: 3,
    backgroundColor: '#EBD9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateEmoji: { fontSize: 40 },
  wordmark: { fontFamily: fonts.display, fontSize: 64, lineHeight: 70, color: colors.cream, letterSpacing: -2 },
  tagline: {
    fontFamily: fonts.serifItalic,
    fontSize: 19,
    lineHeight: 26,
    color: 'rgba(251,244,234,0.75)',
    marginTop: 4,
    marginBottom: 36,
  },
  form: { gap: 12 },
  input: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.cream,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  error: { fontFamily: fonts.medium, color: '#FF9C7F', textAlign: 'center' },
  switch: { fontFamily: fonts.body, color: 'rgba(251,244,234,0.6)', textAlign: 'center', marginTop: 10, fontSize: 14 },
  switchLink: { fontFamily: fonts.semibold, color: colors.cream },
});
