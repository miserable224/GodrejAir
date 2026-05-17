import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  loginWithCredentials,
  sendAdminOtp,
  verifyAdminOtp,
  clearSession,
  restoreSession,
  sessionToUser,
  setAuthSessionRef,
  setOnSessionExpired,
  setOnSessionUpdated,
  normalizeApiRole,
} from '../services/authService';
import {
  API_ROLES,
  isBoardRole,
  isSocietyRole,
  isSuperAdmin,
  isOperationsStaff,
  canAccessAdminDashboard,
  getVisibleModuleIds,
  hasLimitedAdminNav,
  isModuleVisible,
} from '../constants/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const applySession = useCallback((s) => {
    if (!s) {
      setSession(null);
      setToken(null);
      setUser(null);
      setAuthSessionRef(null);
      return;
    }
    setSession(s);
    setToken(s.accessToken);
    setUser(sessionToUser(s));
    setAuthSessionRef(s);
  }, []);

  const handleSessionExpired = useCallback((message) => {
    applySession(null);
    setSessionExpiredMessage(message || 'Session expired. Please sign in again.');
  }, [applySession]);

  useEffect(() => {
    setOnSessionExpired(handleSessionExpired);
    setOnSessionUpdated((s) => applySession(s));
    return () => {
      setOnSessionExpired(null);
      setOnSessionUpdated(null);
    };
  }, [handleSessionExpired, applySession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const restored = await restoreSession();
        if (!cancelled) applySession(restored);
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = async (username, password) => {
    setAuthError(null);
    setSessionExpiredMessage(null);
    try {
      const s = await loginWithCredentials(username, password);
      applySession(s);
      return { ok: true };
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError(error?.message || 'Could not sign in. Check username and password.');
      applySession(null);
      return { ok: false };
    }
  };

  const requestAdminOtp = async (email) => {
    setAuthError(null);
    try {
      return await sendAdminOtp(email);
    } catch (error) {
      setAuthError(error?.message || 'Could not send OTP');
      return null;
    }
  };

  const loginWithAdminOtp = async (email, otp, displayName) => {
    setAuthError(null);
    setSessionExpiredMessage(null);
    try {
      const { session } = await verifyAdminOtp(email, otp, displayName);
      applySession(session);
      return { ok: true };
    } catch (error) {
      console.error('Admin OTP login failed:', error);
      setAuthError(error?.message || 'Invalid OTP');
      applySession(null);
      return { ok: false };
    }
  };

  /** Offline resident preview (no API). */
  const loginAsResidentDemo = () => {
    setAuthError(null);
    setSessionExpiredMessage(null);
    applySession(null);
    setUser({
      id: 'resident-demo',
      name: 'Ananya Sharma',
      role: 'resident',
      apiRole: API_ROLES.RESIDENT,
      roleLabel: 'Resident (demo)',
      username: 'demo',
      isDemo: true,
    });
  };

  const logout = async () => {
    if (!user?.isDemo) await clearSession();
    applySession(null);
    setAuthError(null);
    setSessionExpiredMessage(null);
  };

  const clearSessionExpiredMessage = () => setSessionExpiredMessage(null);

  const apiRole = user?.apiRole;
  const navRole = user?.role;

  const permissions = useMemo(
    () => ({
      isDemo: Boolean(user?.isDemo),
      isResident: navRole === 'resident',
      isSociety: navRole === 'society',
      isSocietyMember: isSocietyRole(apiRole) || user?.isDemo,
      isBoard: isBoardRole(apiRole),
      isSuperAdmin: isSuperAdmin(apiRole),
      isAdminNav: navRole === 'admin',
      isOperations: navRole === 'operations',
      isGuard: navRole === 'guard',
      canAccessAdminDashboard: canAccessAdminDashboard(apiRole),
      canManageSecurity: canAccessAdminDashboard(apiRole) || navRole === 'guard',
      visibleModuleIds: getVisibleModuleIds(apiRole),
      hasLimitedAdminNav: hasLimitedAdminNav(apiRole),
      canSeeModule: (moduleId) => isModuleVisible(moduleId, apiRole),
    }),
    [apiRole, navRole, user?.isDemo],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        session,
        authError,
        sessionExpiredMessage,
        isBootstrapping,
        permissions,
        login,
        requestAdminOtp,
        loginWithAdminOtp,
        loginAsAdmin: loginWithAdminOtp,
        loginAsResident: loginAsResidentDemo,
        logout,
        clearSessionExpiredMessage,
        // Legacy helpers
        isAdmin: permissions.isAdminNav || permissions.isSuperAdmin,
        isSupervisor: permissions.isOperations && apiRole === API_ROLES.SECURITY_SUPERVISOR,
        isGuard: permissions.isGuard,
        isStaff: permissions.canAccessAdminDashboard || permissions.isGuard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
