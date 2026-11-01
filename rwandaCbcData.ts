export interface ProvinceWithDistricts {
  province: string;
  districts: string[];
}

export const RWANDA_PROVINCES: ProvinceWithDistricts[] = [
  {
    province: 'Kigali City',
    districts: ['Gasabo', 'Kicukiro', 'Nyarugenge']
  },
  {
    province: 'Eastern Province',
    districts: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana']
  },
  {
    province: 'Northern Province',
    districts: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo']
  },
  {
    province: 'Southern Province',
    districts: ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango']
  },
  {
    province: 'Western Province',
    districts: ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro']
  }
];

export const PRIMARY_GRADES = [
  'Primary 1 (P1)',
  'Primary 2 (P2)',
  'Primary 3 (P3)',
  'Primary 4 (P4)',
  'Primary 5 (P5)',
  'Primary 6 (P6)'
];

export const SECONDARY_GRADES = [
  'Senior 1 (S1)',
  'Senior 2 (S2)',
  'Senior 3 (S3)',
  'Senior 4 (S4)',
  'Senior 5 (S5)',
  'Senior 6 (S6)'
];

export const CBC_GENERIC_COMPETENCES = [
  'Critical Thinking',
  'Creativity and Innovation',
  'Research and Problem Solving',
  'Communication in official languages',
  'Co-operation, interpersonal relations and life skills',
  'Lifelong learning'
];

export const CBC_CROSS_CUTTING_ISSUES = [
  'Peace and Values Education',
  'Gender Education',
  'Inclusive Education',
  'Environment and Sustainability',
  'Financial Education',
  'Comprehensive Sexuality Education (CSE)',
  'Genocide Studies',
  'Standardisation Culture'
];

export const CBC_RECOMMENDED_STAGES = [
  'Introduction',
  'Development',
  'Practice',
  'Application',
  'Conclusion'
];

export const RWANDA_TERMS = ['Term 1', 'Term 2', 'Term 3'];
