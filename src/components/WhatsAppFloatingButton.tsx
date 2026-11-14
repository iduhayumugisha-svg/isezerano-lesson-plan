import React from 'react';
import { trackWhatsAppClick } from '../services/analyticsService';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { WhatsAppContactSettings } from '../types/websiteDesign';
import { buildWhatsAppChatUrl, formatWhatsAppDisplayNumber } from '../utils/whatsappUtils';

interface WhatsAppFloatingButtonProps {
  currentPage?: string;
}

interface WhatsAppButtonViewProps {
  settings: WhatsAppContactSettings;
  onButtonClick?: () => void;
  previewMode?: boolean;
}

const SIZE_CLASSES: Record<WhatsAppContactSettings['size'], { container: string; icon: string; text: string }> = {
  small: {
    container: 'px-3 py-2 gap-2',
    icon: 'w-4 h-4 sm:w-4 sm:h-4',
    text: 'text-xs font-semibold'
  },
  medium: {
    container: 'px-4 py-2.5 sm:px-4 sm:py-3 gap-2.5',
    icon: 'w-5 h-5 sm:w-5 sm:h-5',
    text: 'text-xs sm:text-sm font-bold'
  },
  large: {
    container: 'px-5 py-3 sm:px-6 sm:py-3.5 gap-3',
    icon: 'w-6 h-6 sm:w-6 sm:h-6',
    text: 'text-sm sm:text-base font-bold'
  }
};

export const WhatsAppIconSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={`fill-current shrink-0 ${className}`}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export const WhatsAppButtonView: React.FC<WhatsAppButtonViewProps> = ({
  settings,
  onButtonClick,
  previewMode = false
}) => {
  const whatsappUrl = buildWhatsAppChatUrl(settings.phoneNumber, settings.defaultMessage);
  const displayNumber = formatWhatsAppDisplayNumber(settings.phoneNumber);
  const sizeSpec = SIZE_CLASSES[settings.size] || SIZE_CLASSES.medium;
  const shapeClass = settings.shape === 'rounded' ? 'rounded-xl' : 'rounded-full';
  const labelText = (settings.buttonText || '').trim() || 'Twandikire kuri WhatsApp';

  if (!whatsappUrl && !previewMode) {
    return null;
  }

  const buttonLink = (
    <a
      href={whatsappUrl || '#'}
      target={whatsappUrl ? '_blank' : undefined}
      rel={whatsappUrl ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        if (!whatsappUrl) {
          e.preventDefault();
          return;
        }
        onButtonClick?.();
      }}
      aria-label={`${labelText} - ${displayNumber}`}
      title={`${labelText} (${displayNumber})`}
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor
      }}
      className={`inline-flex items-center justify-center ${sizeSpec.container} ${shapeClass} shadow-lg hover:shadow-xl hover:brightness-95 active:scale-[0.98] transition-all duration-200 max-w-[calc(100vw-2rem)] sm:max-w-xs border border-black/10 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-slate-900/40 select-none`}
    >
      {settings.showIcon && <WhatsAppIconSvg className={sizeSpec.icon} />}
      <span className={`${sizeSpec.text} leading-tight truncate`}>{labelText}</span>
    </a>
  );

  if (settings.displayMode === 'normal') {
    const alignClass = settings.position === 'bottom-left' ? 'justify-start' : 'justify-end';
    if (previewMode) {
      return (
        <div className={`w-full flex ${alignClass} px-4 py-3 border-t border-slate-200 bg-white/95`}>
          {buttonLink}
        </div>
      );
    }

    return (
      <section
        aria-label={labelText}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 print:hidden"
      >
        <div className={`flex ${alignClass}`}>{buttonLink}</div>
      </section>
    );
  }

  const positionClasses =
    settings.position === 'bottom-left'
      ? previewMode
        ? 'bottom-4 left-4'
        : 'bottom-4 left-4 sm:bottom-6 sm:left-6'
      : previewMode
        ? 'bottom-4 right-4'
        : 'bottom-4 right-4 sm:bottom-6 sm:right-6';

  return (
    <aside
      aria-label={labelText}
      className={`${previewMode ? 'absolute' : 'fixed'} ${positionClasses} z-40 print:hidden pointer-events-auto`}
    >
      {buttonLink}
    </aside>
  );
};

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  currentPage = 'home'
}) => {
  const { whatsappContact } = useWebsiteDesign();

  if (!whatsappContact || !whatsappContact.enabled) {
    return null;
  }

  const whatsappUrl = buildWhatsAppChatUrl(whatsappContact.phoneNumber, whatsappContact.defaultMessage);
  if (!whatsappUrl) {
    return null;
  }

  const handleClick = () => {
    trackWhatsAppClick(
      currentPage,
      whatsappContact.phoneNumber,
      whatsappContact.displayMode === 'normal' ? 'inline_button' : 'floating_button'
    );
  };

  return <WhatsAppButtonView settings={whatsappContact} onButtonClick={handleClick} />;
};
