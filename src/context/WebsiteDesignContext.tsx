import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  WebsiteDesignSettings, 
  WebsiteColorSettings, 
  WebsiteTypographySettings, 
  WebsiteLogoSettings,
  WebsiteBrandingSettings,
  DEFAULT_WEBSITE_DESIGN,
  DEFAULT_WEBSITE_COLORS,
  DEFAULT_WEBSITE_TYPOGRAPHY,
  DEFAULT_WEBSITE_LOGO,
  DEFAULT_WEBSITE_BRANDING
} from '../types/websiteDesign';
import { 
  getWebsiteDesignSettings, 
  saveWebsiteDesignSettings, 
  applyDesignCssVariables,
  updateBrowserFavicon,
  subscribeToWebsiteDesign,
  uploadAndSaveWebsiteLogo,
  LogoUploadProgress,
  LogoUploadResult
} from '../services/websiteDesignService';
import { useAuth } from './AuthContext';

interface WebsiteDesignContextType {
  publishedSettings: WebsiteDesignSettings;
  draftSettings: WebsiteDesignSettings;
  activeSettings: WebsiteDesignSettings;
  isDraftDirty: boolean;
  isPreviewingDraft: boolean;
  isLoading: boolean;
  isPublishing: boolean;

  // Actions
  updateDraftBranding: (branding: Partial<WebsiteBrandingSettings>) => void;
  updateDraftColors: (colors: Partial<WebsiteColorSettings>) => void;
  updateDraftTypography: (typography: Partial<WebsiteTypographySettings>) => void;
  updateDraftLogo: (logo: Partial<WebsiteLogoSettings>) => void;
  resetSectionToDefault: (section: 'branding' | 'colors' | 'typography' | 'logo' | 'all') => void;
  resetSingleField: (section: 'branding' | 'colors' | 'typography' | 'logo', fieldKey: string) => void;
  setPreviewingDraft: (preview: boolean) => void;
  cancelDraft: () => void;
  publishSettings: () => Promise<{ success: boolean; error?: string }>;
  uploadLogoFile: (file: File, onProgress?: (progress: LogoUploadProgress) => void) => Promise<LogoUploadResult>;
  reloadSettings: () => Promise<void>;

  // Convenience Getters
  branding: WebsiteBrandingSettings;
  logoUrl: string;
  logoSettings: WebsiteLogoSettings;
  colors: WebsiteColorSettings;
  typography: WebsiteTypographySettings;
}

const WebsiteDesignContext = createContext<WebsiteDesignContextType | undefined>(undefined);

