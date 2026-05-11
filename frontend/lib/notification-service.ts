/**
 * Service to handle browser-level push notifications
 */
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
};

export const notificationService = {
  /**
   * Request permission for browser notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  },

  /**
   * Show a native browser notification
   */
  async show(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') return;
    }

    try {
      // Use standard browser Notification API
      return new Notification(title, {
        icon: '/favicon.ico', // Default icon path
        ...options
      });
    } catch (error) {
      console.error('Error showing browser notification:', error);
      
      // Fallback for some mobile browsers or environments where new Notification() might fail
      if ('serviceWorker' in navigator && 'showNotification' in (navigator.serviceWorker.ready as any)) {
        const registration = await navigator.serviceWorker.ready;
        return (registration as any).showNotification(title, options);
      }
    }
  },

  /**
   * Play a short in-app notification sound.
   */
  async playSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const start = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, start);
      masterGain.gain.exponentialRampToValueAtTime(0.07, start + 0.01);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      masterGain.connect(ctx.destination);

      const toneA = ctx.createOscillator();
      toneA.type = 'sine';
      toneA.frequency.setValueAtTime(880, start);
      toneA.connect(masterGain);
      toneA.start(start);
      toneA.stop(start + 0.12);

      const toneB = ctx.createOscillator();
      toneB.type = 'triangle';
      toneB.frequency.setValueAtTime(1175, start + 0.11);
      toneB.connect(masterGain);
      toneB.start(start + 0.11);
      toneB.stop(start + 0.28);
    } catch {
      // Ignore audio playback failures (autoplay restrictions, unsupported browser).
    }
  }
};
