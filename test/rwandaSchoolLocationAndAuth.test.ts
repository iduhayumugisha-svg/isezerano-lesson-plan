/**
 * Automated Verification for:
 * 1. Rwanda Administrative Divisions Data & Dependent Dropdowns
 * 2. School Directory Auto-Fill & Admin Management
 * 3. Lesson Plan Google Login Isolation
 */
import { 
  getProvinces, 
  getDistrictsByProvince, 
  getSectorsByDistrict, 
  getCellsBySector, 
  getVillagesByCell,
  findProvinceByDistrict,
  RWANDA_ADMINISTRATIVE_DATA
} from '../src/data/rwandaAdministrativeData';
import { 
  getAllSchools, 
  searchSchools, 
  getSchoolById,
  saveSchoolEntry,
  deleteSchoolEntry
} from '../src/services/schoolDirectoryService';
import { VERIFIED_RWANDA_SCHOOLS } from '../src/data/rwandaSchoolsData';
import { 
  getLessonStorageKey, 
  getSavedLessonPlans, 
  saveLessonPlanLocal, 
  deleteLessonPlanLocal 
} from '../src/services/storageService';
import { LessonPlan } from '../src/types/lessonPlan';

let passed = 0;
let failed = 0;

// Mock localStorage in Node environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0
};

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

console.log('===========================================================');
console.log('RUNNING RWANDA LOCATION, SCHOOL DIRECTORY & AUTH AUDIT');
console.log('===========================================================');

// --- 1. RWANDA ADMINISTRATIVE DIVISIONS TESTS ---
const provinces = getProvinces();
assert(provinces.length === 5, 'Rwanda has exactly 5 official provinces');
assert(provinces.includes('Northern Province'), 'Includes Northern Province');
assert(provinces.includes('City of Kigali'), 'Includes City of Kigali');
assert(provinces.includes('Southern Province'), 'Includes Southern Province');
assert(provinces.includes('Eastern Province'), 'Includes Eastern Province');
assert(provinces.includes('Western Province'), 'Includes Western Province');

// Test districts
const northernDistricts = getDistrictsByProvince('Northern Province');
assert(northernDistricts.length === 5, 'Northern Province has 5 districts');
assert(northernDistricts.includes('Rulindo'), 'Northern Province includes Rulindo');
assert(northernDistricts.includes('Gicumbi'), 'Northern Province includes Gicumbi');
assert(northernDistricts.includes('Musanze'), 'Northern Province includes Musanze');
assert(northernDistricts.includes('Burera'), 'Northern Province includes Burera');
assert(northernDistricts.includes('Gakenke'), 'Northern Province includes Gakenke');

const kigaliDistricts = getDistrictsByProvince('City of Kigali');
assert(kigaliDistricts.length === 3, 'City of Kigali has 3 districts');
assert(kigaliDistricts.includes('Gasabo'), 'Kigali includes Gasabo');
assert(kigaliDistricts.includes('Kicukiro'), 'Kigali includes Kicukiro');
assert(kigaliDistricts.includes('Nyarugenge'), 'Kigali includes Nyarugenge');

// Test sectors
const rulindoSectors = getSectorsByDistrict('Northern Province', 'Rulindo');
assert(rulindoSectors.includes('Buyoga'), 'Rulindo includes Buyoga sector');
assert(rulindoSectors.includes('Base'), 'Rulindo includes Base sector');
assert(rulindoSectors.includes('Bushoki'), 'Rulindo includes Bushoki sector');
assert(rulindoSectors.includes('Shyorongi'), 'Rulindo includes Shyorongi sector');

// Test cells and villages for Buyoga
const buyogaCells = getCellsBySector('Northern Province', 'Rulindo', 'Buyoga');
assert(buyogaCells.includes('Gitumba'), 'Buyoga sector includes Gitumba cell');
assert(buyogaCells.includes('Giko'), 'Buyoga sector includes Giko cell');

const gitumbaVillages = getVillagesByCell('Northern Province', 'Rulindo', 'Buyoga', 'Gitumba');
assert(gitumbaVillages.includes('Nyarubande'), 'Gitumba cell includes Nyarubande village');
assert(gitumbaVillages.includes('Gahama'), 'Gitumba cell includes Gahama village');