export const WebsiteDesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [publishedSettings, setPublishedSettings] = useState<WebsiteDesignSettings>(DEFAULT_WEBSITE_DESIGN);
  const [draftSettings, setDraftSettings] = useState<WebsiteDesignSettings>(DEFAULT_WEBSITE_DESIGN);
  const [isDraftDirty, setIsDraftDirty] = useState<boolean>(false);
  const [isPreviewingDraft, setIsPreviewingDraft] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Initial load and real-time Firestore synchronization
  useEffect(() => {
    loadSettings();

    // Attach real-time snapshot listener
    const unsubscribe = subscribeToWebsiteDesign((remoteSettings) => {
      setPublishedSettings(remoteSettings);
      
      // If the admin does not have uncommitted local draft changes, keep draft in sync
      setDraftSettings((currentDraft) => {
        if (!isDraftDirty) {
          return remoteSettings;
        }
        return currentDraft;
      });

      // Apply CSS variables across document
      applyDesignCssVariables(remoteSettings);
    });

    return () => {
      unsubscribe();
    };
  }, [isDraftDirty]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getWebsiteDesignSettings();
      setPublishedSettings(data);
      setDraftSettings(data);
      setIsDraftDirty(false);
      applyDesignCssVariables(data);
    } catch (err) {
      console.error('Error loading design settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When previewing draft vs published, re-apply CSS variables
  useEffect(() => {
    if (isPreviewingDraft) {
      applyDesignCssVariables(draftSettings);
    } else {
      applyDesignCssVariables(publishedSettings);
    }
  }, [isPreviewingDraft, draftSettings, publishedSettings]);

  const updateDraftBranding = (partialBranding: Partial<WebsiteBrandingSettings>) => {
    setDraftSettings(prev => ({
      ...prev,
      branding: { ...(prev.branding || DEFAULT_WEBSITE_BRANDING), ...partialBranding }
    }));
    setIsDraftDirty(true);
  };

  const updateDraftColors = (partialColors: Partial<WebsiteColorSettings>) => {
    setDraftSettings(prev => ({
      ...prev,
      colors: { ...prev.colors, ...partialColors }
    }));
    setIsDraftDirty(true);
  };

  const updateDraftTypography = (partialTypography: Partial<WebsiteTypographySettings>) => {
    setDraftSettings(prev => ({
      ...prev,
      typography: { ...prev.typography, ...partialTypography }
    }));
    setIsDraftDirty(true);
  };

  const updateDraftLogo = (partialLogo: Partial<WebsiteLogoSettings>) => {
    setDraftSettings(prev => ({
      ...prev,
      logo: { ...prev.logo, ...partialLogo }
    }));
    setIsDraftDirty(true);
  };

  const resetSectionToDefault = (section: 'branding' | 'colors' | 'typography' | 'logo' | 'all') => {
    setDraftSettings(prev => {
      let updated = { ...prev };
      if (section === 'branding' || section === 'all') {
        updated.branding = { ...DEFAULT_WEBSITE_BRANDING };
      }
      if (section === 'colors' || section === 'all') {
        updated.colors = { ...DEFAULT_WEBSITE_COLORS };
      }
      if (section === 'typography' || section === 'all') {
        updated.typography = { ...DEFAULT_WEBSITE_TYPOGRAPHY };
      }
      if (section === 'logo' || section === 'all') {
        updated.logo = { ...DEFAULT_WEBSITE_LOGO };
      }
      return updated;
    });
    setIsDraftDirty(true);
  };

  const resetSingleField = (section: 'branding' | 'colors' | 'typography' | 'logo', fieldKey: string) => {
    setDraftSettings(prev => {
      const updated = { ...prev };
      if (section === 'branding') {
        (updated.branding as any)[fieldKey] = (DEFAULT_WEBSITE_BRANDING as any)[fieldKey];
      } else if (section === 'colors') {
        (updated.colors as any)[fieldKey] = (DEFAULT_WEBSITE_COLORS as any)[fieldKey];
      } else if (section === 'typography') {
        (updated.typography as any)[fieldKey] = (DEFAULT_WEBSITE_TYPOGRAPHY as any)[fieldKey];
      } else if (section === 'logo') {
        (updated.logo as any)[fieldKey] = (DEFAULT_WEBSITE_LOGO as any)[fieldKey];
      }
      return updated;
    });
    setIsDraftDirty(true);
  };

  const cancelDraft = () => {
    setDraftSettings(publishedSettings);
    setIsDraftDirty(false);
    setIsPreviewingDraft(false);
    applyDesignCssVariables(publishedSettings);
  };

  const publishSettings = async (): Promise<{ success: boolean; error?: string }> => {
    setIsPublishing(true);
    try {
      const adminUid = user?.uid || 'admin';
      const result = await saveWebsiteDesignSettings(draftSettings, adminUid);
      if (result.success) {
        setPublishedSettings(draftSettings);
        setIsDraftDirty(false);
        setIsPreviewingDraft(false);
        applyDesignCssVariables(draftSettings);
        if (draftSettings.logo.updateFavicon && draftSettings.logo.logoUrl) {
          updateBrowserFavicon(draftSettings.logo.logoUrl);
        }
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to publish settings' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Publish error';
      return { success: false, error: message };
    } finally {
      setIsPublishing(false);
    }
  };

  const uploadLogoFile = async (
    file: File,
    onProgress?: (progress: LogoUploadProgress) => void
  ): Promise<LogoUploadResult> => {
    const adminUid = user?.uid || user?.email || 'admin';
    const result = await uploadAndSaveWebsiteLogo(file, adminUid, onProgress);

    if (result.success && result.url) {
      // Immediately reflect published logo
      setPublishedSettings(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          logoUrl: result.url!,
          isCustomLogo: true
        }
      }));

      // Also update draft
      setDraftSettings(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          logoUrl: result.url!,
          isCustomLogo: true
        }
      }));

      setIsDraftDirty(false);
      updateBrowserFavicon(result.url);
    }

    return result;
  };

  const activeSettings = isPreviewingDraft ? draftSettings : publishedSettings;

  return (
    <WebsiteDesignContext.Provider
      value={{
        publishedSettings,
        draftSettings,
        activeSettings,
        isDraftDirty,
        isPreviewingDraft,
        isLoading,
        isPublishing,
        updateDraftBranding,
        updateDraftColors,
        updateDraftTypography,
        updateDraftLogo,
        resetSectionToDefault,
        resetSingleField,
        setPreviewingDraft: setIsPreviewingDraft,
        cancelDraft,
        publishSettings,
        uploadLogoFile,
        reloadSettings: loadSettings,
        branding: activeSettings.branding || DEFAULT_WEBSITE_BRANDING,
        logoUrl: activeSettings.logo.logoUrl || DEFAULT_WEBSITE_LOGO.logoUrl,
        logoSettings: activeSettings.logo,
        colors: activeSettings.colors,
        typography: activeSettings.typography
      }}
    >
      {children}
    </WebsiteDesignContext.Provider>
  );
};

export const useWebsiteDesign = (): WebsiteDesignContextType => {
  const context = useContext(WebsiteDesignContext);
  if (!context) {
    throw new Error('useWebsiteDesign must be used within a WebsiteDesignProvider');
  }
  return context;
};
