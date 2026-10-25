import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ApiError, imageUri, request, type Post } from '../lib/api';
import { useSession } from '../lib/session';
import { colors, type } from '../lib/theme';

type Me = { today: string; todaysPost: Post | null; streak: number; sharedToday: number };
type Feed = { posts: Post[]; nextCursor: number | null };

// Parse YYYY-MM-DD as a local calendar date (not UTC midnight).
const parseDay = (day: string) => new Date(`${day}T12:00:00`);

function dayLabel(day: string, today: string) {
  const diff = Math.round((parseDay(today).getTime() - parseDay(day).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return parseDay(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useSession();
  const token = session!.token;
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) signOut();
      else setError(e instanceof Error ? e.message : String(e));
    },
    [signOut],
  );

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [meRes, feed] = await Promise.all([request<Me>('/me', { token }), request<Feed>('/posts', { token })]);
      setMe(meRes);
      setPosts(feed.posts);
      setCursor(feed.nextCursor);
      setError(null);
    } catch (e) {
      handleError(e);
    } finally {
      setRefreshing(false);
    }
  }, [token, handleError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function loadMore() {
    if (cursor === null || refreshing) return;
    try {
      const feed = await request<Feed>(`/posts?before=${cursor}`, { token });
      setPosts((prev) => [...prev, ...feed.posts]);
      setCursor(feed.nextCursor);
    } catch (e) {
      handleError(e);
    }
  }

  function deletePost(post: Post) {
    confirm('Delete post?', 'If it’s today’s post you can share another one.', 'Delete', async () => {
      try {
        await request(`/posts/${post.id}`, { method: 'DELETE', token });
        load();
      } catch (e) {
        handleError(e);
      }
    });
  }

  const sections = useMemo(() => {
    if (!me) return [];
    const groups = new Map<string, Post[]>();
    for (const p of posts) groups.set(p.day, [...(groups.get(p.day) ?? []), p]);
    return [...groups].map(([day, data]) => ({ day, title: dayLabel(day, me.today), data }));
  }, [posts, me]);

  const posted = !!me?.todaysPost;
  const streak = me && me.streak > 1 ? ` · ${me.streak}-day streak` : '';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={type.wordmark}>dinner</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/post')}
            disabled={!me || posted}
            hitSlop={8}
            accessibilityLabel="New post"
            style={{ opacity: !me || posted ? 0.25 : 1 }}
          >
            <Ionicons name="add-circle-outline" size={28} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityLabel="Account"
            hitSlop={8}
            onPress={() => confirm(session!.user.username, 'Log out of Dinner?', 'Log out', signOut)}
          >
            <Avatar name={session!.user.username} size={28} />
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(p) => String(p.id)}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            {me && !posted && (
              <View style={styles.prompt}>
                <View style={{ flex: 1 }}>
                  <Text style={type.bold}>Share today’s dinner</Text>
                  <Text style={type.small}>One photo a day{streak}</Text>
                </View>
                <Button title="Share" size="small" onPress={() => router.push('/post')} />
              </View>
            )}
            {me && posted && (
              <View style={styles.done}>
                <Ionicons name="checkmark-circle" size={16} color={colors.text} />
                <Text style={type.small}>You’ve shared today{streak}</Text>
              </View>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
          </>
        }
        ListEmptyComponent={
          me ? (
            <View style={styles.empty}>
              <Text style={type.title}>No posts yet</Text>
              <Text style={[type.small, { textAlign: 'center' }]}>When people share their dinner, it’ll show up here.</Text>
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <View style={styles.postHeader}>
              <Avatar name={item.username} size={32} />
              <Text style={[type.bold, { flex: 1, fontSize: 14 }]}>{item.username}</Text>
              {item.userId === session!.user.id && (
                <Pressable onPress={() => deletePost(item)} hitSlop={10} accessibilityLabel="Post options">
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
                </Pressable>
              )}
            </View>
            <Image source={{ uri: imageUri(item) }} style={styles.photo} contentFit="cover" transition={150} />
            <View style={styles.postBody}>
              {!!item.caption && (
                <Text style={type.body}>
                  <Text style={type.bold}>{item.username}</Text> {item.caption}
                </Text>
              )}
              <Text style={[type.small, { fontSize: 12 }]}>{timeOf(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14 },
  error: { color: colors.danger, fontSize: 13, padding: 16, textAlign: 'center' },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: colors.secondary, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  post: { marginBottom: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.fill },
  postBody: { paddingHorizontal: 16, paddingTop: 10, gap: 4 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 64, paddingHorizontal: 32 },
});
