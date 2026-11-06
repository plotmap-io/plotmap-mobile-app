import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert as RNAlert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { StackScreen } from '@/components/stack-screen';
import { Empty, ErrorState, Loading } from '@/components/states';
import { createAlert, deleteAlert, listAlerts, runAlert, type Alert } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { color } from '@/theme/tokens';
import { STATUS_LABEL, statusesFor } from '@/types/api';

/** Saved searches. "Save this search" captures the filters you are holding. */
export default function AlertsScreen() {
  const { signedIn, loading: authLoading } = useAuth();
  const { filters } = useFilters();
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return setLoading(false);
    setLoading(true);
    try {
      const r = await listAlerts();
      setRows(r?.alerts ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load alerts');
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const saveCurrent = useCallback(async () => {
    const area = filters.place;
    const name = `${STATUS_LABEL[filters.status]}${area ? ` · ${area.label}` : ''}`;
    try {
      await createAlert({
        name,
        frequency: 'daily',
        query: {
          status: statusesFor(filters.status),
          ...(filters.propertyType ? { propertyType: [filters.propertyType] } : {}),
          ...(filters.minPrice != null ? { minPrice: filters.minPrice } : {}),
          ...(filters.maxPrice != null ? { maxPrice: filters.maxPrice } : {}),
          ...(area
            ? {
                boundsSW: {
                  latitude: area.latitude - area.latitudeDelta / 2,
                  longitude: area.longitude - area.longitudeDelta / 2,
                },
                boundsNE: {
                  latitude: area.latitude + area.latitudeDelta / 2,
                  longitude: area.longitude + area.longitudeDelta / 2,
                },
              }
            : {}),
        },
      });
      load();
    } catch (e) {
      RNAlert.alert('Not saved', e instanceof Error ? e.message : 'Try again.');
    }
  }, [filters, load]);

  const remove = (id: string) =>
    RNAlert.alert('Delete this alert?', 'You will stop being told about new matches.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteAlert(id).then(load).catch(() => {}),
      },
    ]);

  return (
    <StackScreen
      title="Alerts"
      action={
        signedIn ? (
          <Pressable onPress={saveCurrent} hitSlop={8} accessibilityLabel="Save this search">
            <Feather name="plus" size={21} color={color.accent} />
          </Pressable>
        ) : null
      }>
      {!signedIn && !authLoading ? (
        <SignInPrompt message="Sign in to save searches and be told about new matches." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {rows.length === 0 ? (
            <Empty
              icon="bell"
              message={'No saved searches yet.\nTap + to save the search you have open.'}
            />
          ) : (
            <Card>
              {rows.map((a, i) => (
                <View key={a.id} style={[styles.row, i > 0 && styles.divided]}>
                  <View style={styles.icon}>
                    <Feather name="bell" size={15} color={color.accent} />
                  </View>
                  <View style={styles.text}>
                    <Text style={styles.primary}>{a.name ?? a.label ?? 'Saved search'}</Text>
                    <Text style={styles.secondary}>{a.frequency ?? 'daily'}</Text>
                  </View>
                  <Pressable onPress={() => runAlert(a.id).catch(() => {})} hitSlop={8}>
                    <Feather name="play" size={16} color={color.muted} />
                  </Pressable>
                  <Pressable onPress={() => remove(a.id)} hitSlop={8}>
                    <Feather name="trash-2" size={16} color={color.shiraz} />
                  </Pressable>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hair },
  icon: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: color.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  primary: { fontSize: 14, fontWeight: '600', color: color.ink },
  secondary: { fontSize: 12, color: color.muted, textTransform: 'capitalize' },
});
