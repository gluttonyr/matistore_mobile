import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Evenement } from '@/data_api/models/evenement.types';
import { evenementService } from '@/data_api/services/evenementService';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import EventForm, { EventFormValues } from './eventForm';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Evenement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    evenementService
      .getById(id)
      .then(setEvent)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: EventFormValues, file?: { uri: string; name: string; type: string }) => {
    if (!id) return;
    try {
      await evenementService.update(id, values, file);
      router.back();
    } catch (err) {
      Alert.alert('Erreur', "Impossible de modifier l'événement. Réessayez.");
      throw err;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primaryGreen} size="large" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Événement introuvable.'}</Text>
      </View>
    );
  }

  return (
    <EventForm
      mode="edit"
      initialValues={{
        titre: event.titre,
        description: event.description,
        dateDebut: event.dateDebut,
        dateFin: event.dateFin,
        lieu: event.lieu,
        categorieId: event.categorieId,
        coverImage: event.coverImage,
      }}
      onSubmit={handleSubmit}
      onBack={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.darkBg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
});
