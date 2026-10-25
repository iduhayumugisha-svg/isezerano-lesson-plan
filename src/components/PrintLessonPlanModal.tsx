import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LessonPlan } from '../types/lessonPlan';
import { 
  Printer, 
  X, 
  FileText, 
  Layout, 
  User, 
  School as SchoolIcon, 
  Check, 
  Download,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PrintLessonPlanModalProps {
  plan: LessonPlan;
  onClose: () => void;
}

const PREF_TEACHER_KEY = 'isezerano_pref_teacher_name';
const PREF_SCHOOL_KEY = 'isezerano_pref_school_name';

/**
 * Pure printable / exportable Rwanda CBC Lesson Plan Document.
 * Shared between on-screen preview, isolated iframe print, and standalone download.
 */
interface LessonPlanDocumentProps {
  plan: LessonPlan;
  langMode: 'rw' | 'bi' | 'en' | 'fr';
  schoolName: string;
  teacherName: string;
  id?: string;
}

export const LessonPlanDocument: React.FC<LessonPlanDocumentProps> = ({
  plan,
  langMode,
  schoolName,
  teacherName,
  id = 'printable-lesson-plan'
}) => {
  return (
    <div
      id={id}
      className="rwanda-cbc-document bg-white text-black p-3 sm:p-5 w-full text-[7.5pt] leading-tight box-border print:p-0"
      style={{
        fontFamily: "'Times New Roman', Times, Georgia, serif",
      }}
    >
      {/* 1. Official Republic of Rwanda / MINEDUC / REB Header */}
      <div className="text-center mb-1.5 pb-1 border-b border-black avoid-break">
        <div className="text-[8.5pt] font-bold tracking-wider uppercase text-black leading-none mb-0.5">
          {langMode === 'rw' && "REPUBULIKA Y'U RWANDA"}
          {langMode === 'fr' && 'RÉPUBLIQUE DU RWANDA'}
          {(langMode === 'en' || langMode === 'bi') && 'REPUBLIC OF RWANDA'}
        </div>
        <div className="text-[7.5pt] font-semibold text-slate-800 leading-none mb-0.5">
          {langMode === 'rw' && "MINISITERI Y'U BUREZI (MINEDUC) • IKIGO GISHINZWE UBUREZI BW'IBANZE (REB)"}
          {langMode === 'fr' && "MINISTÈRE DE L'ÉDUCATION (MINEDUC) • REB"}
          {(langMode === 'en' || langMode === 'bi') && 'MINISTRY OF EDUCATION (MINEDUC) • RWANDA BASIC EDUCATION BOARD (REB)'}
        </div>
        <h1 className="text-[10pt] font-bold uppercase tracking-wider text-black mt-0.5 leading-tight">
          {langMode === 'rw' && "IMBATA Y'ISOMO RY'IKITEGEREREZO (CBC)"}
          {langMode === 'bi' && "IMBATA Y'ISOMO / COMPETENCE-BASED LESSON PLAN"}
          {langMode === 'en' && 'OFFICIAL COMPETENCE-BASED LESSON PLAN (CBC)'}
          {langMode === 'fr' && 'FICHE PÉDAGOGIQUE OFFICIELLE (CBC / APC)'}
        </h1>
      </div>

      {/* 2. Top Identification Line: School & Teacher's Full Name (Class & Subject placed in Table 1) */}
      <div className="flex flex-wrap items-center justify-between text-[8pt] font-bold border-b border-black pb-1 mb-1.5 gap-2 avoid-break">
        <div className="flex items-center space-x-1.5">
          <span className="text-black">
            {langMode === 'en'
              ? 'School:'
              : langMode === 'fr'
              ? "École :"
              : langMode === 'bi'
              ? 'School / Ishuri:'
              : 'Ishuri:'}
          </span>
          <span className="font-semibold text-black uppercase underline decoration-1 underline-offset-2">
            {schoolName || plan.schoolName || 'GS GITUMBA'}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-right">
          <span className="text-black">
            {langMode === 'en'
              ? "Teacher's Full Name:"
              : langMode === 'fr'
              ? "Nom de l'Enseignant(e) :"
              : langMode === 'bi'
              ? 'Teacher / Mwarimu:'
              : 'Umwarimu:'}
          </span>
          <span className="font-semibold text-black underline decoration-1 underline-offset-2">
            {teacherName || plan.teacherName || '—'}
          </span>
        </div>
      </div>

      {/* 3. Table 1: Official 8-Column Rwanda CBC Metadata Bar */}
      <table className="w-full border-collapse border border-black text-center text-[7.5pt] mb-1.5 table-fixed">
        <thead>
          <tr className="bg-slate-100 font-bold border-b border-black">
            <th className="border border-black p-1 w-[10%] break-words">
              {langMode === 'en' ? 'Term' : langMode === 'fr' ? 'Trimestre' : langMode === 'bi' ? 'Term / Igihembwe' : 'Igihembwe'}
            </th>
            <th className="border border-black p-1 w-[12%] break-words">
              {langMode === 'en' ? 'Date' : langMode === 'fr' ? 'Date' : langMode === 'bi' ? 'Date / Itariki' : 'Itariki'}
            </th>
            <th className="border border-black p-1 w-[18%] break-words">
              {langMode === 'en' ? 'Subject' : langMode === 'fr' ? 'Matière' : langMode === 'bi' ? 'Subject / Isomo' : 'Isomo'}
            </th>
            <th className="border border-black p-1 w-[11%] break-words">
              {langMode === 'en' ? 'Class' : langMode === 'fr' ? 'Classe' : langMode === 'bi' ? 'Class / Umwaka' : 'Umwaka'}
            </th>
            <th className="border border-black p-1 w-[11%] break-words">
              {langMode === 'en' ? 'Unit No' : langMode === 'fr' ? 'Unité N°' : langMode === 'bi' ? 'Unit / Umutwe' : 'Umutwe No'}
            </th>
            <th className="border border-black p-1 w-[11%] break-words">
              {langMode === 'en' ? 'Lesson No' : langMode === 'fr' ? 'Leçon N°' : langMode === 'bi' ? 'Lesson / Isomo' : 'Isomo No'}
            </th>
            <th className="border border-black p-1 w-[12%] break-words">
              {langMode === 'en' ? 'Duration' : langMode === 'fr' ? 'Durée' : langMode === 'bi' ? 'Duration / Igihe' : 'Igihe'}
            </th>
            <th className="border border-black p-1 w-[15%] break-words">
              {langMode === 'en' ? 'Class Size' : langMode === 'fr' ? 'Apprenants' : langMode === 'bi' ? 'Learners / Abanyeshuri' : 'Abanyeshuri'}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1 font-medium break-words align-middle">{plan.term || '—'}</td>
            <td className="border border-black p-1 font-medium break-words align-middle">{plan.date || '—'}</td>
            <td className="border border-black p-1 font-bold break-words align-middle">{plan.subject || '—'}</td>
            <td className="border border-black p-1 font-bold break-words align-middle">{plan.classGrade || '—'}</td>
            <td className="border border-black p-1 font-medium break-words align-middle">{plan.unitNo || '—'}</td>
            <td className="border border-black p-1 font-medium break-words align-middle">{plan.lessonNo || '—'}</td>
            <td className="border border-black p-1 font-medium break-words align-middle">{plan.duration || '—'}</td>
            <td className="border border-black p-1 font-medium break-words align-middle">
              {plan.numberOfLearners ? `${plan.numberOfLearners}` : '—'}
              {(plan.numberOfBoys || plan.numberOfGirls) && (
                <div className="text-[7pt] text-slate-800 font-normal">
                  {plan.numberOfBoys ? `♂ ${plan.numberOfBoys}` : ''}
                  {plan.numberOfBoys && plan.numberOfGirls ? ' | ' : ''}
                  {plan.numberOfGirls ? `♀ ${plan.numberOfGirls}` : ''}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. Table 2: 8 Rows Objectives & Context Table */}
      <table className="w-full border-collapse border border-black text-left text-[7.5pt] mb-1.5 table-fixed">
        <tbody>
          {/* Row 1: Special Needs Learners */}
          <tr className="border-b border-black">
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'Type of special educational needs in this lesson and number of learners in each category'
                : langMode === 'fr'
                ? "Types de besoins éducatifs particuliers dans cette leçon et nombre d'apprenants"
                : langMode === 'bi'
                ? "Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye / Special Needs"
                : "Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye muri iri somo n'umubare wabo muri buri cyiciro"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.specialNeedsLearners || '—'}
            </td>
          </tr>

          {/* Row 2: Unit Topic / Inyigisho */}
          <tr className="border-b border-black">
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'Unit Title / Topic'
                : langMode === 'fr'
                ? "Titre de l'unité / Thème"
                : langMode === 'bi'
                ? "Umutwe w'isomo / Inyigisho (Unit Topic)"
                : "Umutwe w'isomo / Inyigisho"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.unitTopic || plan.unitTitle || '—'}
            </td>
          </tr>

          {/* Row 3: Key Unit Competence */}
          <tr className="border-b border-black">
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'Key Unit Competence'
                : langMode === 'fr'
                ? "Compétence clé de l'unité"
                : langMode === 'bi'
                ? "Ubushobozi bw'ingenzi bugamijwe ku mutwe / Key Competence"
                : "Ubushobozi bw'ingenzi bugamijwe ku mutwe"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.keyUnitCompetence || '—'}
            </td>
          </tr>

          {/* Row 4: Lesson Title */}
          <tr className="border-b border-black">
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'Lesson Title'
                : langMode === 'fr'
                ? 'Titre de la leçon'
                : langMode === 'bi'
                ? "Umutwe w'isomo / Lesson Title"
                : "Umutwe w'isomo"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top font-bold whitespace-pre-wrap break-words leading-tight">
              {plan.lessonTitle || '—'}
            </td>
          </tr>

          {/* Row 5: Instructional Objectives */}
          <tr className="border-b border-black">
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'Instructional Objectives'
                : langMode === 'fr'
                ? 'Objectifs pédagogiques'
                : langMode === 'bi'
                ? "Intego z'isomo / Instructional Objectives"
                : "Intego z'isomo"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.learningObjectives || '—'}
            </td>
          </tr>

          {/* Row 6: Location / Place */}
          <tr className="border-b border-black">
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'Plan for where the lesson takes place (Classroom / Lab / Field)'
                : langMode === 'fr'
                ? 'Lieu de déroulement de la leçon (Classe / Terrain / Laboratoire)'
                : langMode === 'bi'
                ? "Iteganyamwanya ry'aho isomo ribera / Location"
                : "Iteganyamwanya ry'aho isomo ribera (Aho ribera)"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.lessonLocation || '—'}
            </td>
          </tr>

          {/* Row 7: Teaching and Learning Materials */}
          <tr className="border-b border-black">
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'Teaching and Learning Materials'
                : langMode === 'fr'
                ? "Matériel didactique et d'apprentissage"
                : langMode === 'bi'
                ? "Ibikoresho by'isomo / Materials"
                : "Ibikoresho by'isomo"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.teachingMaterials || '—'}
            </td>
          </tr>

          {/* Row 8: References / Sources */}
          <tr>
            <td className="border border-black p-1 font-bold w-[28%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? 'References / Sources'
                : langMode === 'fr'
                ? 'Références / Sources'
                : langMode === 'bi'
                ? "Ibitabo byifashishijwe / References"
                : "Ibitabo byifashishijwe (Inkamoko)"}
            </td>
            <td className="border border-black p-1 w-[72%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.references || '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 5. Table 3: Main Steps Table (Timing | Teacher's Act | Learner's Act | Competences & Cross-Cutting) */}
      <table className="w-full border-collapse border border-black text-left text-[7.5pt] mb-1.5 table-fixed">
        <thead>
          {/* Header Row 1 */}
          <tr className="bg-slate-100 font-bold border-b border-black text-center">
            <th rowSpan={2} className="border border-black p-1 w-[15%] align-middle break-words">
              {langMode === 'en'
                ? 'Timing for each step'
                : langMode === 'fr'
                ? 'Étape et Durée'
                : langMode === 'bi'
                ? 'Igihe kuri buri cyiciro / Timing'
                : 'Igihe kuri buri cyiciro'}
            </th>
            <th colSpan={2} className="border border-black p-1 w-[58%] break-words">
              {langMode === 'en'
                ? 'Description of Teaching and Learning Activities'
                : langMode === 'fr'
                ? "Description des Activités d'Enseignement et d'Apprentissage"
                : langMode === 'bi'
                ? "Ubusobanuro bw'ibikorwa by'inyigire n'inyigishirize / Teaching & Learning Activities"
                : "Ubusobanuro bw'ibikorwa by'inyigire n'inyigishirize"}
            </th>
            <th rowSpan={2} className="border border-black p-1 w-[27%] align-middle break-words">
              {langMode === 'en'
                ? 'Generic Competences and Cross-Cutting Issues + Short Explanations'
                : langMode === 'fr'
                ? 'Compétences Génériques et Thèmes Transversaux + Brèves Explications'
                : langMode === 'bi'
                ? "Ubushobozi Rusange n'Insanganyamatsiko Zambukiranya Amasomo"
                : "Ubushobozi Rusange n'Insanganyamatsiko Zambukiranya Amasomo + Ibisobanuro Bigufi"}
            </th>
          </tr>

          {/* Header Row 2: Sub-headers for activities */}
          <tr className="bg-slate-50 font-bold border-b border-black text-center">
            <th className="border border-black p-1 w-[29%] break-words">
              {langMode === 'en'
                ? "Teacher's Activities"
                : langMode === 'fr'
                ? "Activités de l'Enseignant"
                : langMode === 'bi'
                ? "Ibikorwa by'umwarimu / Teacher"
                : "Ibikorwa by'umwarimu"}
            </th>
            <th className="border border-black p-1 w-[29%] break-words">
              {langMode === 'en'
                ? "Learner's Activities"
                : langMode === 'fr'
                ? "Activités de l'Apprenant"
                : langMode === 'bi'
                ? "Ibikorwa by'umunyeshuri / Learner"
                : "Ibikorwa by'umunyeshuri"}
            </th>
          </tr>
        </thead>

        <tbody>
          {plan.stages && plan.stages.length > 0 ? (
            plan.stages.map((stage, idx) => (
              <tr key={stage.id || idx} className="align-top border-b border-black">
                {/* Column 1: Stage and Time */}
                <td className="border border-black p-1 font-bold bg-slate-50/50 w-[15%] break-words">
                  <div>{stage.stageName || `Stage ${idx + 1}`}</div>
                  {stage.duration && (
                    <div className="font-normal text-[7pt] mt-0.5 text-slate-800">
                      ({stage.duration})
                    </div>
                  )}
                </td>

                {/* Column 2: Teacher's activities */}
                <td className="border border-black p-1 w-[29%] whitespace-pre-wrap break-words text-slate-900 leading-tight">
                  {stage.teacherActivities || '—'}
                </td>

                {/* Column 3: Learner's activities */}
                <td className="border border-black p-1 w-[29%] whitespace-pre-wrap break-words text-slate-900 leading-tight">
                  {stage.learnerActivities || '—'}
                </td>

                {/* Column 4: Generic competences & cross-cutting issues */}
                <td className="border border-black p-1 w-[27%] whitespace-pre-wrap break-words text-slate-900 leading-tight">
                  {stage.competencesAndCrossCutting ||
                    (stage.assessment || stage.materials
                      ? [
                          stage.materials ? `Materials: ${stage.materials}` : null,
                          stage.assessment ? `Assessment: ${stage.assessment}` : null
                        ]
                          .filter(Boolean)
                          .join('\n')
                      : '—')}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="border border-black p-2 text-center text-slate-500 italic">
                No stages added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 6. Table 4: Isuzuma mwarimu yikora (Teacher's Self-Assessment / Evaluation) */}
      <table className="w-full border-collapse border border-black text-left text-[7.5pt] mb-2 table-fixed">
        <tbody>
          <tr>
            <td className="border border-black p-1 font-bold w-[24%] bg-slate-100 align-top break-words">
              {langMode === 'en'
                ? "Teacher's Self-Assessment / Evaluation"
                : langMode === 'fr'
                ? "Auto-évaluation de l'Enseignant"
                : langMode === 'bi'
                ? 'Isuzuma mwarimu yikora / Self-Evaluation'
                : 'Isuzuma mwarimu yikora'}
            </td>
            <td className="border border-black p-1 w-[76%] align-top whitespace-pre-wrap break-words leading-tight">
              {plan.teacherSelfEvaluation ||
                plan.teacherReflection ||
                plan.assessmentSummary ||
                '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 7. Official Signatures, Approval & Stamp Section (NO promotional footer) */}
      <div className="w-full border border-black p-2 text-[7.5pt] avoid-break bg-white">
        <div className="grid grid-cols-2 gap-4">
          {/* Teacher Signature */}
          <div>
            <div className="font-bold text-black mb-1 uppercase tracking-wide">
              {langMode === 'en'
                ? "Teacher's Signature:"
                : langMode === 'fr'
                ? "Signature de l'Enseignant(e) :"
                : langMode === 'bi'
                ? "Umukono wa Mwarimu / Teacher's Signature:"
                : 'Umukono wa Mwarimu:'}
            </div>
            <div className="text-[7.5pt] text-slate-800 space-y-1">
              <div className="flex items-center">
                <span className="font-semibold w-24">
                  {langMode === 'en' ? 'Full Name:' : langMode === 'fr' ? 'Nom complet :' : 'Izina:'}
                </span>
                <span className="border-b border-black flex-1 pb-0.5 font-medium">
                  {teacherName || plan.teacherName || '___________________________'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold w-24">
                  {langMode === 'en' ? 'Date & Sign:' : langMode === 'fr' ? 'Date & Signature :' : "Itariki n'Umukono:"}
                </span>
                <span className="border-b border-black flex-1 pb-0.5">
                  ___________________________
                </span>
              </div>
            </div>
          </div>

          {/* School Leadership Approval */}
          <div>
            <div className="font-bold text-black mb-1 uppercase tracking-wide">
              {langMode === 'en'
                ? 'Dean of Studies / Headteacher Approval:'
                : langMode === 'fr'
                ? 'Visa du Directeur des Études / Préfet :'
                : langMode === 'bi'
                ? "Umuyobozi w'Amasomo / Ishuri:"
                : "Umuyobozi w'Amasomo / Ishuri:"}
            </div>
            <div className="text-[7.5pt] text-slate-800 space-y-1">
              <div className="flex items-center">
                <span className="font-semibold w-28">
                  {langMode === 'en' ? 'Name & Title:' : langMode === 'fr' ? 'Nom & Titre :' : "Izina n'Inshingano:"}
                </span>
                <span className="border-b border-black flex-1 pb-0.5">
                  ___________________________
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold w-28">
                  {langMode === 'en' ? 'Stamp & Sign:' : langMode === 'fr' ? 'Cachet & Signature :' : "Kashe n'Umukono:"}
                </span>
                <span className="border-b border-black flex-1 pb-0.5">
                  ___________________________
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrintLessonPlanModal: React.FC<PrintLessonPlanModalProps> = ({ plan, onClose }) => {
  const { language, t } = useLanguage();
  const [langMode, setLangMode] = useState<'rw' | 'bi' | 'en' | 'fr'>(language);
  
  // Requirement 1 & 2: Use A4 landscape orientation as default for Rwanda CBC multi-column tables
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Requirement 4: Editable School & Teacher Name with persistent preference storage
  const [customTeacherName, setCustomTeacherName] = useState<string>(() => {
    return plan.teacherName || localStorage.getItem(PREF_TEACHER_KEY) || '';
  });

  const [customSchoolName, setCustomSchoolName] = useState<string>(() => {
    return plan.schoolName || localStorage.getItem(PREF_SCHOOL_KEY) || 'GS GITUMBA';
  });

  const [teacherSaved, setTeacherSaved] = useState(false);
  const [schoolSaved, setSchoolSaved] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Auto-save teacher name preference
  const handleTeacherNameChange = (name: string) => {
    setCustomTeacherName(name);
    try {
      localStorage.setItem(PREF_TEACHER_KEY, name);
      setTeacherSaved(true);
      setTimeout(() => setTeacherSaved(false), 2000);
    } catch {
      // storage unavailable
    }
  };

  // Auto-save school name preference
  const handleSchoolNameChange = (school: string) => {
    setCustomSchoolName(school);
    try {
      localStorage.setItem(PREF_SCHOOL_KEY, school);
      setSchoolSaved(true);
      setTimeout(() => setSchoolSaved(false), 2000);
    } catch {
      // storage unavailable
    }
  };

  const getCleanDocumentTitle = () => {
    const teacherClean = (customTeacherName || plan.teacherName || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const subjectClean = (plan.subject || 'Lesson_Plan').replace(/[^a-zA-Z0-9_-]/g, '_');
    const classClean = (plan.classGrade || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const titleClean = (plan.lessonTitle || '').substring(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `Rwanda_CBC_${classClean ? classClean + '_' : ''}${subjectClean}${titleClean ? '_' + titleClean : ''}${teacherClean ? '_' + teacherClean : ''}`;
  };

  /**
   * Generates a completely isolated standalone HTML document string.
   * This guarantees 100% freedom from website styles, navigation, or parent layouts.
   */
  const buildStandaloneHtml = (elementHtml: string, title: string, pageOrientation: 'landscape' | 'portrait') => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @page {
      size: A4 ${pageOrientation};
      margin: 6mm 8mm 6mm 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Times New Roman', Times, Georgia, serif !important;
      font-size: 7.5pt !important;
      line-height: 1.2 !important;
      width: 100% !important;
    }
    .rwanda-cbc-document {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      box-sizing: border-box !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      margin-bottom: 1.5mm !important;
      page-break-inside: auto !important;
    }
    th, td {
      border: 1px solid #000000 !important;
      padding: 2.5px 4.5px !important;
      font-size: 7.5pt !important;
      line-height: 1.18 !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
      vertical-align: top !important;
      box-sizing: border-box !important;
      color: #000000 !important;
    }
    th {
      background-color: #f1f5f9 !important;
      font-weight: bold !important;
    }
    thead {
      display: table-header-group !important;
    }
    tfoot {
      display: table-footer-group !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .avoid-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  </style>
</head>
<body>
  ${elementHtml}
</body>
</html>`;
  };

  /**
   * Primary Print / PDF Export Method:
   * Uses an isolated hidden iframe to completely disconnect the print job from the website DOM.
   * Eliminates all website elements, duplicate pages, and side clipping.
   */
  const handlePrint = () => {
    const docTitle = getCleanDocumentTitle();
    const portalElement = document.getElementById('rwanda-cbc-print-portal');
    const sourceElement = portalElement || previewContainerRef.current;

    if (!sourceElement) {
      window.print();
      return;
    }

    try {
      // Remove any existing print frame
      const oldFrame = document.getElementById('rwanda-cbc-print-frame');
      if (oldFrame && oldFrame.parentNode) {
        oldFrame.parentNode.removeChild(oldFrame);
      }

      // Create a fresh isolated hidden iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'rwanda-cbc-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        throw new Error('Frame document unavailable');
      }

      const fullHtml = buildStandaloneHtml(sourceElement.innerHTML, docTitle, orientation);

      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 3000);
        }
      }, 350);

    } catch {
      // Fallback: standard window.print with index.css portal isolation
      const originalTitle = document.title;
      document.title = docTitle;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1500);
    }
  };

  /**
   * Standalone Offline Export:
   * Downloads a self-contained .html file containing the exact formatted lesson plan.
   * Can be opened and printed from any phone, USB drive, or computer anytime.
   */
  const handleDownloadOfflineFile = () => {
    const docTitle = getCleanDocumentTitle();
    const portalElement = document.getElementById('rwanda-cbc-print-portal');
    const sourceElement = portalElement || previewContainerRef.current;
    if (!sourceElement) return;

    const fullHtml = buildStandaloneHtml(sourceElement.innerHTML, docTitle, orientation);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <>
      {/* 
        PRINT PORTAL:
        Rendered directly into document.body.
        Used as the exact clean source for iframe printing and fallback window.print.
      */}
      {createPortal(
        <div id="rwanda-cbc-print-portal">
          <LessonPlanDocument
            plan={plan}
            langMode={langMode}
            schoolName={customSchoolName}
            teacherName={customTeacherName}
            id="print-portal-document"
          />
        </div>,
        document.body
      )}

      {/* Dynamic @page media style reflecting current orientation selection */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 6mm 8mm 6mm 8mm;
          }
        }
      `}</style>

      {/* Interactive Modal Backdrop (Screen Mode Only) */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:p-6 no-print">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden my-2 border border-slate-200 flex flex-col max-h-[95vh]">
          
          {/* 1. Control Toolbar */}
          <div className="no-print bg-slate-900 text-white px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-teal-400" />
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {t.printModalTitle}
                </h2>
                <p className="text-[10px] text-slate-400">
                  {t.printModalSubtext}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Orientation Toggle (Default: Landscape) */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer text-xs ${
                    orientation === 'landscape'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Landscape: Recommended for Rwanda CBC multi-column tables"
                >
                  <Layout className="w-3.5 h-3.5 rotate-90" />
                  <span>Landscape (CBC)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                    orientation === 'portrait'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Portrait (Standard A4)"
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>Portrait</span>
                </button>
              </div>

              {/* Language Mode Toggle */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setLangMode('en')}
                  className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    langMode === 'en'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="English"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLangMode('rw')}
                  className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    langMode === 'rw'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Ikinyarwanda"
                >
                  RW
                </button>
                <button
                  type="button"
                  onClick={() => setLangMode('fr')}
                  className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    langMode === 'fr'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Français"
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setLangMode('bi')}
                  className={`px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    langMode === 'bi'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Bilingual Kinyarwanda / English"
                >
                  Bilingual
                </button>
              </div>

              {/* Download Standalone File (.html) Button */}
              <button
                type="button"
                onClick={handleDownloadOfflineFile}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Download standalone offline printable document file"
              >
                {downloadSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                )}
                <span className="hidden sm:inline">
                  {downloadSuccess ? 'Downloaded!' : 'Download (.html)'}
                </span>
              </button>

              {/* Primary Action: Print / Save PDF Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm cursor-pointer active:scale-98 transition-all"
                title="Print or Save as PDF using your browser dialog"
              >
                <Printer className="w-4 h-4" />
                <span>{t.printSavePdfBtn}</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                title={t.closePreview}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. Editable Teacher & School Header Settings Panel (Requirement 4) */}
          <div className="no-print bg-slate-50 border-b border-slate-200 px-3 sm:px-6 py-2.5 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 max-w-4xl">
              {/* Editable Teacher Name */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-teal-700" />
                    <span>Teacher's Full Name (for PDF Header & Signatures)</span>
                  </label>
                  {teacherSaved && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-0.5 animate-pulse">
                      <Check className="w-3 h-3" />
                      <span>Saved</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={customTeacherName}
                  onChange={(e) => handleTeacherNameChange(e.target.value)}
                  placeholder="Enter your name or teacher's full name..."
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 text-slate-900 shadow-2xs"
                />
                <p className="text-[9.5pt] text-slate-500 mt-0.5 leading-none">
                  Editable for yourself or another teacher. Saved automatically for all future exports.
                </p>
              </div>

              {/* Editable School Name */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                    <SchoolIcon className="w-3.5 h-3.5 text-teal-700" />
                    <span>School Name</span>
                  </label>
                  {schoolSaved && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-0.5 animate-pulse">
                      <Check className="w-3 h-3" />
                      <span>Saved</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={customSchoolName}
                  onChange={(e) => handleSchoolNameChange(e.target.value)}
                  placeholder="Enter school name (e.g. GS GITUMBA)..."
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 text-slate-900 shadow-2xs"
                />
                <p className="text-[9.5pt] text-slate-500 mt-0.5 leading-none">
                  Change school identification anytime. Saved automatically for all future exports.
                </p>
              </div>
            </div>
          </div>

          {/* 3. On-screen Interactive Document Preview */}
          <div className="p-2 sm:p-5 bg-slate-100 overflow-y-auto overflow-x-auto flex-1 flex justify-center">
            <div
              ref={previewContainerRef}
              className={`bg-white shadow-md border border-slate-300 my-auto transition-all ${
                orientation === 'landscape' ? 'w-full max-w-[1040px]' : 'w-full max-w-[820px]'
              }`}
            >
              <LessonPlanDocument
                plan={plan}
                langMode={langMode}
                schoolName={customSchoolName}
                teacherName={customTeacherName}
                id="preview-lesson-plan"
              />
            </div>
          </div>

          {/* 4. Bottom Quick Action Bar */}
          <div className="no-print bg-white px-3 sm:px-6 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-slate-700 text-xs">
                A4 {orientation === 'landscape' ? 'Landscape (Default • Official CBC Format)' : 'Portrait'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 text-xs">
                {plan.stages ? plan.stages.length : 0} teaching stages
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors font-medium cursor-pointer text-xs"
              >
                {t.closePreview}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-bold transition-all shadow-xs cursor-pointer active:scale-98 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t.printSavePdfBtn}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
