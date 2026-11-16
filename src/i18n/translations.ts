export type Language = 'en' | 'rw' | 'fr';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  languageLabel: string;
  navHome: string;
  navNews: string;
  navAbout: string;
  navContact: string;
  navPrivacy: string;
  navTerms: string;
  footerStandard: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'ISEZERANO ONLINE',
    appSubtitle: 'News & Information Portal',
    languageLabel: 'Language / Ururimi / Langue',
    navHome: 'Home',
    navNews: 'All News',
    navAbout: 'About Us',
    navContact: 'Contact Us',
    navPrivacy: 'Privacy Policy',
    navTerms: 'Terms & Conditions',
    footerStandard: 'ISEZERANO ONLINE — Independent News & Information Portal.'
  },
  rw: {
    appTitle: 'ISEZERANO ONLINE',
    appSubtitle: 'Urubuga rw’Amakuru',
    languageLabel: 'Ururimi / Language / Langue',
    navHome: 'Ahabanza',
    navNews: 'Amakuru Yose',
    navAbout: 'Ibyerekeye Twebwe',
    navContact: 'Twandikire',
    navPrivacy: 'Ubuzima Bwite',
    navTerms: 'Amategeko n’Amabwiriza',
    footerStandard: 'ISEZERANO ONLINE — Urubuga rwigenga rw’Amakuru n’Ubusesenguzi.'
  },
  fr: {
    appTitle: 'ISEZERANO ONLINE',
    appSubtitle: 'Portail d’Actualités',
    languageLabel: 'Langue / Language / Ururimi',
    navHome: 'Accueil',
    navNews: 'Toutes les Actualités',
    navAbout: 'À Propos',
    navContact: 'Contactez-nous',
    navPrivacy: 'Confidentialité',
    navTerms: 'Conditions Générales',
    footerStandard: 'ISEZERANO ONLINE — Portail Indépendant d’Actualités et d’Information.'
  }
};
