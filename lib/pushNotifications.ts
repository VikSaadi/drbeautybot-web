/**
 * lib/pushNotifications.ts
 * CHANGELOG
 * - 2026-03-26 v1.0:
 *   - Utilidad de notificaciones push con Capacitor.
 *   - requestPermission(): pide permiso al usuario.
 *   - scheduleReapplicationReminders(): lee procedureDates del localStorage
 *     y programa recordatorios 30 días antes de cada reaplicación estimada.
 *   - cancelAll(): cancela todas las notificaciones pendientes.
 *   - isNativeApp(): detecta si corre en Capacitor (Android/iOS) o en web.
 *
 * INSTALACIÓN (ejecutar en terminal):
 *   npm install @capacitor/push-notifications @capacitor/local-notifications
 *   npx cap sync
 *
 * PERMISOS Android — agregar en android/app/src/main/AndroidManifest.xml:
 *   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
 *   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
 *   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
 */

// ── TIPOS ─────────────────────────────────────────────────────
interface ProcedureDate { month: string; year: string; }
interface ProcedureDates { [key: string]: ProcedureDate; }

interface ScheduledReminder {
  id: number;
  title: string;
  body: string;
  scheduleDate: Date;
  procedureKey: string;
}

// ── CONSTANTES ────────────────────────────────────────────────
const PROFILE_KEY    = 'drbeautybot_profile';
const NOTIF_KEY      = 'drb_notifications_scheduled';
const DAYS_BEFORE    = 30; // avisar 30 días antes

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

/** Duraciones estimadas en meses por procedimiento */
const DURATIONS: Record<string, number> = {
  toxina:    5,
  ah:        10,
  caha:      15,
  plla:      21,
  'pcl-cmc': 24,
  laser:     6,
};

/** Labels amigables para las notificaciones */
const PROCEDURE_LABELS: Record<string, string> = {
  toxina:    'Toxina botulínica (Botox)',
  ah:        'Relleno de Ácido Hialurónico',
  caha:      'Relleno de Radiesse',
  plla:      'Relleno de Sculptra',
  'pcl-cmc': 'Relleno de Ellansé',
  laser:     'Sesión de láser',
};

// ── HELPERS ───────────────────────────────────────────────────

/** Detecta si estamos corriendo en Capacitor (Android/iOS) */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/** Calcula la fecha de reaplicación y resta DAYS_BEFORE */
function calcReminderDate(month: string, year: string, durationMonths: number): Date | null {
  const monthIdx = MONTHS.indexOf(month);
  if (monthIdx === -1 || !year) return null;

  const reapplyDate = new Date(Number(year), monthIdx + durationMonths, 1);
  const reminderDate = new Date(reapplyDate);
  reminderDate.setDate(reminderDate.getDate() - DAYS_BEFORE);

  // Solo programar si la fecha está en el futuro
  return reminderDate > new Date() ? reminderDate : null;
}

/** Lee el perfil de localStorage y calcula los recordatorios */
function buildReminders(): ScheduledReminder[] {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return [];
    const profile = JSON.parse(raw);
    const dates: ProcedureDates = profile.procedureDates ?? {};
    const reminders: ScheduledReminder[] = [];
    let notifId = 1000; // IDs altos para no colisionar con otros

    // Botox
    if (dates['toxina']?.month && dates['toxina']?.year) {
      const d = calcReminderDate(dates['toxina'].month, dates['toxina'].year, DURATIONS['toxina']);
      if (d) {
        reminders.push({
          id: notifId++,
          title: '💉 ¿Ya es tiempo de tu retoque?',
          body: `Tu ${PROCEDURE_LABELS['toxina']} podría estar necesitando una reaplicación pronto. ¡Agenda tu cita!`,
          scheduleDate: d,
          procedureKey: 'toxina',
        });
      }
    }

    // Rellenos por material
    Object.keys(dates).filter(k => k.startsWith('relleno_')).forEach((key) => {
      const mat = key.replace('relleno_', '');
      const dur = DURATIONS[mat];
      if (!dur) return;
      const d = calcReminderDate(dates[key].month, dates[key].year, dur);
      if (d) {
        reminders.push({
          id: notifId++,
          title: '✨ Recordatorio de reaplicación',
          body: `Tu ${PROCEDURE_LABELS[mat] ?? 'relleno'} podría estar próximo a necesitar retoque. ¡No esperes al último momento!`,
          scheduleDate: d,
          procedureKey: key,
        });
      }
    });

    // Láser
    if (dates['laser']?.month && dates['laser']?.year) {
      const d = calcReminderDate(dates['laser'].month, dates['laser'].year, DURATIONS['laser']);
      if (d) {
        reminders.push({
          id: notifId++,
          title: '☀️ Recordatorio de sesión láser',
          body: 'Tu tratamiento de láser podría necesitar mantenimiento pronto. ¡Consulta con tu médico!',
          scheduleDate: d,
          procedureKey: 'laser',
        });
      }
    }

    return reminders;
  } catch {
    return [];
  }
}

