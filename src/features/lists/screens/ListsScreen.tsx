import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ScreenContainer, SegmentedTabs } from '@/components/ui';
import { Palette, Spacing, Typography } from '@/constants/theme';

type ListsSubTab = 'expenses' | 'pantry' | 'shopping' | 'renovation';

const LIST_CONTENT: Record<
  ListsSubTab,
  { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }
> = {
  expenses: {
    icon: 'wallet-outline',
    title: 'Despesas do Casal',
    description:
      'Registre gastos compartilhados, informe quem pagou e acompanhe o saldo mensal simples (“quem deve a quem”).',
  },
  pantry: {
    icon: 'cube-outline',
    title: 'Despensa',
    description:
      'Controle o estoque doméstico atual com botão rápido “Acabou → Enviar para Lista de Compra”.',
  },
  shopping: {
    icon: 'cart-outline',
    title: 'Lista de Compra',
    description:
      'Itens do dia a dia e mercado sincronizados em tempo real para marcar durante as compras.',
  },
  renovation: {
    icon: 'hammer-outline',
    title: 'Modo Obra',
    description:
      'Crie cômodos personalizados (Cozinha, Quarto, Banheiro) com status (A cotar, Comprar, Prioridade, Comprado) e envio direto para Despesas.',
  },
};

export function ListsScreen() {
  const [subTab, setSubTab] = useState<ListsSubTab>('expenses');
  const current = LIST_CONTENT[subTab];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Listas</Text>
        <Text style={styles.subtitle}>Finanças, despensa, mercado e planos de reforma.</Text>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs
          scrollable
          value={subTab}
          onChange={setSubTab}
          options={[
            { key: 'expenses', label: 'Despesas' },
            { key: 'pantry', label: 'Despensa' },
            { key: 'shopping', label: 'Compras' },
            { key: 'renovation', label: 'Modo Obra' },
          ]}
        />
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={current.icon} size={20} color={Palette.primary} />
          <Text style={styles.cardTitle}>{current.title}</Text>
        </View>
        <Text style={styles.cardBody}>{current.description}</Text>
        <Badge label="Esquema SQL + RLS configurados" tone="primary" />
      </Card>
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
