import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Input, ScreenContainer } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { signInWithEmail, signInWithGoogle } from '@/features/auth/services/authService';
import { isSupabaseConfigured } from '@/lib/supabase';

export function LoginScreen() {
  const { enterPreviewMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Preencha seu e-mail e sua senha para entrar.');
      return;
    }

    try {
      setLoadingEmail(true);
      await signInWithEmail(email, password);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    try {
      setLoadingGoogle(true);
      await signInWithGoogle();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível continuar com o Google.'
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.hero}>
        <View style={styles.logoBubble}>
          <Ionicons name="heart" size={32} color={Palette.primary} />
        </View>
        <Text style={styles.title}>Bem-vindos de volta</Text>
        <Text style={styles.subtitle}>
          Entre para acompanhar a rotina, os dengos e os planos de vocês dois.
        </Text>
      </View>

      {!isSupabaseConfigured ? (
        <Card variant="subtle" style={styles.setupCard}>
          <View style={styles.setupHeader}>
            <Badge label="Modo Local" tone="warning" />
            <Text style={styles.setupTitle}>Supabase ainda não configurado</Text>
          </View>
          <Text style={styles.setupText}>
            Copie <Text style={styles.mono}>.env.example</Text> para{' '}
            <Text style={styles.mono}>.env</Text> com sua URL e chave anon do Supabase, ou
            explore as telas agora no modo preview:
          </Text>
          <View style={styles.previewRow}>
            <Button
              title="Conectar Par"
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={styles.previewBtn}
              onPress={() => enterPreviewMode('connect')}
            />
            <Button
              title="Ver 5 Abas"
              variant="outline"
              size="sm"
              fullWidth={false}
              style={styles.previewBtn}
              onPress={() => enterPreviewMode('tabs')}
            />
          </View>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Button
          title="Continuar com Google"
          variant="outline"
          loading={loadingGoogle}
          onPress={handleGoogleLogin}
          icon={<Ionicons name="logo-google" size={18} color={Palette.text} />}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou entre com e-mail</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          <Input
            label="E-mail"
            placeholder="voce@exemplo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Senha"
            placeholder="Sua senha"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            rightAccessory={
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Palette.textSecondary}
                />
              </Pressable>
            }
          />

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={Palette.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Button
            title="Entrar"
            loading={loadingEmail}
            onPress={handleEmailLogin}
            style={styles.submitBtn}
          />
        </View>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem conta? </Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text style={styles.footerLink}>Criar conta</Text>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  logoBubble: {
    width: 68,
    height: 68,
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
  setupCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  setupTitle: {
    ...Typography.captionBold,
    color: Palette.text,
  },
  setupText: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  mono: {
    fontWeight: '700',
    color: Palette.text,
  },
  previewRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 2,
  },
  previewBtn: {
    flex: 1,
  },
  card: {
    gap: Spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.border,
  },
  dividerText: {
    ...Typography.caption,
    color: Palette.textMuted,
  },
  form: {
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
  submitBtn: {
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    ...Typography.body,
    color: Palette.textSecondary,
  },
  footerLink: {
    ...Typography.bodyMedium,
    color: Palette.primary,
    fontWeight: '700',
  },
});
