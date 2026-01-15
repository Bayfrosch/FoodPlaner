'use client';

import { useEffect, useState } from 'react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAcceptedCookies = localStorage.getItem('cookieConsent');
    if (!hasAcceptedCookies) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#1a1a2e] to-[#14141f] border-t border-purple-500/30 backdrop-blur-xl z-40 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-2">Datenschutz & Cookies</h3>
          <p className="text-gray-400 text-sm">
            Diese Website speichert Daten lokal in deinem Browser, um deine Anmeldedaten zu speichern und dein Nutzungserlebnis zu verbessern. 
            Durch die Verwendung der Website akzeptierst du das Speichern dieser Daten.
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] active:scale-95 whitespace-nowrap flex-shrink-0"
        >
          Akzeptieren
        </button>
      </div>
    </div>
  );
}
