import React, { useState } from 'react';
import { LessonPlan } from '../types/lessonPlan';
import { Printer, X, FileText, Layout } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PrintLessonPlanModalProps {
  plan: LessonPlan;
  onClose: () => void;
}

export const PrintLessonPlanModal: React.FC<PrintLessonPlanModalProps> = ({ plan, onClose }) => {
  const { language, t } = useLanguage();
  const [langMode, setLangMode] = useState<'rw' | 'bi' | 'en' | 'fr'>(language);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const handlePrint = () => {
    const originalTitle = document.title;
    // Set a clean, professional filename for PDF saving without URL or tracking query parameters
    const subjectClean = (plan.subject || 'Lesson_Plan').replace(/[^a-zA-Z0-9_-]/g, '_');
    const classClean = (plan.classGrade || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const titleClean = (plan.lessonTitle || '').substring(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_');
    
    document.title = `Rwanda_CBC_${classClean ? classClean + '_' : ''}${subjectClean}${titleClean ? '_' + titleClean : ''}`;

    window.print();

    // Restore title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:p-6">
      {/* Injected style for precise A4 print orientation and 0-margin header/footer suppression */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 0;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden my-4 border border-slate-200">
        {/* Control Toolbar (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                {t.printModalTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {t.printModalSubtext}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t.portraitOption || 'Portrait (Standard A4)'}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={t.landscapeOption || 'Landscape (Wide Table)'}
              >
                <Layout className="w-3.5 h-3.5 rotate-90" />
                <span>Landscape</span>
              </button>
            </div>

            {/* Language Mode Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setLangMode('en')}
                className={`px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  langMode === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLangMode('rw')}
                className={`px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  langMode === 'rw'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Ikinyarwanda"
              >
                RW
              </button>
              <button
                type="button"
                onClick={() => setLangMode('fr')}
                className={`px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  langMode === 'fr'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Français"
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLangMode('bi')}
                className={`px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  langMode === 'bi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Bilingual Kinyarwanda / English"
              >
                Bilingual
              </button>
            </div>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm cursor-pointer active:scale-98 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printSavePdfBtn}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title={t.closePreview}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-3 sm:p-6 md:p-8 bg-slate-100 overflow-x-auto flex justify-center">
          <div
            id="printable-lesson-plan"
            className={`bg-white text-black p-6 sm:p-8 md:p-10 shadow-lg border border-slate-300 w-full text-xs leading-normal box-border ${
              orientation === 'landscape' ? 'max-w-[1100px]' : 'max-w-[850px]'
            }`}
            style={{
              fontFamily: "'Times New Roman', Times, Georgia, serif"
            }}
          >
            {/* Top Title: IMBATA Y'ISOMO / LESSON PLAN */}
            <div className="text-center mb-3">
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black">
                {langMode === 'rw' && "IMBATA Y'ISOMO"}
                {langMode === 'bi' && "IMBATA Y'ISOMO / LESSON PLAN"}
                {langMode === 'en' && "LESSON PLAN"}
                {langMode === 'fr' && "FICHE PÉDAGOGIQUE (IMBATA Y'ISOMO)"}
              </h1>
            </div>

            {/* Header Metadata Line: School Name & Class */}
            <div className="flex flex-wrap items-center justify-between text-xs font-bold border-b border-black pb-1.5 mb-2 gap-2">
              <div>
                <span>
                  {langMode === 'en'
                    ? 'School Name: '
                    : langMode === 'fr'
                    ? "Nom de l'École : "
                    : "Izina ry'Ishuri: "}
                </span>
                <span className="font-semibold">{plan.schoolName || '—'}</span>
              </div>
              <div className="text-right">
                {plan.classGrade && (
                  <span>
                    {langMode === 'en' ? 'Class: ' : langMode === 'fr' ? 'Classe : ' : 'Umwaka: '}
                    <span className="font-semibold">{plan.classGrade}</span>
                  </span>
                )}
                {plan.subject && (
                  <span className="ml-3 font-semibold">
                    • {plan.subject}
                  </span>
                )}
              </div>
            </div>

            {/* Table 1: 8-Column Metadata Bar */}
            <table className="w-full border-collapse border border-black text-center text-xs mb-3 table-fixed">
              <thead>
                <tr className="bg-slate-50 font-bold border-b border-black">
                  <th className="border border-black p-1.5 w-[10%] break-words">
                    {langMode === 'en'
                      ? 'Term'
                      : langMode === 'fr'
                      ? 'Trimestre'
                      : langMode === 'bi'
                      ? 'Term'
                      : 'Igihembwe'}
                  </th>
                  <th className="border border-black p-1.5 w-[13%] break-words">
                    {langMode === 'en'
                      ? 'Date'
                      : langMode === 'fr'
                      ? 'Date'
                      : langMode === 'bi'
                      ? 'Date'
                      : 'Itariki'}
                  </th>
                  <th className="border border-black p-1.5 w-[17%] break-words">
                    {langMode === 'en'
                      ? 'Subject'
                      : langMode === 'fr'
                      ? 'Matière'
                      : langMode === 'bi'
                      ? 'Subject'
                      : 'Isomo'}
                  </th>
                  <th className="border border-black p-1.5 w-[10%] break-words">
                    {langMode === 'en'
                      ? 'Class'
                      : langMode === 'fr'
                      ? 'Classe'
                      : langMode === 'bi'
                      ? 'Class'
                      : 'Umwaka'}
                  </th>
                  <th className="border border-black p-1.5 w-[11%] break-words">
                    {langMode === 'en'
                      ? 'Unit No'
                      : langMode === 'fr'
                      ? 'Unité N°'
                      : 'Umutwe No'}
                  </th>
                  <th className="border border-black p-1.5 w-[11%] break-words">
                    {langMode === 'en'
                      ? 'Lesson No'
                      : langMode === 'fr'
                      ? 'Leçon N°'
                      : 'Isomo No'}
                  </th>
                  <th className="border border-black p-1.5 w-[12%] break-words">
                    {langMode === 'en'
                      ? 'Duration'
                      : langMode === 'fr'
                      ? 'Durée'
                      : langMode === 'bi'
                      ? 'Time'
                      : 'Igihe'}
                  </th>
                  <th className="border border-black p-1.5 w-[16%] break-words">
                    {langMode === 'en'
                      ? 'Learners'
                      : langMode === 'fr'
                      ? "Apprenants"
                      : langMode === 'bi'
                      ? "Learners"
                      : "Abanyeshuri"}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">{plan.term || '—'}</td>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">{plan.date || '—'}</td>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">{plan.subject || '—'}</td>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">{plan.classGrade || '—'}</td>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">{plan.unitNo || '—'}</td>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">{plan.lessonNo || '—'}</td>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">{plan.duration || '—'}</td>
                  <td className="border border-black p-1.5 font-medium break-words align-middle">
                    {plan.numberOfLearners || '—'}
                    {plan.numberOfBoys && plan.numberOfGirls && (
                      <div className="text-[10px] text-slate-700 font-normal">
                        (♂{plan.numberOfBoys} | ♀{plan.numberOfGirls})
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Table 2: 8 Rows Objectives & Context Table */}
            <table className="w-full border-collapse border border-black text-left text-xs mb-3 table-fixed">
              <tbody>
                {/* Row 1: Special Needs Learners */}
                <tr className="border-b border-black">
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'Type of special educational needs in this lesson and number of learners in each category'
                      : langMode === 'fr'
                      ? "Types de besoins éducatifs particuliers dans cette leçon et nombre d'apprenants"
                      : langMode === 'bi'
                      ? "Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye / Special Needs"
                      : "Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye muri iri somo n'umubare wabo muri buri cyiciro"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.specialNeedsLearners || '—'}
                  </td>
                </tr>

                {/* Row 2: Unit Topic / Inyigisho */}
                <tr className="border-b border-black">
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'Unit Title / Topic'
                      : langMode === 'fr'
                      ? "Titre de l'unité / Thème"
                      : langMode === 'bi'
                      ? "Umutwe w'isomo / Inyigisho (Unit Topic)"
                      : "Umutwe w'isomo / Inyigisho"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.unitTopic || plan.unitTitle || '—'}
                  </td>
                </tr>

                {/* Row 3: Key Unit Competence */}
                <tr className="border-b border-black">
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'Key Unit Competence'
                      : langMode === 'fr'
                      ? "Compétence clé de l'unité"
                      : langMode === 'bi'
                      ? "Ubushobozi bw'ingenzi bugamijwe ku mutwe / Key Competence"
                      : "Ubushobozi bw'ingenzi bugamijwe ku mutwe"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.keyUnitCompetence || '—'}
                  </td>
                </tr>

                {/* Row 4: Lesson Title */}
                <tr className="border-b border-black">
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'Lesson Title'
                      : langMode === 'fr'
                      ? 'Titre de la leçon'
                      : langMode === 'bi'
                      ? "Umutwe w'isomo / Lesson Title"
                      : "Umutwe w'isomo"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top font-bold whitespace-pre-wrap break-words leading-relaxed">
                    {plan.lessonTitle || '—'}
                  </td>
                </tr>

                {/* Row 5: Instructional Objectives */}
                <tr className="border-b border-black">
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'Instructional Objectives'
                      : langMode === 'fr'
                      ? 'Objectifs pédagogiques'
                      : langMode === 'bi'
                      ? "Intego z'isomo / Instructional Objectives"
                      : "Intego z'isomo"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.learningObjectives || '—'}
                  </td>
                </tr>

                {/* Row 6: Location / Place */}
                <tr className="border-b border-black">
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'Plan for where the lesson takes place (Classroom / Lab / Ground)'
                      : langMode === 'fr'
                      ? 'Lieu de déroulement de la leçon (Classe / Terrain / Laboratoire)'
                      : langMode === 'bi'
                      ? "Iteganyamwanya ry'aho isomo ribera / Location"
                      : "Iteganyamwanya ry'aho isomo ribera (Aho ribera)"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.lessonLocation || '—'}
                  </td>
                </tr>

                {/* Row 7: Teaching and Learning Materials */}
                <tr className="border-b border-black">
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'Teaching and Learning Materials'
                      : langMode === 'fr'
                      ? "Matériel didactique et d'apprentissage"
                      : langMode === 'bi'
                      ? "Ibikoresho by'isomo / Materials"
                      : "Ibikoresho by'isomo"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.teachingMaterials || '—'}
                  </td>
                </tr>

                {/* Row 8: References / Sources */}
                <tr>
                  <td className="border border-black p-2 font-bold w-[32%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? 'References / Sources'
                      : langMode === 'fr'
                      ? 'Références / Sources'
                      : langMode === 'bi'
                      ? "Ibitabo byifashishijwe / References"
                      : "Ibitabo byifashishijwe (Inkamoko)"}
                  </td>
                  <td className="border border-black p-2 w-[68%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.references || '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Table 3: Main Steps Table */}
            <table className="w-full border-collapse border border-black text-left text-xs mb-3 table-fixed">
              <thead>
                {/* Header Row 1 */}
                <tr className="bg-slate-100 font-bold border-b border-black text-center">
                  <th rowSpan={2} className="border border-black p-2 w-[16%] align-middle break-words">
                    {langMode === 'en'
                      ? 'Timing for each step'
                      : langMode === 'fr'
                      ? 'Étape et Durée'
                      : langMode === 'bi'
                      ? 'Igihe kuri buri cyiciro / Timing'
                      : 'Igihe kuri buri cyiciro'}
                  </th>
                  <th colSpan={2} className="border border-black p-2 w-[56%] break-words">
                    {langMode === 'en'
                      ? 'Description of Teaching and Learning Activities'
                      : langMode === 'fr'
                      ? "Description des Activités d'Enseignement et d'Apprentissage"
                      : langMode === 'bi'
                      ? "Ubusobanuro bw'ibikorwa by'inyigire n'inyigishirize / Teaching & Learning Activities"
                      : "Ubusobanuro bw'ibikorwa by'inyigire n'inyigishirize"}
                  </th>
                  <th rowSpan={2} className="border border-black p-2 w-[28%] align-middle break-words">
                    {langMode === 'en'
                      ? 'Generic Competences and Cross-Cutting Issues + Short Explanations'
                      : langMode === 'fr'
                      ? 'Compétences Génériques et Thèmes Transversaux + Brèves Explications'
                      : langMode === 'bi'
                      ? "Ubushobozi Rusange n'Insanganyamatsiko Zambukiranya Amasomo"
                      : "Ubushobozi Rusange n'Insanganyamatsiko Zambukiranya Amasomo + Ibisobanuro Bigufi"}
                  </th>
                </tr>

                {/* Header Row 2 (Sub-headers for activities) */}
                <tr className="bg-slate-50 font-bold border-b border-black text-center">
                  <th className="border border-black p-2 w-[28%] break-words">
                    {langMode === 'en'
                      ? "Teacher's Activities"
                      : langMode === 'fr'
                      ? "Activités de l'Enseignant"
                      : langMode === 'bi'
                      ? "Ibikorwa by'umwarimu / Teacher"
                      : "Ibikorwa by'umwarimu"}
                  </th>
                  <th className="border border-black p-2 w-[28%] break-words">
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
                      <td className="border border-black p-2 font-bold bg-slate-50 w-[16%] break-words">
                        <div>{stage.stageName || `Stage ${idx + 1}`}</div>
                        {stage.duration && (
                          <div className="font-normal text-[11px] mt-0.5 text-slate-800">
                            ({stage.duration})
                          </div>
                        )}
                      </td>

                      {/* Column 2: Teacher's activities */}
                      <td className="border border-black p-2 w-[28%] whitespace-pre-wrap break-words text-slate-900 leading-relaxed">
                        {stage.teacherActivities || '—'}
                      </td>

                      {/* Column 3: Learner's activities */}
                      <td className="border border-black p-2 w-[28%] whitespace-pre-wrap break-words text-slate-900 leading-relaxed">
                        {stage.learnerActivities || '—'}
                      </td>

                      {/* Column 4: Generic competences & cross-cutting issues */}
                      <td className="border border-black p-2 w-[28%] whitespace-pre-wrap break-words text-slate-900 leading-relaxed">
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
                    <td colSpan={4} className="border border-black p-4 text-center text-slate-500 italic">
                      {t.noStagesPrint}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Bottom Row / Section: Isuzuma mwarimu yikora (Teacher's Self Evaluation) */}
            <table className="w-full border-collapse border border-black text-left text-xs mb-3 table-fixed">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold w-[28%] bg-slate-50 align-top break-words">
                    {langMode === 'en'
                      ? "Teacher's Self-Assessment / Evaluation"
                      : langMode === 'fr'
                      ? "Auto-évaluation de l'Enseignant"
                      : langMode === 'bi'
                      ? "Isuzuma mwarimu yikora / Self-Evaluation"
                      : "Isuzuma mwarimu yikora"}
                  </td>
                  <td className="border border-black p-2 w-[72%] align-top whitespace-pre-wrap break-words leading-relaxed">
                    {plan.teacherSelfEvaluation ||
                      plan.teacherReflection ||
                      plan.assessmentSummary ||
                      '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Official Rwanda CBC Footer Note */}
            <div className="pt-2 text-[10px] text-slate-600 flex justify-between items-center border-t border-slate-300">
              <span>Rwanda Competence-Based Curriculum (CBC) • MINEDUC / REB Official Pedagogical Format</span>
              <span>ISEZERANO Lesson Plan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
