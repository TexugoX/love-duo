import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ScreenContainer, SegmentedTabs } from '@/components/ui';
import { Palette, Spacing, Typography } from '@/constants/theme';

type CalendarSubTab = 'events_shows' | 'agenda' | 'cycle';

export function CalendarScreen() {
  const [subTab, setSubTab] = useState<CalendarSubTab>('events_shows');

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Calendário</Text>
        <Text style={styles.subtitle}>Datas especiais, shows, agenda e sintonia do ciclo.</Text>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs
          value={subTab}
          onChange={setSubTab}
          options={[
            { key: 'events_shows', label: 'Eventos & Shows' },
            { key: 'agenda', label: 'Calendário' },
            { key: 'cycle', label: 'Sintonia' },
          ]}
        />
      </View>

      {subTab === 'events_shows' ? (
        <View style={styles.stack}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="hourglass-outline" size={20} color={Palette.primary} />
              <Text style={styles.cardTitle}>Próximos Eventos & Contagem Regressiva</Text>
            </View>
            <Text style={styles.cardBody}>
              Lista cronológica dos próximos compromissos e contagem regressiva para datas
              especiais.
            </Text>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="musical-notes-outline" size={20} color={Palette.primary} />
              <Text style={styles.cardTitle}>Memórias, Shows Visitados & Ranking</Text>
            </View>
            <Text style={styles.cardBody}>
              Galeria de memórias com fotos e ranking automático de artistas mais vistos (visão
              Individual e do Casal).
            </Text>
          </Card>
        </View>
      ) : subTab === 'agenda' ? (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={Palette.primary} />
            <Text style={styles.cardTitle}>Agenda Compartilhada</Text>
          </View>
          <Text style={styles.cardBody}>
            Crie eventos por categoria (Show/Festival, Festa/Aniversário, Escola do filho,
            Encontro a dois, Viagem, Compromisso/Saúde ou Personalizado). Shows passados alimentam
            o ranking automaticamente.
          </Text>
          <Badge label="7 categorias prontas no banco" tone="primary" />
        </Card>
      ) : (
        <View style={styles.stack}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flower-outline" size={20} color={Palette.primary} />
              <Text style={styles.cardTitle}>Sintonia do Ciclo</Text>
            </View>
            <Text style={styles.cardBody}>
              Fases do ciclo, intimidade, cuidados e pedidos para o próximo encontro a dois.
            </Text>
          </Card>

          <Card variant="subtle" style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="lock-closed-outline" size={20} color={Palette.primaryPressed} />
              <Text style={styles.cardTitle}>Cofre Protegido (PIN / Biometria)</Text>
            </View>
            <Text style={styles.cardBody}>
              Recado quente efêmero: abre apenas após PIN/biometria e é excluído definitivamente
              do banco ao fechar/sair da tela de leitura.
            </Text>
            <Badge label="Autoexclusão garantida via RPC" tone="warning" />
          </Card>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Palette.text,
  },
  subtitle: {
    ...Typography.body,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  tabsWrap: {
    marginBottom: Spacing.lg,
  },
  stack: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  cardBody: {
    ...Typography.body,
    color: Palette.textSecondary,
  },
});
