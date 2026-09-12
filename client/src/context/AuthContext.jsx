import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import { getMe } from '../services/userService';

const AuthContext = createContext(null);

/**
 * Custom hook to access authentication state and actions.
 * Must be used within an <AuthProvider>.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider — unified authentication state management.
 *
 * Provides: user, role, isAuthenticated, login, adminLogin, verify2FA,
 * logout, setSession (for registration flows).
 *
 * On mount, rehydrates state from localStorage so page refreshes work.
 * All state updates are reactive — no window.location.reload() needed.
 */
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('admin');
      if (stored && stored !== 'undefined') return JSON.parse(stored);
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('admin');
    }
    return null;
  });

  const [role, setRole] = useState(() => localStorage.getItem('role') || null);

  const isAuthenticated = !!user;

  const persistSession = useCallback((userData, userRole, token) => {
    if (token) localStorage.setItem('token', token);
    const userStr = JSON.stringify(userData);
    localStorage.setItem('user', userStr);
    localStorage.setItem('role', userRole);
    // Also set 'admin' key for backward compat with AdminNavbar/Sidebar
    if (['admin', 'paymentAdmin', 'lostFoundAdmin'].includes(userRole)) {
      localStorage.setItem('admin', userStr);
    }
    setUser((prev) => (JSON.stringify(prev) === userStr ? prev : userData));
    setRole((prev) => (prev === userRole ? prev : userRole));
  }, []);

  // ── Sync latest user details, role & memberships from server on mount ─
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let isMounted = true;
    getMe()
      .then((res) => {
        if (isMounted && res.data?.user) {
          const userStr = JSON.stringify(res.data.user);
          localStorage.setItem('user', userStr);
          localStorage.setItem('role', res.data.role);
          if (['admin', 'paymentAdmin', 'lostFoundAdmin'].includes(res.data.role)) {
            localStorage.setItem('admin', userStr);
          }
          setUser((prev) => (JSON.stringify(prev) === userStr ? prev : res.data.user));
          setRole((prev) => (prev === res.data.role ? prev : res.data.role));
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('admin');
          localStorage.removeItem('role');
          localStorage.removeItem('token');
          if (isMounted) {
            setUser(null);
            setRole(null);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.loginUser(email, password);
    const data = res.data;

    if (data.needs2FA) {
      return { needs2FA: true };
    }

    persistSession(data.user, data.role, data.token);
    navigate('/profile');
    return { needs2FA: false, role: data.role };
  }, [navigate, persistSession]);

  const verify2FA = useCallback(async (email, otp) => {
    const res = await authService.verify2FA(email, otp);
    const data = res.data;

    persistSession(data.user, data.role, data.token);
    navigate('/profile');
    return data;
  }, [navigate, persistSession]);

  const adminLogin = useCallback(async (email, password) => {
    const res = await authService.adminLogin(email, password);
    const data = res.data;

    if (data.success) {
      persistSession(data.admin, data.admin.role, data.token);

      if (data.admin.role === 'facultyCoordinator') {
        navigate('/profile');
      } else {
        navigate('/admin-dashboard');
      }
    }
    return data;
  }, [navigate, persistSession]);

  const setSession = useCallback((userData, userRole, token) => {
    persistSession(userData, userRole, token);
  }, [persistSession]);

  const refreshUser = useCallback(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored && stored !== 'undefined') {
        setUser(JSON.parse(stored));
      }
      const storedRole = localStorage.getItem('role');
      if (storedRole) setRole(storedRole);
    } catch {
    }
  }, []);

  const logout = useCallback((redirectTo = '/') => {
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Fire-and-forget server logout
    authService.logoutUser();

    setUser(null);
    setRole(null);

    // Use window.location for full state reset (ensures socket disconnects, etc.)
    window.location.href = redirectTo;
  }, []);

  const value = useMemo(() => ({
    user,
    role,
    isAuthenticated,
    login,
    adminLogin,
    verify2FA,
    logout,
    setSession,
    refreshUser,
  }), [user, role, isAuthenticated, login, adminLogin, verify2FA, logout, setSession, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
