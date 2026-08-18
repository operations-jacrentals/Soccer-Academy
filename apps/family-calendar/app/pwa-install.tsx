"use client";

import { useEffect, useRef, useState } from "react";
import {
  CALENDAR_STORAGE_KEY,
  makeCalendarBackup,
  RECOVERY_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  validateCalendarBackup,
} from "./pwa-backup";
import type { CalendarEvent } from "./calendar-events";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

type PwaInstallControlProps = {
  onRestoreCalendar: (events: CalendarEvent[]) => Promise<void>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone);
}

export function PwaInstallControl({ onRestoreCalendar }: PwaInstallControlProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backupFieldRef = useRef<HTMLTextAreaElement>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [message, setMessage] = useState("");
  const [hasRecovery, setHasRecovery] = useState(false);

  useEffect(() => {
    const initialFrame = requestAnimationFrame(() => {
      setStandalone(isStandalone());
      setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) ||
        ((/macintosh/i.test(navigator.userAgent) || navigator.platform === "MacIntel") && navigator.maxTouchPoints > 1));
      setHasRecovery(Boolean(localStorage.getItem(RECOVERY_STORAGE_KEY)));
    });

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setInstallPrompt(null);
      setMessage("Our Week is installed.");
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setStandalone(isStandalone());

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener?.("change", onDisplayMode);
    return () => {
      cancelAnimationFrame(initialFrame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener?.("change", onDisplayMode);
    };
  }, []);

  function openDialog() {
    setMessage("");
    setBackupText("");
    dialogRef.current?.showModal();
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") dialogRef.current?.close();
    else setMessage("Installation was cancelled. You can try again whenever you’re ready.");
    setInstallPrompt(null);
  }

  async function copyBackup() {
    const calendar = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!calendar) {
      setMessage("The calendar is still getting ready. Close this panel and try again in a moment.");
      return;
    }
    const backup = makeCalendarBackup(calendar, localStorage.getItem(SETTINGS_STORAGE_KEY));
    setBackupText(backup);
    try {
      await navigator.clipboard.writeText(backup);
      setMessage("Calendar backup copied. Keep it until the Home Screen app opens with your events.");
    } catch {
      setMessage("Your backup is ready below and selected. Choose Copy from the text menu.");
      requestAnimationFrame(() => {
        backupFieldRef.current?.focus();
        backupFieldRef.current?.select();
      });
    }
  }

  async function pasteBackup() {
    try {
      const value = await navigator.clipboard.readText();
      setBackupText(value);
      setMessage("Backup pasted. Choose Restore calendar to finish.");
    } catch {
      setMessage("Paste your backup into the box below.");
    }
  }

  async function restoreBackup() {
    let sharedCalendarRestored = false;
    try {
      const backup = validateCalendarBackup(backupText.trim());
      if (!window.confirm("Replace the shared family calendar with the pasted backup? Approved family members will see the restored calendar after it saves.")) return;
      const restoredEvents = (JSON.parse(backup.calendar) as { events: CalendarEvent[] }).events;
      const priorCalendar = localStorage.getItem(CALENDAR_STORAGE_KEY);
      const priorSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const priorRecovery = localStorage.getItem(RECOVERY_STORAGE_KEY);
      await onRestoreCalendar(restoredEvents);
      sharedCalendarRestored = true;
      try {
        if (priorCalendar === null) localStorage.removeItem(RECOVERY_STORAGE_KEY);
        else localStorage.setItem(RECOVERY_STORAGE_KEY, makeCalendarBackup(priorCalendar, priorSettings));
        localStorage.setItem(CALENDAR_STORAGE_KEY, backup.calendar);
        if (typeof backup.settings === "string") localStorage.setItem(SETTINGS_STORAGE_KEY, backup.settings);
        else localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch (error) {
        if (priorCalendar === null) localStorage.removeItem(CALENDAR_STORAGE_KEY);
        else localStorage.setItem(CALENDAR_STORAGE_KEY, priorCalendar);
        if (priorSettings === null) localStorage.removeItem(SETTINGS_STORAGE_KEY);
        else localStorage.setItem(SETTINGS_STORAGE_KEY, priorSettings);
        if (priorRecovery === null) localStorage.removeItem(RECOVERY_STORAGE_KEY);
        else localStorage.setItem(RECOVERY_STORAGE_KEY, priorRecovery);
        throw error;
      }
      setHasRecovery(Boolean(localStorage.getItem(RECOVERY_STORAGE_KEY)));
      setMessage("Shared calendar restored. Reopening Our Week…");
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "That backup could not be restored.";
      setMessage(sharedCalendarRestored ? `The shared calendar was restored, but this device could not save its local backup: ${detail}` : detail);
    }
  }

  async function recoverPreviousCalendar() {
    let sharedCalendarRestored = false;
    try {
      const recoveryRaw = localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (!recoveryRaw) throw new Error("No previous calendar is available on this device.");
      const recovery = validateCalendarBackup(recoveryRaw);
      if (!window.confirm("Restore the calendar from before the last import for everyone with access?")) return;
      const restoredEvents = (JSON.parse(recovery.calendar) as { events: CalendarEvent[] }).events;
      const priorCalendar = localStorage.getItem(CALENDAR_STORAGE_KEY);
      const priorSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      await onRestoreCalendar(restoredEvents);
      sharedCalendarRestored = true;
      try {
        localStorage.setItem(CALENDAR_STORAGE_KEY, recovery.calendar);
        if (typeof recovery.settings === "string") localStorage.setItem(SETTINGS_STORAGE_KEY, recovery.settings);
        else localStorage.removeItem(SETTINGS_STORAGE_KEY);
        localStorage.removeItem(RECOVERY_STORAGE_KEY);
      } catch (error) {
        if (priorCalendar === null) localStorage.removeItem(CALENDAR_STORAGE_KEY);
        else localStorage.setItem(CALENDAR_STORAGE_KEY, priorCalendar);
        if (priorSettings === null) localStorage.removeItem(SETTINGS_STORAGE_KEY);
        else localStorage.setItem(SETTINGS_STORAGE_KEY, priorSettings);
        throw error;
      }
      setHasRecovery(false);
      setMessage("Previous calendar restored. Reopening Our Week…");
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The previous calendar could not be restored.";
      setMessage(sharedCalendarRestored ? `The shared calendar was restored, but this device could not update its local backup: ${detail}` : detail);
    }
  }

  const canPromptInstall = Boolean(installPrompt);

  return (
    <>
      <button className="button button-quiet install-app-button" type="button" onClick={openDialog} aria-label="Open app data, backup, and Home Screen options">
        <span className="install-app-icon" aria-hidden="true">⇄</span>
        <span className="install-app-label">App data</span>
      </button>

      <dialog className="pwa-dialog" ref={dialogRef} aria-labelledby="pwa-dialog-title" onCancel={() => setMessage("")}>
        <div className="pwa-dialog-header">
          <div>
            <p className="eyebrow">OUR WEEK APP</p>
            <h2 id="pwa-dialog-title">App data</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close app setup">×</button>
        </div>

        <div className="pwa-dialog-body">
          {standalone ? (
            <p className="pwa-intro">Our Week is installed. It opens full screen from its icon, keeps a copy on this device, and shares approved changes whenever it is online.</p>
          ) : canPromptInstall ? (
            <section className="pwa-install-card">
              <strong>Install Our Week</strong>
              <p>Add the calendar as a full-screen app with its own icon.</p>
              <button className="button button-primary" type="button" onClick={installApp}>Install now</button>
            </section>
          ) : isIos ? (
            <section className="pwa-install-card">
              <strong>On iPhone or iPad</strong>
              <ol>
                <li>Open this page in <b>Safari</b> and sign in with an approved account if asked.</li>
                <li>Copy a calendar backup below for safekeeping.</li>
                <li>Tap Safari&apos;s <b>Share</b> button.</li>
                <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
                <li>Open <b>Our Week</b> from the new icon.</li>
              </ol>
            </section>
          ) : (
            <section className="pwa-install-card">
              <strong>Install from your browser</strong>
              <p>Open the browser menu and choose <b>Install app</b> or <b>Add to Home Screen</b>.</p>
            </section>
          )}

          <section className="pwa-transfer-card">
            <div>
              <strong>Back up your calendar</strong>
              <p>{standalone
                ? "Your approved family calendar will load automatically when this app is online. Keep a backup in case you ever need to restore an earlier plan."
                : "Copy a backup for safekeeping. Restoring one intentionally replaces the shared family calendar."}</p>
            </div>
            <div className="pwa-transfer-actions">
              <button className="button button-quiet" type="button" onClick={copyBackup}>Copy backup</button>
              <button className="button button-quiet" type="button" onClick={pasteBackup}>Paste backup</button>
            </div>
            <label className="pwa-backup-field">
              <span>Calendar backup</span>
              <textarea ref={backupFieldRef} value={backupText} onChange={(event) => setBackupText(event.target.value)} placeholder="Paste an Our Week backup here" rows={4} spellCheck={false} />
            </label>
            <button className="button button-primary" type="button" onClick={restoreBackup} disabled={!backupText.trim()}>Restore shared calendar</button>
            {hasRecovery && <button className="button button-quiet" type="button" onClick={recoverPreviousCalendar}>Undo last restore</button>}
          </section>

          {message && <p className="pwa-message" role="status">{message}</p>}
          <p className="pwa-local-note">Calendar changes sync with approved family members when online. This device also keeps a local copy for offline viewing and backup.</p>
        </div>
      </dialog>
    </>
  );
}
