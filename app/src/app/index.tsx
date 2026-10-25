import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import Stack from 'expo-router/stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ApiError, imageUri, request, type Post } from '../lib/api';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

type Me = { today: string; todaysPost: Post | null };
type Feed = { posts: Post[]; nextCursor: number | null };

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function FeedScreen() {
  const router = useRouter();
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
    confirm('Delete this photo?', 'If it was today’s dinner you can share another one.', async () => {
      try {
        await request(`/posts/${post.id}`, { method: 'DELETE', token });
        load();
      } catch (e) {
        handleError(e);
      }
    });
  }

  const header = (
    <View style={styles.todayCard}>
      {me === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : me.todaysPost ? (
        <>
          <Text style={styles.todayTitle}>You’ve shared today’s dinner ✅</Text>
          <Text style={styles.todayText}>Come back tomorrow for your next one.</Text>
        </>
      ) : (
        <>
          <Text style={styles.todayTitle}>What’s for dinner tonight?</Text>
          <Text style={styles.todayText}>You get one photo a day — make it count.</Text>
          <Pressable style={styles.button} onPress={() => router.push('/post')}>
            <Text style={styles.buttonText}>📸 Share today’s dinner</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={8}>
              <Text style={styles.headerLink}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={
          me ? <Text style={styles.empty}>No dinners yet. Be the first to share one!</Text> : undefined
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.meta}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Image source={{ uri: imageUri(item) }} style={styles.photo} contentFit="cover" transition={200} />
            {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}
            {item.userId === session!.user.id && (
              <Pressable onPress={() => deletePost(item)} hitSlop={8}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 16 },
  headerLink: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  todayCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  todayText: { fontSize: 15, color: colors.muted },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 32 },
  card: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  username: { fontWeight: '700', fontSize: 15, color: colors.text },
  meta: { color: colors.muted, fontSize: 13 },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  caption: { padding: 12, fontSize: 15, color: colors.text },
  delete: { color: colors.danger, paddingHorizontal: 12, paddingBottom: 12, fontWeight: '600' },
});
