import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { useSession } from '../lib/session';
import { colors, noFocusRing, type } from '../lib/theme';

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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.wordmark}>dinner</Text>
        <Text style={styles.tagline}>One photo of your dinner, every day.</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          title={mode === 'login' ? 'Log in' : 'Sign up'}
          onPress={submit}
          busy={busy}
          disabled={!username || !password}
          style={{ marginTop: 4 }}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} hitSlop={8}>
          <Text style={type.small}>
            {mode === 'login' ? 'Don’t have an account? ' : 'Have an account? '}
            <Text style={{ color: colors.text, fontWeight: '600' }}>{mode === 'login' ? 'Sign up' : 'Log in'}</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  wordmark: { fontSize: 44, fontWeight: '700', letterSpacing: -2, color: colors.text, textAlign: 'center' },
  tagline: { ...type.small, fontSize: 15, textAlign: 'center', marginBottom: 28 },
  input: {
    ...noFocusRing,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.fill,
  },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  footer: { alignItems: 'center', paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
