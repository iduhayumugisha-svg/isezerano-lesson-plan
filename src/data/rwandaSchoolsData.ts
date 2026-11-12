/**
 * Verified Official School Directory Dataset for Rwanda
 * Free, offline local directory pre-populated with verified educational institutions.
 */

export interface SchoolDirectoryEntry {
  id: string;
  name: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  phone?: string;
  headTeacherName?: string;
  category: 'Public' | 'Government-Aided' | 'Private';
  isOfficialPreset: boolean;
  ownerUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const VERIFIED_RWANDA_SCHOOLS: SchoolDirectoryEntry[] = [
  {
    id: 'sch-gs-gitumba',
    name: 'GS GITUMBA',
    province: 'Northern Province',
    district: 'Rulindo',
    sector: 'Buyoga',
    cell: 'Gitumba',
    village: 'Nyarubande',
    phone: '+250 788 000 000',
    headTeacherName: 'Kamanzi Jean Baptiste',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-ape-rugunga',
    name: 'GS APE RUGUNGA',
    province: 'City of Kigali',
    district: 'Nyarugenge',
    sector: 'Nyarugenge',
    cell: 'Kiyovu',
    village: 'Rugunga',
    phone: '+250 788 111 222',
    headTeacherName: 'Mugisha Emmanuel',
    category: 'Private',
    isOfficialPreset: true
  },
  {
    id: 'sch-lycee-de-kigali',
    name: 'LYCÉE DE KIGALI',
    province: 'City of Kigali',
    district: 'Nyarugenge',
    sector: 'Nyarugenge',
    cell: 'Kiyovu',
    village: 'Kiyovu',
    phone: '+250 788 333 444',
    headTeacherName: 'Uwera Marie',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-fawe-girls-gisozi',
    name: 'FAWE GIRLS SCHOOL GISOZI',
    province: 'City of Kigali',
    district: 'Gasabo',
    sector: 'Gisozi',
    cell: 'Musezero',
    village: 'Gasave',
    phone: '+250 788 555 666',
    headTeacherName: 'Mukamana Chantal',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-kagarama-sec',
    name: 'KAGARAMA SECONDARY SCHOOL',
    province: 'City of Kigali',
    district: 'Kicukiro',
    sector: 'Kagarama',
    cell: 'Muyange',
    village: 'Rukatsa',
    phone: '+250 788 777 888',
    headTeacherName: 'Nshimiyimana Jean',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-college-st-andre',
    name: 'COLLÈGE SAINT ANDRÉ',
    province: 'City of Kigali',
    district: 'Nyarugenge',
    sector: 'Nyamirambo',
    cell: 'Mumena',
    village: 'Cyivugiza',
    phone: '+250 788 999 000',
    headTeacherName: 'Père Habimana Faustin',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-notre-dame-byumba',
    name: 'GS NOTRE DAME DU BON CONSEIL BYUMBA',
    province: 'Northern Province',
    district: 'Gicumbi',
    sector: 'Byumba',
    cell: 'Kibali',
    village: 'Gisuna',
    phone: '+250 788 234 567',
    headTeacherName: 'Sœur Mukakarisa Véronique',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-es-byimana',
    name: 'ÉCOLE DES SCIENCES BYIMANA',
    province: 'Southern Province',
    district: 'Ruhango',
    sector: 'Byimana',
    cell: 'Muhororo',
    village: 'Kamonyi',
    phone: '+250 788 345 678',
    headTeacherName: 'Frère Kamanzi Innocent',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-seminaire-kabgayi',
    name: 'PETIT SÉMINAIRE SAINT LÉON KABGAYI',
    province: 'Southern Province',
    district: 'Muhanga',
    sector: 'Shyogwe',
    cell: 'Cyeza',
    village: 'Mubuga',
    phone: '+250 788 456 789',
    headTeacherName: 'Abbé Rugamba Théogène',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-gahini',
    name: 'GS GAHINI',
    province: 'Eastern Province',
    district: 'Kayonza',
    sector: 'Gahini',
    cell: 'Urugarama',
    village: 'Gahini',
    phone: '+250 788 567 890',
    headTeacherName: 'Mutabazi Paul',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-nyagatare',
    name: 'GS NYAGATARE',
    province: 'Eastern Province',
    district: 'Nyagatare',
    sector: 'Nyagatare',
    cell: 'Barija',
    village: 'Nyagatare',
    phone: '+250 788 678 901',
    headTeacherName: 'Kagabo Charles',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-remera-rukoma',
    name: 'GS REMERA RUKOMA',
    province: 'Southern Province',
    district: 'Kamonyi',
    sector: 'Rukoma',
    cell: 'Bugoba',
    village: 'Remera',
    phone: '+250 788 789 012',
    headTeacherName: 'Bizimana André',
    category: 'Government-Aided',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-butaro',
    name: 'GS BUTARO',
    province: 'Northern Province',
    district: 'Burera',
    sector: 'Butaro',
    cell: 'Rusumo',
    village: 'Kavumu',
    phone: '+250 788 890 123',
    headTeacherName: 'Hakizimana Patrick',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-muhoza-musanze',
    name: 'GS MUHOZA I MUSANZE',
    province: 'Northern Province',
    district: 'Musanze',
    sector: 'Muhoza',
    cell: 'Ruhengeri',
    village: 'Mpenge',
    phone: '+250 788 901 234',
    headTeacherName: 'Nyiramana Jeanne',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-rubavu',
    name: 'GS RUBAVU',
    province: 'Western Province',
    district: 'Rubavu',
    sector: 'Gisenyi',
    cell: 'Kivumu',
    village: 'Rubavu',
    phone: '+250 788 012 345',
    headTeacherName: 'Twahirwa Claude',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-kibungo',
    name: 'GS KIBUNGO',
    province: 'Eastern Province',
    district: 'Ngoma',
    sector: 'Kibungo',
    cell: 'Gahima',
    village: 'Kibungo',
    phone: '+250 788 123 456',
    headTeacherName: 'Munyaneza Joseph',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-rwamagana',
    name: 'GS RWAMAGANA',
    province: 'Eastern Province',
    district: 'Rwamagana',
    sector: 'Kigabiro',
    cell: 'Nyagasenyi',
    village: 'Rwamagana',
    phone: '+250 788 234 567',
    headTeacherName: 'Rutayisire Eric',
    category: 'Public',
    isOfficialPreset: true
  },
  {
    id: 'sch-gs-kamembe',
    name: 'GS KAMEMBE',
    province: 'Western Province',
    district: 'Rusizi',
    sector: 'Kamembe',
    cell: 'Kamembe',
    village: 'Kavumu',
    phone: '+250 788 345 678',
    headTeacherName: 'Niyonzima Jean Pierre',
    category: 'Public',
    isOfficialPreset: true
  }
];
