import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { TEST_LOGIN } from '../../constants/testAccounts';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const CARD_WIDTH = Math.min(420, width - 36);

const TAB_ORDER = ['resident', 'admin'];

const UI = {
  bg: '#070A10',
  card: '#0E1219',
  cardHighlight: '#141A24',
  input: '#161C28',
  inputBorder: '#252D3D',
  label: '#6B7280',
  text: '#F9FAFB',
  muted: '#9CA3AF',
  teal: '#3EE8C5',
  tealDim: 'rgba(62, 232, 197, 0.15)',
  yellow: '#F2C94C',
  yellowBright: '#FFE566',
  error: '#FCA5A5',
  warn: '#FCD34D',
  gradient: ['#00F5D4', '#4F8EF7', '#A855F7', '#F472B6'],
};

function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['rgba(0,245,212,0.14)', 'transparent']}
        style={[styles.orb, styles.orbTopLeft]}
      />
      <LinearGradient
        colors={['rgba(168,85,247,0.12)', 'transparent']}
        style={[styles.orb, styles.orbBottomRight]}
      />
      <LinearGradient
        colors={['rgba(79,142,247,0.08)', 'transparent']}
        style={[styles.orb, styles.orbCenter]}
      />
    </View>
  );
}

function GradientCard({ children, style }) {
  return (
    <LinearGradient
      colors={UI.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientShell, style]}
    >
      <View style={styles.cardInner}>
        <LinearGradient
          colors={['rgba(62,232,197,0.06)', 'transparent']}
          style={styles.cardTopGlow}
        />
        {children}
      </View>
    </LinearGradient>
  );
}

function FieldLabel({ children }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function DarkField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  maxLength,
  focused,
  onFocus,
  onBlur,
  rightElement,
  onSubmitEditing,
  returnKeyType,
}) {
  return (
    <View style={[styles.fieldBox, focused && styles.fieldBoxFocused]}>
      {focused ? <View style={styles.fieldFocusRing} /> : null}
      <View style={styles.fieldIconWrap}>
        <Ionicons name={icon} size={17} color={focused ? UI.teal : UI.muted} />
      </View>
      <TextInput
        style={[styles.fieldInput, isWeb && styles.fieldInputWeb]}
        placeholder={placeholder}
        placeholderTextColor="#5C6370"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        maxLength={maxLength}
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        blurOnSubmit={!onSubmitEditing}
      />
      {rightElement}
    </View>
  );
}

