import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, ScreenContainer } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import {
  checkUsernameAvailability,
  normalizeUsername,
  signInWithGoogle,
  signUpWithEmail,
  validateUsernameFormat,
} from '@/features/auth/services/authService';
import { isSupabaseConfigured } from '@/lib/supabase';

export function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const clean = normalizeUsername(username);
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    const formatErr = validateUsernameFormat(clean);
    if (formatErr) {
      setUsernameStatus('invalid');
      setUsernameError(formatErr);
      return;
    }

    setUsernameError(null);
    if (!isSupabaseConfigured) {
      setUsernameStatus('available');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(clean);
        if (cancelled) return;
        setUsernameStatus(available ? 'available' : 'taken');
        setUsernameError(available ? null : `O usuário @${clean} já está em uso.`);
      } catch {
        if (!cancelled) setUsernameStatus('idle');
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const handleRegister = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Informe o seu nome.');
      return;
    }

    const formatErr = validateUsernameFormat(username);
    if (formatErr) {
      setErrorMessage(formatErr);
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMessage('Escolha outro @usuario — este já está ocupado.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      const data = await signUpWithEmail({
        fullName,
        username,
        email,
        password,
      });

      // Caso o projeto Supabase exija confirmação por e-mail
      if (!data.session) {
        setSuccessMessage(
          'Conta criada! Verifique sua caixa de entrada para confirmar o e-mail e depois faça login.'
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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

  const renderUsernameAccessory = () => {
    if (usernameStatus === 'checking') {
      return <ActivityIndicator size="small" color={Palette.primary} />;
    }
    if (usernameStatus === 'available') {
      return <Ionicons name="checkmark-circle" size={20} color={Palette.success} />;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      return <Ionicons name="close-circle" size={20} color={Palette.danger} />;
    }
    return null;
  };

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom', 'left', 'right']}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={Palette.text} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Criar sua conta</Text>
        <Text style={styles.subtitle}>
          Escolha um @usuario único para que seu par possa encontrar você facilmente.
        </Text>
      </View>

      <Card style={styles.card}>
        <Button
          title="Continuar com Google"
          variant="outline"
          loading={loadingGoogle}
          onPress={handleGoogleSignUp}
          icon={<Ionicons name="logo-google" size={18} color={Palette.text} />}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou cadastre com e-mail</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          <Input
            label="Nome"
            placeholder="Como seu par te chama"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />

          <Input
            label="Usuário (@username único)"
            prefix="@"
            placeholder="seunome"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={(text) => setUsername(text.replace(/\s+/g, '').toLowerCase())}
            error={usernameError}
            helperText={
              usernameStatus === 'available'
                ? `@${normalizeUsername(username)} está disponível!`
                : 'Letras minúsculas, números, ponto ou underline (3 a 24 caracteres).'
            }
            rightAccessory={renderUsernameAccessory()}
          />

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
            placeholder="Mínimo de 6 caracteres"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            rightAccessory={
              <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
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

          {successMessage ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Palette.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <Button
            title="Criar conta"
            loading={loading}
            onPress={handleRegister}
            style={styles.submitBtn}
          />
        </View>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Já possui uma conta? </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={styles.footerLink}>Entrar</Text>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  backText: {
    ...Typography.bodyMedium,
    color: Palette.text,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    color: Palette.text,
  },
  subtitle: {
    ...Typography.body,
    color: Palette.textSecondary,
    marginTop: Spacing.xxs,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.successSoft,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  successText: {
    ...Typography.caption,
    color: Palette.success,
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
