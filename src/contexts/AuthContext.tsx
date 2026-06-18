import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { getOrCreateSpreadsheet, loadStudentsFromSheet, syncStudentsToSheet } from '../services/googleSheets';
import { db } from '../db/database';
import type { Student } from '../types';

interface AuthUser {
  name: string;
  email: string;
  picture: string;
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  spreadsheetId: string | null;
  syncing: boolean;
  syncError: string | null;
  login: () => void;
  logout: () => void;
  syncNow: (students?: Student[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = 'lscs_user';
const TOKEN_KEY = 'lscs_access_token';
const SHEET_ID_KEY = 'lscs_spreadsheet_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  });
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(
    () => localStorage.getItem(SHEET_ID_KEY)
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync all students to Google Sheets
  const syncNow = useCallback(async (students?: Student[]) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const sheetId = localStorage.getItem(SHEET_ID_KEY);
    if (!token || !sheetId) return;

    setSyncing(true);
    setSyncError(null);
    try {
      const list = students ?? await db.students.toArray();
      await syncStudentsToSheet(token, sheetId, list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      // Token expired → clear it so user knows they must re-login
      if (msg.includes('401') || msg.includes('403')) {
        localStorage.removeItem('lscs_access_token');
        setSyncError('Session expired — please sign out and sign in again to sync.');
      } else {
        setSyncError('Sync failed: ' + msg);
      }
      console.error('Sync error:', msg);
    } finally {
      setSyncing(false);
    }
  }, []);

  // On successful Google login — get token, load spreadsheet, import students
  const handleGoogleSuccess = useCallback(async (tokenResponse: { access_token: string }) => {
    const token = tokenResponse.access_token;
    localStorage.setItem(TOKEN_KEY, token);

    try {
      setSyncing(true);
      // Get user profile
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await profileRes.json();

      const newUser: AuthUser = {
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
        accessToken: token,
      };
      setUser(newUser);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      // Get or create spreadsheet
      const sheetId = await getOrCreateSpreadsheet(token);
      setSpreadsheetId(sheetId);
      localStorage.setItem(SHEET_ID_KEY, sheetId);

      // Load students from sheet → merge into local DB
      const sheetStudents = await loadStudentsFromSheet(token, sheetId);

      if (sheetStudents.length > 0) {
        // Clear local DB and repopulate from sheet
        await db.students.clear();
        for (const s of sheetStudents) {
          const { id: _id, ...rest } = s;
          await db.students.add(rest);
        }
      } else {
        // Sheet is empty → push local data up to sheet
        const localStudents = await db.students.toArray();
        if (localStudents.length > 0) {
          await syncStudentsToSheet(token, sheetId, localStudents);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setSyncError('Failed to connect to Google Drive. Please try again.');
    } finally {
      setSyncing(false);
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setSyncError('Google sign-in was cancelled or failed.'),
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file openid profile email',
  });

  function logout() {
    googleLogout();
    setUser(null);
    setSpreadsheetId(null);
    setSyncError(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SHEET_ID_KEY);
  }

  // Auto-clear sync error after 5 seconds
  useEffect(() => {
    if (!syncError) return;
    const t = setTimeout(() => setSyncError(null), 5000);
    return () => clearTimeout(t);
  }, [syncError]);

  return (
    <AuthContext.Provider value={{ user, spreadsheetId, syncing, syncError, login, logout, syncNow }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
