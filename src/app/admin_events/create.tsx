import { router } from 'expo-router';
import { Alert } from 'react-native';

import { evenementService } from '@/data_api/services/evenementService';
import EventForm, { EventFormValues } from './eventForm';

export default function CreateEventScreen() {
  const handleSubmit = async (values: EventFormValues, file?: { uri: string; name: string; type: string }) => {
    try {
      await evenementService.create(values, file);
      router.back();
    } catch (error) {
      Alert.alert('Erreur', "Impossible de créer l'événement. Réessayez.");
      throw error;
    }
  };

  return (
    <EventForm
      mode="create"
      onSubmit={handleSubmit}
      onBack={() => router.back()}
    />
  );
}
