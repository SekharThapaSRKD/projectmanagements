'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, CloudRain, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * LocationTimeNavbar Component
 * 
 * A modern, real-time location and time display component for Next.js.
 * Features:
 * - Geolocation detection
 * - Reverse geocoding (OpenStreetMap Nominatim)
 * - Live updating clock (24h format)
 * - Glassmorphism UI
 * - Error & Loading state handling
 */

interface LocationData {
  city: string;
  lat: number;
  lon: number;
}

export function LocationTimeNavbar() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'error' | 'denied'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setCurrentTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch city name from coordinates using OpenStreetMap Nominatim API
  const fetchCityName = useCallback(async (lat: number, lon: number) => {
    try {
      // Prevent unnecessary API calls if we already have the location for these coords
      // (Though in this simple component, it mostly runs once on mount)
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            // It's good practice to provide a User-Agent for Nominatim
            'User-Agent': 'TeamFlow-App-Location-Widget'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch location data');

      const data = await response.json();
      const city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Unknown City';
      
      setLocation({ city, lat, lon });
      setStatus('idle');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setStatus('error');
      setErrorMessage('Location unavailable');
    }
  }, []);

  // Initialize geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchCityName(latitude, longitude);
      },
      (error) => {
        // Handle GeolocationPositionError properly
        if (error && error.code) {
          if (error.code === 1) { // PERMISSION_DENIED
            setStatus('denied');
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            setStatus('error');
            setErrorMessage('Position unavailable');
          } else if (error.code === 3) { // TIMEOUT
            setStatus('error');
            setErrorMessage('Location request timed out');
          } else {
            setStatus('error');
            setErrorMessage('Location unavailable');
          }
        } else {
          setStatus('error');
          setErrorMessage('Location unavailable');
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 3600000 } // Cache for 1 hour
    );
  }, [fetchCityName]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 px-4 py-1.5 rounded-full",
        "glass-panel soft-border",
        "text-xs font-medium tracking-tight",
        "transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
      )}
    >
      {/* Location Section */}
      <div className="flex items-center gap-2 border-r border-white/10 pr-3">
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[hsl(var(--muted))]"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Detecting...</span>
            </motion.div>
          )}

          {status === 'idle' && location && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <MapPin className="h-3 w-3 text-[hsl(var(--accent))]" />
              <span className="text-[hsl(var(--text))]">{location.city}</span>
            </motion.div>
          )}

          {(status === 'error' || status === 'denied') && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[hsl(var(--muted))]"
            >
              <AlertCircle className="h-3 w-3" />
              <span>{status === 'denied' ? 'Location hidden' : 'Unavailable'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Time Section */}
      <div className="flex items-center gap-2">
        <Clock className="h-3 w-3 text-[hsl(var(--accent-2))]" />
        <span className="tabular-nums font-mono text-[hsl(var(--text))]">
          {currentTime || '--:--:--'}
        </span>
      </div>

      {/* Optional Weather/Status Placeholder */}
      <div className="ml-1 flex items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse shadow-[0_0_8px_rgba(46,212,157,0.5)]" />
      </div>
    </motion.div>
  );
}
