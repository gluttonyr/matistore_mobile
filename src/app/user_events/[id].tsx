import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Calendar, MapPin, Users, Share2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Categorie } from '@/data_api/models/categorie.types';
import { Evenement } from '@/data_api/models/evenement.types';
import { getApiErrorMessage } from '@/data_api/lib/logger';
import { categorieService } from '@/data_api/services/categorieService';
import { evenementService } from '@/data_api/services/evenementService';
import { useFileUrl } from '@/hooks/useFileUrl';
import GreenButton from '@/components/ui/GreenButton';
import GlassCard from '@/components/ui/GlassCard';

function formatEventDate(dateDebut: string, dateFin: string): string {
  try {
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (start.toDateString() === end.toDateString()) return fmt(start);
    return `${fmt(start)} - ${fmt(end)}`;
  } catch {
    return '';
  }
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Evenement | null>(null);
  const [category, setCategory] = useState<Categorie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const heroUri = useFileUrl('events', event?.coverImage);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    evenementService
      .getById(id)
      .then((data) => {
        setEvent(data);
        if (data.categorieId) {
          categorieService.getById(data.categorieId).then(setCategory).catch(() => {});
        }
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

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
        <TouchableOpacity style={styles.backBtnInline} onPress={() => router.back()}>
          <Text style={styles.backBtnInlineText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {heroUri ? (
            <Image source={{ uri: heroUri }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: Colors.cardBg }]} />
          )}
          <LinearGradient colors={['transparent', Colors.darkBg]} style={styles.heroGrad} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft color={Colors.white} size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Share2 color={Colors.white} size={20} />
          </TouchableOpacity>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{category?.libelle ?? 'Sans catégorie'}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{event.titre}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <Calendar color={Colors.primaryGreen} size={18} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{formatEventDate(event.dateDebut, event.dateFin)}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <MapPin color={Colors.primaryGreen} size={18} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Lieu</Text>
                <Text style={styles.metaValue}>{event.lieu ?? 'Non précisé'}</Text>
              </View>
            </View>
          </View>

          <GlassCard style={styles.descCard}>
            <Text style={styles.descTitle}>À propos de cet événement</Text>
            <Text style={styles.descText}>{event.description}</Text>
          </GlassCard>

          <GlassCard style={styles.infoCard} glow>
            <View style={styles.infoRow}>
              <Users color={Colors.primaryGreen} size={20} />
              <Text style={styles.infoText}>Rejoignez la communauté MATI STORE</Text>
            </View>
            <View style={styles.infoDivider} />
            <Text style={styles.infoHighlight}>Places limitées — Inscrivez-vous maintenant !</Text>
          </GlassCard>

          <GreenButton
            title="Participer à l'événement"
            onPress={() => {}}
            size="lg"
            style={styles.ctaBtn}
          />
          <GreenButton
            title="Partager avec un ami"
            onPress={() => {}}
            size="lg"
            variant="outline"
            style={styles.shareOutlineBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  center: { flex: 1, backgroundColor: Colors.darkBg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  backBtnInline: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(125,255,42,0.1)', borderWidth: 1, borderColor: 'rgba(125,255,42,0.25)',
  },
  backBtnInlineText: { color: Colors.primaryGreen, fontWeight: '700' },
  heroContainer: { height: 320, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  backBtn: {
    position: 'absolute', top: 56, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    position: 'absolute', top: 56, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  catBadge: {
    position: 'absolute', bottom: 20, left: 20,
    backgroundColor: 'rgba(125,255,42,0.2)',
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(125,255,42,0.4)',
  },
  catText: { color: Colors.primaryGreen, fontSize: 12, fontWeight: '700' },
  content: { padding: 20, gap: 16 },
  title: { color: Colors.white, fontSize: 24, fontWeight: '900', lineHeight: 32, letterSpacing: 0.3 },
  metaRow: { flexDirection: 'row', gap: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(125,255,42,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  metaLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  metaValue: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  descCard: { gap: 10 },
  descTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  descText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  infoCard: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  infoDivider: { height: 1, backgroundColor: Colors.border },
  infoHighlight: { color: Colors.primaryGreen, fontSize: 14, fontWeight: '700' },
  ctaBtn: { width: '100%' },
  shareOutlineBtn: { width: '100%' },
});
