export interface NewsCategory {
  id: string;
  name: string; // Kinyarwanda / primary display name (e.g. Uburezi, Amakuru Mashya)
  nameEn?: string; // Optional English translation (e.g. Education, Latest News)
  slug: string; // URL-safe slug (e.g. uburezi, amakuru-mashya)
  order: number; // Sorting order in header & filter bars (0-indexed or 1-indexed)
  enabled: boolean; // Toggle visible or hidden
  description?: string;
  color?: string; // Optional accent badge color
}

export const DEFAULT_NEWS_CATEGORIES: NewsCategory[] = [
  {
    id: 'cat-uburezi',
    name: 'Uburezi',
    nameEn: 'Education & CBC',
    slug: 'uburezi',
    order: 0,
    enabled: true,
    description: 'Amakuru y’uburezi, integanyanyigisho ya CBC, n’iterambere ry’abarimu n’abanyeshuri'
  },
  {
    id: 'cat-amakuru-mashya',
    name: 'Amakuru Mashya',
    nameEn: 'Breaking News',
    slug: 'amakuru-mashya',
    order: 1,
    enabled: true,
    description: 'Amakuru yihutirwa n’ibiri kuba ako kanya mu Rwanda no hanze yarwo'
  },
  {
    id: 'cat-ikoranabuhanga',
    name: 'Ikoranabuhanga',
    nameEn: 'Technology & AI',
    slug: 'ikoranabuhanga',
    order: 2,
    enabled: true,
    description: 'Ibyerekeye ikoranabuhanga, AI mu burezi, no guhanga udushya'
  },
  {
    id: 'cat-imfashanyigisho',
    name: 'Imfashanyigisho',
    nameEn: 'Teaching Materials',
    slug: 'imfashanyigisho',
    order: 3,
    enabled: true,
    description: 'Imfashanyigisho z’abarimu, uburyo bwo gutegura amasomo n’ibizamini'
  },
  {
    id: 'cat-iterambere',
    name: 'Iterambere',
    nameEn: 'Development',
    slug: 'iterambere',
    order: 4,
    enabled: true,
    description: 'Iterambere ry’imibereho myiza n’ubukungu mu Rwanda'
  },
  {
    id: 'cat-umuco-imyidagaduro',
    name: 'Umuco n’Imyidagaduro',
    nameEn: 'Culture & Sports',
    slug: 'umuco-imyidagaduro',
    order: 5,
    enabled: true,
    description: 'Umuco nyarwanda, imikino, n’imyidagaduro ifasha abanyeshuri'
  },
  {
    id: 'cat-ubuzima',
    name: 'Ubuzima',
    nameEn: 'Health & Wellness',
    slug: 'ubuzima',
    order: 6,
    enabled: true,
    description: 'Amakuru n’inama byerekeye ubuzima bwiza mu mashuri n’ingo'
  }
];