// ── API PÚBLICA ───────────────────────────────────────────────

/**
 * Pide permiso de notificaciones al usuario.
 * En web: usa la Notifications API del navegador.
 * En nativo (Capacitor): usa el plugin de push notifications.
 * Devuelve true si se concedió permiso.
 */
export async function requestPermission(): Promise<boolean> {
  try {
    if (isNativeApp()) {
      // ── Capacitor (Android / iOS) ──────────────────────────
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } else {
      // ── Web / PWA ──────────────────────────────────────────
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
  } catch (e) {
    console.error('[PushNotif] requestPermission error:', e);
    return false;
  }
}

/**
 * Programa recordatorios de reaplicación basados en
 * las fechas guardadas en el perfil.
 * Cancela los anteriores antes de programar los nuevos.
 */
export async function scheduleReapplicationReminders(): Promise<{
  scheduled: number;
  reminders: ScheduledReminder[];
}> {
  const reminders = buildReminders();
  if (reminders.length === 0) return { scheduled: 0, reminders: [] };

  try {
    if (isNativeApp()) {
      // ── Capacitor ──────────────────────────────────────────
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Cancelar notificaciones anteriores de DrBeautyBot
      await cancelAll();

      // Programar nuevas
      await LocalNotifications.schedule({
        notifications: reminders.map((r) => ({
          id:    r.id,
          title: r.title,
          body:  r.body,
          schedule: { at: r.scheduleDate },
          sound: undefined,
          smallIcon: 'ic_notification', // drawable en Android
          iconColor: '#b794f4',
          extra: { procedureKey: r.procedureKey },
        })),
      });
    } else {
      // ── Web PWA — usar localStorage para simular ───────────
      // Las notificaciones web no se pueden programar a futuro,
      // así que guardamos la info para mostrarlas al abrir la app.
      localStorage.setItem(NOTIF_KEY, JSON.stringify(
        reminders.map((r) => ({
          ...r,
          scheduleDate: r.scheduleDate.toISOString(),
        }))
      ));
    }

    return { scheduled: reminders.length, reminders };
  } catch (e) {
    console.error('[PushNotif] scheduleReapplicationReminders error:', e);
    return { scheduled: 0, reminders: [] };
  }
}

/**
 * Cancela TODAS las notificaciones programadas por DrBeautyBot.
 */
export async function cancelAll(): Promise<void> {
  try {
    if (isNativeApp()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const pending = await LocalNotifications.getPending();
      // Solo cancelar las que tienen IDs de DrBeautyBot (>= 1000)
      const ours = pending.notifications.filter((n) => n.id >= 1000);
      if (ours.length > 0) {
        await LocalNotifications.cancel({ notifications: ours });
      }
    } else {
      localStorage.removeItem(NOTIF_KEY);
    }
  } catch (e) {
    console.error('[PushNotif] cancelAll error:', e);
  }
}

/**
 * Verifica si hay notificaciones pendientes de mostrar (PWA web).
 * Llámalo al montar el home para notificar a la usuaria.
 */
export function checkPendingWebNotifications(): void {
  if (isNativeApp()) return; // En nativo Capacitor lo maneja solo
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return;
    const pending = JSON.parse(raw) as (ScheduledReminder & { scheduleDate: string })[];
    const now = new Date();
    pending.forEach((n) => {
      const d = new Date(n.scheduleDate);
      if (d <= now && Notification.permission === 'granted') {
        new Notification(n.title, { body: n.body, icon: '/images/DON-REDONDON.png' });
      }
    });
    // Limpiar las que ya se mostraron
    const future = pending.filter((n) => new Date(n.scheduleDate) > now);
    if (future.length === 0) localStorage.removeItem(NOTIF_KEY);
    else localStorage.setItem(NOTIF_KEY, JSON.stringify(future));
  } catch { /* ignore */ }
}

/**
 * Devuelve un resumen legible de los recordatorios programados.
 * Útil para mostrarlos en la UI del perfil.
 */
export function getPendingRemindersInfo(): {
  procedureKey: string;
  label: string;
  reminderDate: string;
}[] {
  try {
    const reminders = buildReminders();
    return reminders.map((r) => ({
      procedureKey: r.procedureKey,
      label: r.title,
      reminderDate: r.scheduleDate.toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
    }));
  } catch {
    return [];
  }
}