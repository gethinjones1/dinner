import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { request } from '../lib/api';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

const MAX_CAPTION = 280;
const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

export default function PostScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(source: 'camera' | 'library') {
    setError(null);
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return setError('Camera access is needed to take a photo.');
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (!result.canceled) setAsset(result.assets[0]);
  }

  async function share() {
    if (!asset) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    if (Platform.OS === 'web' && asset.file) {
      form.append('photo', asset.file);
    } else {
      // React Native's FormData accepts a { uri, name, type } descriptor for files.
      form.append('photo', {
        uri: asset.uri,
        name: asset.fileName ?? 'dinner.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    }
    form.append('caption', caption.trim());
    try {
      await request('/posts', { method: 'POST', token: session!.token, body: form });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {asset ? (
        <Image source={{ uri: asset.uri }} style={styles.preview} contentFit="cover" />
      ) : (
        <View style={[styles.preview, styles.placeholder]}>
          <Text style={styles.placeholderEmoji}>🍝</Text>
          <Text style={styles.placeholderText}>Pick one photo of today’s dinner</Text>
        </View>
      )}

      <View style={styles.row}>
        {Platform.OS !== 'web' && (
          <Pressable style={styles.secondary} onPress={() => choose('camera')} disabled={busy}>
            <Text style={styles.secondaryText}>Take photo</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondary} onPress={() => choose('library')} disabled={busy}>
          <Text style={styles.secondaryText}>{asset ? 'Choose another' : 'Choose from library'}</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Add a caption (optional)"
        value={caption}
        onChangeText={setCaption}
        maxLength={MAX_CAPTION}
        multiline
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, (!asset || busy) && { opacity: 0.5 }]} onPress={share} disabled={!asset || busy}>
        {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Share</Text>}
      </Pressable>
      <Text style={styles.note}>You can share one dinner photo per day.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: colors.border },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderEmoji: { fontSize: 56 },
  placeholderText: { color: colors.muted, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.text,
  },
  error: { color: colors.danger },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  note: { color: colors.muted, textAlign: 'center', fontSize: 13 },
});
