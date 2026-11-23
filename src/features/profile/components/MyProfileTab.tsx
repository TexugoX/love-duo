import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { Badge, Button, Card, Input } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCoupleData } from '@/features/couple/context/CoupleDataContext';
import { hashVaultPin, updateMyProfile } from '@/features/profile/services/profileService';

export function MyProfileTab() {
  const { profile, isPreviewMode, updateLocalProfile, signOut } = useAuth();
  const { artistHighlight } = useCoupleData();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [editingPin, setEditingPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setBiometricsSupported(false);
      return;
    }
    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ])
      .then(([hasHardware, isEnrolled]) => {
        setBiometricsSupported(hasHardware && isEnrolled);
      })
      .catch(() => setBiometricsSupported(false));
  }, []);

  const handleSaveName = async () => {
    if (!profile?.id) return;
    const trimmed = fullName.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', text: 'Informe o seu nome para salvar.' });
      return;
    }

    setFeedback(null);
    try {
      setSavingName(true);
      if (!isPreviewMode) {
        await updateMyProfile(profile.id, { full_name: trimmed });
      }
      updateLocalProfile({ full_name: trimmed });
      setFeedback({ type: 'success', text: 'Nome atualizado com sucesso!' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar perfil.',
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePin = async () => {
    if (!profile?.id) return;
    setFeedback(null);

    if (!/^\d{4}$/.test(pin)) {
      setFeedback({ type: 'error', text: 'O PIN do cofre precisa ter exatamente 4 números.' });
      return;
    }
    if (pin !== confirmPin) {
      setFeedback({ type: 'error', text: 'A confirmação do PIN não confere.' });
      return;
    }

    try {
      setSavingSecurity(true);
      const pinHash = await hashVaultPin(pin);
      if (!isPreviewMode) {
        await updateMyProfile(profile.id, { vault_pin_hash: pinHash });
      }
      updateLocalProfile({ vault_pin_hash: pinHash });
      setPin('');
      setConfirmPin('');
      setEditingPin(false);
      setFeedback({ type: 'success', text: 'PIN da aba secreta salvo com segurança!' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar PIN.',
      });
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleToggleBiometrics = async (nextValue: boolean) => {
    if (!profile?.id) return;
    setFeedback(null);

    if (nextValue && Platform.OS !== 'web' && !biometricsSupported && !isPreviewMode) {
      setFeedback({
        type: 'error',
        text: 'Biometria não configurada neste aparelho. Cadastre Face ID ou digital nas configurações do celular.',
      });
      return;
    }

    try {
      if (!isPreviewMode) {
        await updateMyProfile(profile.id, { biometrics_enabled: nextValue });
      }
      updateLocalProfile({ biometrics_enabled: nextValue });
      setFeedback({
        type: 'success',
        text: nextValue
          ? 'Biometria ativada para desbloquear o Cofre.'
          : 'Biometria desativada.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar biometria.',
      });
    }
  };

  const hasPin = Boolean(profile?.vault_pin_hash);

  return (
    <View style={styles.stack}>
      {feedback ? (
        <View
          style={[
            styles.feedbackBox,
            feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
          ]}>
          <Ionicons
            name={
              feedback.type === 'error'
                ? 'alert-circle-outline'
                : 'checkmark-circle-outline'
            }
            size={18}
            color={feedback.type === 'error' ? Palette.danger : Palette.success}
          />
          <Text
            style={[
              styles.feedbackText,
              { color: feedback.type === 'error' ? Palette.danger : Palette.success },
            ]}>
            {feedback.text}
          </Text>
        </View>
      ) : null}

      {/* Card principal de identificação */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Usuário'}</Text>
        <Badge label={`@${profile?.username ?? 'sem_usuario'}`} tone="primary" />
        <Text style={styles.email}>{profile?.email}</Text>

        <View style={styles.nameForm}>
          <Input
            label="Nome de exibição"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Como seu par te chama"
          />
          <Button
            title="Salvar nome"
            variant="secondary"
            size="sm"
            loading={savingName}
            disabled={fullName.trim() === (profile?.full_name ?? '').trim()}
            onPress={handleSaveName}
          />
        </View>
      </Card>

      {/* Destaque Artista #1 / Total de Shows */}
      <Card variant="accent" style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="musical-notes" size={20} color={Palette.primary} />
            <Text style={styles.cardTitle}>Artista #1 & Shows</Text>
          </View>
          <Badge label="Individual" tone="primary" />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Artista #1</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {artistHighlight.topArtist ?? '—'}
            </Text>
            <Text style={styles.statHint}>
              {artistHighlight.topArtist
                ? `${artistHighlight.topArtistShows} ${
                    artistHighlight.topArtistShows === 1 ? 'show visto' : 'shows vistos'
                  }`
                : 'Registre shows na aba Calendário'}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total de Shows</Text>
            <Text style={styles.statBigNumber}>{artistHighlight.totalShows}</Text>
            <Text style={styles.statHint}>no histórico</Text>
          </View>
        </View>
      </Card>

      {/* Segurança do Cofre (PIN / Biometria) */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="lock-closed-outline" size={20} color={Palette.primary} />
            <Text style={styles.cardTitle}>Cofre Secreto (PIN / Biometria)</Text>
          </View>
          <Badge
            label={hasPin ? 'PIN ativo' : 'Sem PIN'}
            tone={hasPin ? 'success' : 'neutral'}
          />
        </View>

        <Text style={styles.cardBody}>
          Protege o recado quente efêmero em Calendário → Sintonia do Ciclo.
        </Text>

        {editingPin ? (
          <View style={styles.pinForm}>
            <Input
              label="Novo PIN (4 dígitos)"
              placeholder="••••"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
            />
            <Input
              label="Confirmar PIN"
              placeholder="••••"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={confirmPin}
              onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, ''))}
            />
            <View style={styles.pinActions}>
              <Button
                title="Cancelar"
                variant="outline"
                size="sm"
                fullWidth={false}
                style={styles.flexOne}
                onPress={() => {
                  setEditingPin(false);
                  setPin('');
                  setConfirmPin('');
                }}
              />
              <Button
                title="Salvar PIN"
                size="sm"
                fullWidth={false}
                loading={savingSecurity}
                style={styles.flexOne}
                onPress={handleSavePin}
              />
            </View>
          </View>
        ) : (
          <Button
            title={hasPin ? 'Alterar PIN de 4 dígitos' : 'Configurar PIN de 4 dígitos'}
            variant="secondary"
            size="sm"
            onPress={() => setEditingPin(true)}
            icon={<Ionicons name="keypad-outline" size={16} color={Palette.primaryPressed} />}
          />
        )}

        <View style={styles.switchRow}>
          <View style={styles.flexOne}>
            <Text style={styles.switchTitle}>Usar Biometria (Face ID / Digital)</Text>
            <Text style={styles.switchSubtitle}>
              {Platform.OS === 'web'
                ? 'Disponível nos aplicativos Android e iOS.'
                : biometricsSupported
                  ? 'Biometria disponível neste aparelho.'
                  : 'Ative a biometria nas configurações do aparelho.'}
            </Text>
          </View>
          <Switch
            value={Boolean(profile?.biometrics_enabled)}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: Palette.borderStrong, true: Palette.primarySoft }}
            thumbColor={profile?.biometrics_enabled ? Palette.primary : '#FFFFFF'}
          />
        </View>
      </Card>

      <Button
        title={isPreviewMode ? 'Sair do modo preview' : 'Sair da conta'}
        variant="outline"
        onPress={signOut}
        icon={<Ionicons name="log-out-outline" size={18} color={Palette.text} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  feedbackError: {
    backgroundColor: Palette.dangerSoft,
  },
  feedbackSuccess: {
    backgroundColor: Palette.successSoft,
  },
  feedbackText: {
    ...Typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  profileCard: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceAccent,
    borderWidth: 2,
    borderColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.primaryPressed,
  },
  name: {
    ...Typography.h2,
    color: Palette.text,
  },
  email: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  nameForm: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  card: {
    gap: Spacing.sm,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  cardBody: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  statBox: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 2,
  },
  statLabel: {
    ...Typography.label,
    color: Palette.textMuted,
  },
  statValue: {
    ...Typography.h3,
    color: Palette.primaryPressed,
    marginTop: 2,
  },
  statBigNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.primaryPressed,
  },
  statHint: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  pinForm: {
    gap: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  pinActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  flexOne: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  switchTitle: {
    ...Typography.bodyMedium,
    color: Palette.text,
  },
  switchSubtitle: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
});
