export interface HeroSlide {
  id: string;
  headline: string;
  description: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string; // route name e.g. 'dashboard', 'create', 'about', 'contact', or https URL
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresetImage {
  id: string;
  title: string;
  category: string;
  url: string;
}
