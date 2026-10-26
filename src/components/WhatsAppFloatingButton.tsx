import React, { useState } from 'react';
import { trackWhatsAppClick } from '../services/analyticsService';

interface WhatsAppFloatingButtonProps {
  currentPage?: string;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({ 
  currentPage = 'home' 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const phoneNumber = '250782971258';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    'Muraho! Ndifuza kumenya byinshi kuri serivisi za ISEZERANO ONLINE – GS GITUMBA.'
  )}`;

  const handleClick = () => {
    trackWhatsAppClick(currentPage);
  };

  return (
    <aside
      aria-label="Twandikire kuri WhatsApp"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center flex-row-reverse group select-none print:hidden pointer-events-auto"
    >
      {/* Primary Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Twandikire kuri WhatsApp - 0782971258"
        title="Twandikire kuri WhatsApp (0782971258)"
        className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-emerald-400 focus:ring-offset-2"
      >
        {/* Subtle pulsating radar glow for attention */}
        <span 
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-35 animate-ping -z-10"
          aria-hidden="true" 
        />

        {/* WhatsApp Official SVG Logo */}
        <svg
          className="w-8 h-8 sm:w-9 sm:h-9 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>

        {/* Online Status Green Indicator Dot */}
        <span 
          className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-3.5 h-3.5 bg-emerald-300 border-2 border-white rounded-full"
          aria-hidden="true" 
        />
      </a>

      {/* Floating Tooltip / Badge for Desktop & Hover */}
      <div 
        className={`mr-3 py-1.5 px-3.5 rounded-full bg-slate-900/95 backdrop-blur-md text-white text-xs sm:text-sm font-semibold shadow-lg border border-slate-700/60 transition-all duration-300 pointer-events-none hidden sm:flex items-center space-x-2 ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-90 sm:opacity-90'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Twandikire kuri WhatsApp</span>
        <span className="text-emerald-300 text-xs font-mono font-normal">0782971258</span>
      </div>
    </aside>
  );
};
