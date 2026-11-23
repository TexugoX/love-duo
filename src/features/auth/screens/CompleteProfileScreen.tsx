import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, ScreenContainer } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  checkUsernameAvailability,
  completeUserProfile,
  normalizeUsername,
  validateUsernameFormat,
} from '@/features/auth/services/authService';

export function CompleteProfileScreen() {
  const { profile, session, refreshUserData, signOut } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    'idle'
  );
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.full_name && !fullName) {
      setFullName(profile.full_name);
    }
  }, [fullName, profile?.full_name]);

  useEffect(() => {
    const clean = normalizeUsername(username);
    if (!clean) {
      setStatus('idle');
      setUsernameError(null);
      return;
    }

    const formatErr = validateUsernameFormat(clean);
    if (formatErr) {
      setStatus('invalid');
      setUsernameError(formatErr);
      return;
    }

    setUsernameError(null);
    let cancelled = false;
    setStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(clean);
        if (cancelled) return;
        setStatus(available ? 'available' : 'taken');
        setUsernameError(available ? null : `O usuário @${clean} já está em uso.`);
      } catch {
        if (!cancelled) setStatus('idle');
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const handleSave = async () => {
    setSubmitError(null);
    const userId = session?.user?.id ?? profile?.id;
    if (!userId) return;

    if (!fullName.trim()) {
      setSubmitError('Informe como você gostaria de aparecer no app.');
      return;
    }

    const formatErr = validateUsernameFormat(username);
    if (formatErr) {
      setSubmitError(formatErr);
      return;
    }

    try {
      setSaving(true);
      await completeUserProfile({
        userId,
        fullName,
        username,
      });
      await refreshUserData();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível salvar seu @usuario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.hero}>
        <View style={styles.iconBadge}>
          <Ionicons name="at" size={28} color={Palette.primary} />
        </View>
        <Text style={styles.title}>Escolha seu @usuario</Text>
        <Text style={styles.subtitle}>
          Como este é seu primeiro acesso com o Google, defina um @usuario único para conectar
          com seu par.
        </Text>
      </View>

      <Card style={styles.card}>
        <Input
          label="Seu nome"
          placeholder="Ex.: Camila"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />

        <Input
          label="Seu @usuario único"
          prefix="@"
          placeholder="camila.rocha"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={(text) => setUsername(text.replace(/\s+/g, '').toLowerCase())}
          error={usernameError}
          helperText={
            status === 'available'
              ? `@${normalizeUsername(username)} está disponível!`
              : 'Use letras minúsculas, números, ponto ou underline.'
          }
          rightAccessory={
            status === 'checking' ? (
              <ActivityIndicator size="small" color={Palette.primary} />
            ) : status === 'available' ? (
              <Ionicons name="checkmark-circle" size={20} color={Palette.success} />
            ) : status === 'taken' || status === 'invalid' ? (
              <Ionicons name="close-circle" size={20} color={Palette.danger} />
            ) : null
          }
        />

        {submitError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={Palette.danger} />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}

        <Button
          title="Continuar"
          loading={saving}
          disabled={status === 'taken' || status === 'invalid'}
          onPress={handleSave}
        />
      </Card>

      <View style={styles.footer}>
        <Button title="Sair da conta" variant="ghost" onPress={signOut} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Palette.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.primarySoft,
  },
  title: {
    ...Typography.h1,
    color: Palette.text,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 320,
  },
  card: {
    gap: Spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.dangerSoft,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Palette.danger,
    flex: 1,
  },
  footer: {
    marginTop: Spacing.lg,
  },
});
