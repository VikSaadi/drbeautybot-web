/**
 * hooks/usePushNotifications.ts
 * CHANGELOG
 * - 2026-03-26 v1.0:
 *   - Hook React para manejar permisos y scheduling de notificaciones.
 *   - Expone: permission, request(), scheduleFromProfile(), cancel().
 *   - Se integra en profile/page.tsx después de guardar el perfil.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  requestPermission,
  scheduleReapplicationReminders,
  cancelAll,
  getPendingRemindersInfo,
  isNativeApp,
} from '@/lib/pushNotifications';

export type NotifPermission = 'unknown' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const [permission,  setPermission]  = useState<NotifPermission>('unknown');
  const [scheduling,  setScheduling]  = useState(false);
  const [scheduled,   setScheduled]   = useState(0);
  const [reminders,   setReminders]   = useState<ReturnType<typeof getPendingRemindersInfo>>([]);

  // Leer estado inicial
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) && !isNativeApp()) {
      setPermission('unsupported');
      return;
    }
    if (!isNativeApp()) {
      const p = Notification.permission;
      setPermission(p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'unknown');
    }
    // Cargar info de recordatorios existentes
    setReminders(getPendingRemindersInfo());
  }, []);

  /** Pide permiso y, si se concede, programa los recordatorios */
  const request = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  /** Programa recordatorios desde el perfil guardado */
  const scheduleFromProfile = useCallback(async () => {
    setScheduling(true);
    try {
      const result = await scheduleReapplicationReminders();
      setScheduled(result.scheduled);
      setReminders(getPendingRemindersInfo());
      return result.scheduled;
    } finally {
      setScheduling(false);
    }
  }, []);

  /** Cancela todos los recordatorios */
  const cancel = useCallback(async () => {
    await cancelAll();
    setScheduled(0);
    setReminders([]);
  }, []);

  return {
    permission,
    scheduling,
    scheduled,
    reminders,
    isSupported: permission !== 'unsupported',
    isGranted:   permission === 'granted',
    request,
    scheduleFromProfile,
    cancel,
  };
}