// Auto-detection of province from district
assert(findProvinceByDistrict('Rulindo') === 'Northern Province', 'Auto-detects Northern Province from Rulindo');
assert(findProvinceByDistrict('Gasabo') === 'City of Kigali', 'Auto-detects City of Kigali from Gasabo');
assert(findProvinceByDistrict('Huye') === 'Southern Province', 'Auto-detects Southern Province from Huye');
assert(findProvinceByDistrict('Rubavu') === 'Western Province', 'Auto-detects Western Province from Rubavu');
assert(findProvinceByDistrict('Kayonza') === 'Eastern Province', 'Auto-detects Eastern Province from Kayonza');

// --- 2. SCHOOL DIRECTORY & AUTO-FILL TESTS ---
const allSchools = getAllSchools();
assert(allSchools.length >= VERIFIED_RWANDA_SCHOOLS.length, 'School directory loaded with verified schools');

const gsGitumba = getSchoolById('sch-gs-gitumba');
assert(gsGitumba !== null, 'GS GITUMBA exists in verified directory');
assert(gsGitumba?.district === 'Rulindo', 'GS GITUMBA is in Rulindo district');
assert(gsGitumba?.sector === 'Buyoga', 'GS GITUMBA is in Buyoga sector');
assert(gsGitumba?.cell === 'Gitumba', 'GS GITUMBA is in Gitumba cell');
assert(gsGitumba?.village === 'Nyarubande', 'GS GITUMBA is in Nyarubande village');

const searchResults = searchSchools('Kigali');
assert(searchResults.length > 0, 'Search for Kigali returns matching schools');
assert(searchResults.some(s => s.name.includes('LYCÉE DE KIGALI') || s.province.includes('Kigali')), 'Search results contain Kigali schools');

// Admin save new school entry
const customSchool = {
  name: 'GS TEST RUHENGERI',
  province: 'Northern Province',
  district: 'Musanze',
  sector: 'Muhoza',
  cell: 'Ruhengeri',
  village: 'Mpenge',
  category: 'Public' as const,
  isOfficialPreset: false
};

const saveRes = await saveSchoolEntry(customSchool, 'admin_test_uid');
assert(saveRes.success === true, 'Admin can successfully add a school entry');
assert(saveRes.entry?.id !== undefined, 'New school receives generated ID');

const foundSaved = getSchoolById(saveRes.entry?.id || '');
assert(foundSaved !== null && foundSaved.name === 'GS TEST RUHENGERI', 'Saved school is retrievable');

// Delete test school
if (saveRes.entry?.id) {
  const delRes = await deleteSchoolEntry(saveRes.entry.id);
  assert(delRes === true, 'Admin can successfully delete a custom school');
  assert(getSchoolById(saveRes.entry.id) === null, 'Deleted school is no longer in directory');
}

// --- 3. LESSON PLAN GOOGLE LOGIN ISOLATION TESTS ---
// Mock localStorage in Node environment
const keyTeacherA = getLessonStorageKey('teacher_uid_aaa');
const keyTeacherB = getLessonStorageKey('teacher_uid_bbb');
assert(keyTeacherA === 'rwanda_cbc_lesson_plans_teacher_uid_aaa', 'Teacher A has private storage key');
assert(keyTeacherB === 'rwanda_cbc_lesson_plans_teacher_uid_bbb', 'Teacher B has private storage key');
assert(keyTeacherA !== keyTeacherB, 'Storage keys for Teacher A and Teacher B are strictly isolated');