function PrimaryButton({ label, disabled, loading, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.signInPressable,
        (disabled || loading) && styles.signInBtnDisabled,
        pressed && !disabled && !loading && styles.signInPressed,
      ]}
    >
      <LinearGradient
        colors={[UI.yellowBright, UI.yellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.signInBtn}
      >
        {loading ? (
          <ActivityIndicator color="#0B0E14" size="small" />
        ) : (
          <View style={styles.signInRow}>
            <Text style={styles.signInText}>{label}</Text>
            <View style={styles.signInArrow}>
              <Ionicons name="arrow-forward" size={16} color="#0B0E14" />
            </View>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const {
    login,
    requestAdminOtp,
    loginWithAdminOtp,
    authError,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('resident');
  const [authView, setAuthView] = useState('signIn');
  const [loggingIn, setLoggingIn] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [createEmail, setCreateEmail] = useState('');
  const [createOtp, setCreateOtp] = useState('');
  const [createName, setCreateName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    if (sessionExpiredMessage) clearSessionExpiredMessage();
  }, []);

  const isCreate = authView === 'createAccount';

  const resetCreateForm = () => {
    setCreateEmail('');
    setCreateOtp('');
    setCreateName('');
    setOtpSent(false);
    setDevOtpHint('');
  };

  const switchToSignIn = () => {
    setAuthView('signIn');
    resetCreateForm();
  };

  const switchToCreate = () => {
    setAuthView('createAccount');
    resetCreateForm();
  };

  const handleSignIn = async () => {
    if (loggingIn || !username.trim() || !password) return;
    setLoggingIn(true);
    try {
      await login(username, password);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSendOtp = async () => {
    if (!createEmail.trim()) return;
    setSendingOtp(true);
    setDevOtpHint('');
    const result = await requestAdminOtp(createEmail);
    setSendingOtp(false);
    if (result) {
      setOtpSent(true);
      if (result.devOtp) setDevOtpHint(result.devOtp);
    }
  };

  const handleVerifyCreate = async () => {
    setLoggingIn(true);
    await loginWithAdminOtp(createEmail, createOtp, createName);
    setLoggingIn(false);
  };

  const signInDisabled = loggingIn || !username.trim() || !password;
  const createSendDisabled = sendingOtp || !createEmail.trim();
  const createVerifyDisabled = loggingIn || createOtp.length < 4;

  const onPrimaryPress = () => {
    if (isCreate) {
      if (otpSent) handleVerifyCreate();
      else handleSendOtp();
    } else {
      handleSignIn();
    }
  };

  const primaryLabel = isCreate
    ? otpSent
      ? 'Verify & Create'
      : 'Send Code'
    : 'Sign In';

  const primaryDisabled = isCreate
    ? otpSent
      ? createVerifyDisabled
      : createSendDisabled
    : signInDisabled;

  const primaryLoading = isCreate ? (otpSent ? loggingIn : sendingOtp) : loggingIn;

  const quickAccount = activeTab === 'resident' ? TEST_LOGIN.resident : TEST_LOGIN.admin;

  const fillQuickLogin = () => {
    setUsername(quickAccount.username);
    setPassword(quickAccount.password);
  };

  const year = new Date().getFullYear();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AmbientBackground />
      <StatusBar barStyle="light-content" backgroundColor={UI.bg} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 32, minHeight: height - insets.top - insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GradientCard style={{ width: CARD_WIDTH }}>
            <View style={styles.logoBadge}>
              <LinearGradient
                colors={['rgba(62,232,197,0.25)', 'rgba(79,142,247,0.15)']}
                style={styles.logoBadgeGradient}
              >
                <Ionicons name="business-outline" size={22} color={UI.teal} />
              </LinearGradient>
            </View>

            <View style={styles.brandRow}>
              <Text style={styles.brandGodrej}>Godrej</Text>
              <Text style={styles.brandAir}> Air</Text>
            </View>
            <Text style={styles.tagline}>
              {isCreate
                ? 'Create your account with email verification'
                : 'Welcome back — sign in to continue'}
            </Text>

            {/* Resident / Admin — same sign-in page; tabs only on sign-in */}
            {!isCreate ? (
              <View style={styles.segment}>
                {TAB_ORDER.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.segmentItem, active && styles.segmentItemActive]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Ionicons
                        name={tab === 'resident' ? 'home-outline' : 'shield-checkmark-outline'}
                        size={15}
                        color={active ? UI.teal : UI.muted}
                        style={styles.segmentIcon}
                      />
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {tab === 'resident' ? 'Resident' : 'Admin'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {sessionExpiredMessage ? (
              <View style={styles.banner}>
                <Ionicons name="information-circle-outline" size={16} color={UI.warn} />
                <Text style={styles.bannerWarn}>{sessionExpiredMessage}</Text>
              </View>
            ) : null}
            {authError ? (
              <View style={styles.banner}>
                <Ionicons name="alert-circle-outline" size={16} color={UI.error} />
                <Text style={styles.bannerError}>{authError}</Text>
              </View>
            ) : null}

            {isCreate ? (
              <>
                <FieldLabel>EMAIL</FieldLabel>
                <DarkField
                  icon="mail-outline"
                  placeholder="Enter your email"
                  value={createEmail}
                  onChangeText={(v) => {
                    setCreateEmail(v);
                    setOtpSent(false);
                    setDevOtpHint('');
                  }}
                  keyboardType="email-address"
                  focused={focusedField === 'email'}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />

                {!otpSent ? (
                  <Text style={styles.adminHint}>
                    Account is created only after email OTP is verified
                  </Text>
                ) : (
                  <>
                    {devOtpHint ? (
                      <Text style={styles.devOtp}>Dev code: {devOtpHint}</Text>
                    ) : null}
                    <FieldLabel>VERIFICATION CODE</FieldLabel>
                    <DarkField
                      icon="key-outline"
                      placeholder="6-digit code"
                      value={createOtp}
                      onChangeText={setCreateOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      focused={focusedField === 'otp'}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <FieldLabel>FULL NAME</FieldLabel>
                    <DarkField
                      icon="person-outline"
                      placeholder="Required for new accounts"
                      value={createName}
                      onChangeText={setCreateName}
                      autoCapitalize="words"
                      focused={focusedField === 'name'}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <FieldLabel>USERNAME</FieldLabel>
                <DarkField
                  icon="person-outline"
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  focused={focusedField === 'user'}
                  onFocus={() => setFocusedField('user')}
                  onBlur={() => setFocusedField(null)}
                />

                <FieldLabel>PASSWORD</FieldLabel>
                <DarkField
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  focused={focusedField === 'pass'}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    if (!signInDisabled) handleSignIn();
                  }}
                  rightElement={
                    password.length > 0 ? (
                      <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
                        <Text style={styles.showToggle}>{showPass ? 'Hide' : 'Show'}</Text>
                      </Pressable>
                    ) : null
                  }
                />

                <View style={styles.testLoginBox}>
                  <Text style={styles.testLoginTitle}>Test login (tap to fill)</Text>
                  <Pressable style={styles.testLoginChip} onPress={fillQuickLogin}>
                    <Ionicons
                      name={activeTab === 'resident' ? 'home-outline' : 'shield-checkmark-outline'}
                      size={14}
                      color={UI.teal}
                    />
                    <Text style={styles.testLoginChipText}>
                      {quickAccount.label}: {quickAccount.hint}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            <PrimaryButton
              label={primaryLabel}
              disabled={primaryDisabled}
              loading={primaryLoading}
              onPress={onPrimaryPress}
            />

            {!isCreate ? (
              <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgotten password?</Text>
              </TouchableOpacity>
            ) : otpSent ? (
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={handleSendOtp}
                disabled={sendingOtp}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Resend code</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.signupRow}>
              <Text style={styles.signupMuted}>
                {isCreate ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <Pressable onPress={isCreate ? switchToSignIn : switchToCreate}>
                <Text style={styles.signupLink}>
                  {isCreate ? 'Sign in' : 'Create one'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.cardFooter}>
              © {year}{' '}
              <Text style={styles.cardFooterBrand}>Godrej Air™</Text>
              {' '}— Society Management Platform
            </Text>
          </GradientCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTopLeft: {
    width: width * 0.7,
    height: width * 0.7,
    top: -width * 0.25,
    left: -width * 0.2,
  },
  orbBottomRight: {
    width: width * 0.65,
    height: width * 0.65,
    bottom: -width * 0.15,
    right: -width * 0.2,
  },
  orbCenter: {
    width: width * 0.5,
    height: width * 0.5,
    top: height * 0.35,
    left: width * 0.25,
  },

  gradientShell: {
    borderRadius: 22,
    padding: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#00F5D4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 28,
      },
      android: { elevation: 14 },
      web: {
        boxShadow:
          '0 8px 48px rgba(0, 245, 212, 0.14), 0 16px 64px rgba(168, 85, 247, 0.1)',
      },
    }),
  },
  cardInner: {
    backgroundColor: UI.card,
    borderRadius: 20.5,
    paddingVertical: 32,
    paddingHorizontal: 26,
    overflow: 'hidden',
  },
  cardTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },

  logoBadge: {
    alignSelf: 'center',
    marginBottom: 14,
  },
  logoBadgeGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(62, 232, 197, 0.25)',
  },

  brandRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandGodrej: {
    fontSize: 34,
    fontWeight: '800',
    color: UI.teal,
    letterSpacing: -0.8,
  },
  brandAir: {
    fontSize: 34,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 13,
    color: UI.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },

  segment: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: UI.input,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: UI.inputBorder,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    gap: 6,
  },
  segmentItemActive: {
    backgroundColor: UI.cardHighlight,
    borderWidth: 1,
    borderColor: 'rgba(62, 232, 197, 0.2)',
  },
  segmentIcon: {
    marginRight: -2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.muted,
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    color: UI.text,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bannerError: {
    flex: 1,
    fontSize: 13,
    color: UI.error,
    lineHeight: 18,
  },
  bannerWarn: {
    flex: 1,
    fontSize: 13,
    color: UI.warn,
    lineHeight: 18,
  },
  adminHint: {
    fontSize: 12,
    color: UI.muted,
    lineHeight: 17,
    marginBottom: 8,
    marginTop: -6,
    textAlign: 'center',
  },
  devOtp: {
    fontSize: 11,
    color: UI.teal,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: UI.label,
    letterSpacing: 1.4,
    marginBottom: 7,
    marginTop: 2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.input,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: UI.inputBorder,
    marginBottom: 14,
    paddingHorizontal: 12,
    minHeight: 52,
    position: 'relative',
    overflow: 'hidden',
  },
  fieldBoxFocused: {
    borderColor: 'rgba(62, 232, 197, 0.45)',
    backgroundColor: '#181F2C',
  },
  fieldFocusRing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI.tealDim,
  },
  fieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: UI.text,
    paddingVertical: 12,
  },
  fieldInputWeb: {
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  showToggle: {
    fontSize: 12,
    fontWeight: '600',
    color: UI.teal,
    marginLeft: 8,
  },

  testLoginBox: {
    marginTop: 4,
    marginBottom: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(62, 232, 197, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(62, 232, 197, 0.15)',
  },
  testLoginTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: UI.label,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  testLoginChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testLoginChipText: {
    fontSize: 13,
    color: UI.teal,
    fontWeight: '600',
  },

  signInPressable: {
    width: '100%',
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 13,
    overflow: 'hidden',
  },
  signInBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  signInBtnDisabled: {
    opacity: 0.45,
  },
  signInPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B0E14',
    letterSpacing: 0.2,
  },
  signInArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(11, 14, 20, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    color: UI.teal,
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 18,
  },

  signupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signupMuted: {
    fontSize: 14,
    color: UI.muted,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(62, 232, 197, 0.5)',
  },

  cardFooter: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 16,
    paddingTop: 4,
  },
  cardFooterBrand: {
    color: UI.teal,
    fontWeight: '600',
  },
});
