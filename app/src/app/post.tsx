import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { request } from '../lib/api';
import { useSession } from '../lib/session';
import { colors, fonts, shadow, type } from '../lib/theme';

const MAX_CAPTION = 280;
const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};
const canUseCamera = Platform.OS !== 'web';

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

export default function PostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 18 : insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close" style={styles.close}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={[type.title, { fontSize: 22 }]}>
          Tonight’s <Text style={{ fontFamily: fonts.displayItalic, color: colors.accent }}>plate</Text>
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {asset ? (
          <View style={[styles.frame, shadow]}>
            <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <Pressable style={styles.retake} onPress={() => choose('library')} disabled={busy}>
              <Ionicons name="images-outline" size={16} color={colors.ink} />
              <Text style={styles.retakeText}>Choose another</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.frame, styles.frameEmpty]}>
            <Corner style={{ top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3 }} />
            <Corner style={{ bottom: 18, left: 18, borderBottomWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ bottom: 18, right: 18, borderBottomWidth: 3, borderRightWidth: 3 }} />
            <Text style={{ fontSize: 54 }}>🍲</Text>
            <Text style={[type.caption, { color: colors.inkSoft, textAlign: 'center' }]}>
              Plate it up, then{'\n'}snap it from above.
            </Text>
            <View style={styles.sourceRow}>
              {canUseCamera && (
                <Pressable style={styles.shutter} onPress={() => choose('camera')} accessibilityLabel="Take photo">
                  <Ionicons name="camera" size={28} color={colors.onAccent} />
                </Pressable>
              )}
              <Pressable
                style={[styles.libraryButton, !canUseCamera && styles.libraryButtonWide]}
                onPress={() => choose('library')}
                accessibilityLabel="Choose from library"
              >
                <Ionicons name="images-outline" size={22} color={colors.ink} />
                {!canUseCamera && <Text style={styles.retakeText}>Choose a photo</Text>}
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.captionBox}>
          <TextInput
            style={styles.captionInput}
            placeholder="What’s cooking? (optional)"
            placeholderTextColor={colors.faint}
            value={caption}
            onChangeText={setCaption}
            maxLength={MAX_CAPTION}
            multiline
          />
          <Text style={styles.counter}>
            {caption.length}/{MAX_CAPTION}
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Share to the table" icon="arrow-up" onPress={share} busy={busy} disabled={!asset} />
        <Text style={[type.muted, { textAlign: 'center', fontSize: 13 }]}>One dinner a night. You can’t post again until tomorrow.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16 },
  frame: { width: '100%', aspectRatio: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.line },
  frameEmpty: { alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: colors.accent, borderRadius: 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 10 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.accentSoft,
  },
  libraryButton: {
    height: 52,
    minWidth: 52,
    borderRadius: 26,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  libraryButtonWide: { paddingHorizontal: 22 },
  retake: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(251,244,234,0.92)',
  },
  retakeText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  captionBox: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16 },
  captionInput: {
    fontFamily: fonts.serifItalic,
    fontSize: 19,
    lineHeight: 26,
    color: colors.ink,
    minHeight: 60,
    textAlignVertical: 'top',
    padding: 0,
  },
  counter: { fontFamily: fonts.medium, fontSize: 12, color: colors.faint, textAlign: 'right', marginTop: 6 },
  error: { fontFamily: fonts.medium, color: colors.danger, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