// Teacher A creates a lesson plan
const planA: LessonPlan = {
  id: 'plan_a_123',
  schoolName: 'GS GITUMBA',
  schoolLogoUrl: '',
  province: 'Northern Province',
  district: 'Rulindo',
  academicYear: '2026',
  term: 'Term 1',
  date: '2026-03-01',
  subject: 'Mathematics',
  classGrade: 'P4',
  unitNo: '1',
  lessonNo: '1',
  duration: '40 min',
  numberOfLearners: '45',
  teacherName: 'Teacher Alice',
  teacherQualification: 'A2 Education',
  educationLevel: 'Primary',
  specialNeedsLearners: 'None',
  unitTopic: 'Fractions',
  keyUnitCompetence: 'Solve fraction operations',
  lessonTitle: 'Adding Fractions',
  learningObjectives: 'Students can add fractions with same denominator',
  lessonLocation: 'Classroom',
  teachingMaterials: 'Chalkboard, fraction disks',
  references: 'REB Curriculum 2026',
  stages: [],
  teacherSelfEvaluation: 'All objectives met',
  createdAt: '2026-03-01T08:00:00.000Z',
  updatedAt: '2026-03-01T08:00:00.000Z',
  ownerUid: 'teacher_uid_aaa',
  userId: 'teacher_uid_aaa',
  ownerEmail: 'alice@example.com'
};

saveLessonPlanLocal(planA, 'teacher_uid_aaa');

// Check Teacher A's lesson plans
const plansForTeacherA = getSavedLessonPlans('teacher_uid_aaa');
assert(plansForTeacherA.length === 1, 'Teacher A can retrieve their own saved lesson plan');
assert(plansForTeacherA[0].id === 'plan_a_123', 'Retrieved plan matches Teacher A plan');

// Verify Teacher B CANNOT see Teacher A's lesson plan!
const plansForTeacherB = getSavedLessonPlans('teacher_uid_bbb');
assert(plansForTeacherB.length === 0, 'Teacher B CANNOT see Teacher A private lesson plans (0 plans returned)');

// Teacher B saves their own distinct plan
const planB: LessonPlan = {
  id: 'plan_b_456',
  schoolName: 'GS APE RUGUNGA',
  schoolLogoUrl: '',
  province: 'City of Kigali',
  district: 'Nyarugenge',
  academicYear: '2026',
  term: 'Term 1',
  date: '2026-03-02',
  subject: 'English',
  classGrade: 'S1',
  unitNo: '1',
  lessonNo: '1',
  duration: '40 min',
  numberOfLearners: '40',
  teacherName: 'Teacher Bob',
  teacherQualification: 'A1 Education',
  educationLevel: 'Secondary',
  specialNeedsLearners: 'None',
  unitTopic: 'Grammar',
  keyUnitCompetence: 'Use past tense',
  lessonTitle: 'Irregular Verbs',
  learningObjectives: 'Use past forms',
  lessonLocation: 'Classroom',
  teachingMaterials: 'Handouts',
  references: 'REB Curriculum 2026',
  stages: [],
  teacherSelfEvaluation: 'Active participation',
  createdAt: '2026-03-02T08:00:00.000Z',
  updatedAt: '2026-03-02T08:00:00.000Z',
  ownerUid: 'teacher_uid_bbb',
  userId: 'teacher_uid_bbb',
  ownerEmail: 'bob@example.com'
};

saveLessonPlanLocal(planB, 'teacher_uid_bbb');

// Verify Teacher B sees only their plan, and Teacher A sees only their plan
const recheckA = getSavedLessonPlans('teacher_uid_aaa');
const recheckB = getSavedLessonPlans('teacher_uid_bbb');
assert(recheckA.length === 1 && recheckA[0].id === 'plan_a_123', 'Teacher A isolated storage remains 1 plan (plan_a_123)');
assert(recheckB.length === 1 && recheckB[0].id === 'plan_b_456', 'Teacher B isolated storage remains 1 plan (plan_b_456)');

// Delete Teacher A plan - Teacher B plan must remain intact
deleteLessonPlanLocal('plan_a_123', 'teacher_uid_aaa');
assert(getSavedLessonPlans('teacher_uid_aaa').length === 0, 'Teacher A plan successfully deleted');
assert(getSavedLessonPlans('teacher_uid_bbb').length === 1, 'Teacher B plan remains untouched and intact');

console.log('===========================================================');
console.log(`TOTAL AUDIT CHECKS: ${passed} PASSED, ${failed} FAILED`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
}
