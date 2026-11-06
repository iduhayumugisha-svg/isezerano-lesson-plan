import React from 'react';
import { 
  NurseryStudent, 
  StudentTermAssessment, 
  NurserySchoolInfo, 
  NURSERY_ASSESSMENT_CRITERIA, 
  PERFORMANCE_LEGEND,
  PerformanceLevel
} from '../types/nurseryReport';

interface NurseryReportCardDocumentProps {
  student: NurseryStudent;
  schoolInfo: NurserySchoolInfo;
  assessment?: StudentTermAssessment | null;
  downloadTimestamp?: string;
  isPrintMode?: boolean;
}

/**
 * Visual QR Code representation (SVG vector based)
 */
const SimpleQrCode: React.FC<{ size?: number }> = ({ size = 68 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect width="100" height="100" fill="white" />
      {/* Top-left corner box */}
      <rect x="6" y="6" width="28" height="28" stroke="black" strokeWidth="4" fill="white" />
      <rect x="14" y="14" width="12" height="12" fill="black" />
      {/* Top-right corner box */}
      <rect x="66" y="6" width="28" height="28" stroke="black" strokeWidth="4" fill="white" />
      <rect x="74" y="14" width="12" height="12" fill="black" />
      {/* Bottom-left corner box */}
      <rect x="6" y="66" width="28" height="28" stroke="black" strokeWidth="4" fill="white" />
      <rect x="14" y="74" width="12" height="12" fill="black" />
      {/* Alignment & data pattern blocks */}
      <rect x="42" y="10" width="6" height="6" fill="black" />
      <rect x="52" y="10" width="6" height="6" fill="black" />
      <rect x="42" y="24" width="6" height="6" fill="black" />
      <rect x="48" y="32" width="6" height="6" fill="black" />
      <rect x="10" y="42" width="6" height="6" fill="black" />
      <rect x="24" y="48" width="6" height="6" fill="black" />
      <rect x="36" y="44" width="6" height="6" fill="black" />
      <rect x="44" y="44" width="12" height="12" fill="black" />
      <rect x="62" y="42" width="6" height="6" fill="black" />
      <rect x="76" y="46" width="6" height="6" fill="black" />
      <rect x="88" y="42" width="6" height="6" fill="black" />
      <rect x="42" y="62" width="6" height="6" fill="black" />
      <rect x="54" y="68" width="6" height="6" fill="black" />
      <rect x="68" y="62" width="8" height="8" fill="black" />
      <rect x="82" y="64" width="6" height="6" fill="black" />
      <rect x="44" y="78" width="6" height="6" fill="black" />
      <rect x="60" y="80" width="8" height="8" fill="black" />
      <rect x="76" y="78" width="6" height="6" fill="black" />
      <rect x="88" y="86" width="6" height="6" fill="black" />
      <rect x="48" y="88" width="6" height="6" fill="black" />
    </svg>
  );
};

export const NurseryReportCardDocument: React.FC<NurseryReportCardDocumentProps> = ({
  student,
  schoolInfo,
  assessment,
  downloadTimestamp,
  isPrintMode = false
}) => {
  // Format current timestamp if not supplied
  const now = new Date();
  const defaultTimestamp = `${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  const displayTimestamp = downloadTimestamp || defaultTimestamp;

  const schoolDisplayName = schoolInfo.schoolName?.trim() || 'School';
  const effectiveAcademicYear = schoolInfo.academicYear?.trim() || student.academicYear?.trim() || '2026';

  // Helper to render performance capsule in table cell
  const renderScoreCapsule = (level: PerformanceLevel | undefined) => {
    if (!level) {
      return <span className="text-slate-400 font-mono text-xs">-</span>;
    }

    let colorHex = '#cbd5e1';
    if (level === 'EXCELLENT') colorHex = '#48bb78'; // Vibrant green matching PDF
    if (level === 'VERY_GOOD') colorHex = '#3182ce'; // Clear blue matching PDF
    if (level === 'DEVELOPING') colorHex = '#ecc94b'; // Yellow matching PDF
    if (level === 'NEEDS_IMPROVEMENT') colorHex = '#e53e3e'; // Red matching PDF

    return (
      <div 
        className="w-11 h-3.5 mx-auto rounded-full shadow-2xs border border-black/20"
        style={{
          backgroundColor: colorHex,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
        title={PERFORMANCE_LEGEND[level]?.label || ''}
      />
    );
  };

  return (
    <div 
      className={`nursery-report-page bg-white text-slate-900 font-sans text-[11px] leading-tight select-text ${
        isPrintMode ? 'p-6 w-full max-w-none' : 'p-6 sm:p-8 max-w-[800px] mx-auto shadow-md border border-slate-200 rounded-lg'
      }`}
      style={{
        pageBreakAfter: 'always',
        breakAfter: 'page',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      {/* 1. HEADER SECTION (Logo, School Details, QR Code) */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-3">
        {/* Left: School Logo */}
        <div className="w-16 h-16 shrink-0 flex items-center justify-center">
          {schoolInfo.logoUrl ? (
            <img 
              src={schoolInfo.logoUrl} 
              alt={schoolDisplayName} 
              className="w-16 h-16 object-contain rounded-full border border-slate-300"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#0d3b66] text-white flex flex-col items-center justify-center border-2 border-amber-400 p-1 text-center shadow-xs">
              <span className="text-[9px] font-black tracking-tighter uppercase leading-tight">
                {schoolDisplayName.substring(0, 10)}
              </span>
              <span className="text-[7px] text-amber-300">EST. 1996</span>
            </div>
          )}
        </div>

        {/* Center: School Institutional Metadata */}
        <div className="flex-1 min-w-0 px-2 space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">
            {schoolDisplayName}
          </h1>

          <p className="text-[10px] text-slate-800">
            District: <span className="font-semibold">{schoolInfo.district || '______'}</span> | Sector: <span className="font-semibold">{schoolInfo.sector || '______'}</span> | Cell: <span className="font-semibold">{schoolInfo.cell || '______'}</span> | Village: <span className="font-semibold">{schoolInfo.village || '______'}</span>
          </p>

          <p className="text-[10px] text-slate-800 font-bold uppercase tracking-wide">
            Academic Year: {effectiveAcademicYear} | ANNUAL PROGRESS REPORT
          </p>

          <p className="text-[10px] text-slate-800">
            Head Teacher: <span className="font-semibold">{schoolInfo.headTeacherName || '______'}</span> | Tel: <span className="font-semibold">{schoolInfo.headTeacherPhone || '______'}</span>
          </p>
        </div>

        {/* Right: Verification QR code */}
        <div className="shrink-0 p-0.5 border border-slate-300 bg-white">
          <SimpleQrCode size={64} />
        </div>
      </div>

      {/* 2. STUDENT REPORT CARD IDENTIFICATION BOX */}
      <div className="mt-3 flex items-start justify-between border-b border-slate-300 pb-3">
        <div className="space-y-1">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
            STUDENT REPORT CARD
          </h2>

          <div className="space-y-0.5 text-xs text-slate-800">
            <p>
              <span className="text-slate-600 font-medium">Full Name: </span>
              <span className="font-bold text-slate-950 uppercase">{student.fullName || '—'}</span>
            </p>
            <p>
              <span className="text-slate-600 font-medium">Class: </span>
              <span className="font-bold text-slate-950 uppercase">{student.classGrade || 'N1'}</span>
            </p>
            <p>
              <span className="text-slate-600 font-medium">Gender: </span>
              <span className="font-bold text-slate-950">{student.gender || '—'}</span>
            </p>
            {student.registrationNumber && (
              <p className="text-[10px] text-slate-500 font-mono">
                Reg No: {student.registrationNumber}
              </p>
            )}
          </div>
        </div>

        {/* Student Photo Box */}
        <div className="w-20 h-20 border border-slate-300 bg-slate-50 flex items-center justify-center text-center p-1 shrink-0">
          {student.photoUrl ? (
            <img 
              src={student.photoUrl} 
              alt={student.fullName} 
              className="w-full h-full object-cover" 
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[11px] text-slate-400 font-semibold select-none">
              No Photo
            </span>
          )}
        </div>
      </div>

      {/* 3. PERFORMANCE LEGEND */}
      <div className="mt-2.5 mb-2">
        <p className="text-[10px] font-extrabold uppercase text-slate-900 mb-1 tracking-wider">
          PERFORMANCE LEGEND:
        </p>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-medium text-slate-800">
          <div className="flex items-center space-x-1.5">
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ backgroundColor: '#48bb78', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Excellent</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ backgroundColor: '#3182ce', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Very Good</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ backgroundColor: '#ecc94b', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Developing</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ backgroundColor: '#e53e3e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Needs Improvement</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN ASSESSMENT TABLE (IBYIGWA N'IMYITWARIRE) */}
      <div className="border-t border-l border-slate-900">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 font-bold text-slate-900" style={{ backgroundColor: '#f1f5f9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="border-r border-b border-slate-900 py-1 px-2 text-left uppercase w-[58%]">
                IBYIGWA N'IMYITWARIRE
              </th>
              <th className="border-r border-b border-slate-900 py-1 px-2 text-center uppercase w-[14%]">
                TERM 1
              </th>
              <th className="border-r border-b border-slate-900 py-1 px-2 text-center uppercase w-[14%]">
                TERM 2
              </th>
              <th className="border-r border-b border-slate-900 py-1 px-2 text-center uppercase w-[14%]">
                TERM 3
              </th>
            </tr>
          </thead>
          <tbody>
            {NURSERY_ASSESSMENT_CRITERIA.map((criterion, idx) => {
              // Check if we need to render a section header row before this criterion
              const showSectionHeader = criterion.sectionTitle !== undefined;
              
              const t1Val = assessment?.term1Scores?.[criterion.id];
              const t2Val = assessment?.term2Scores?.[criterion.id];
              const t3Val = assessment?.term3Scores?.[criterion.id];

              const isCoreBold = criterion.section === 'CORE';

              return (
                <React.Fragment key={criterion.id}>
                  {showSectionHeader && (
                    <tr className="bg-slate-50 font-bold text-slate-900 uppercase" style={{ backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td className="border-r border-b border-slate-900 py-0.5 px-2 font-bold text-[10px]">
                        {criterion.sectionTitle}
                      </td>
                      <td className="border-r border-b border-slate-900 py-0.5 px-1 text-center font-mono text-[9px] text-slate-400">
                        -
                      </td>
                      <td className="border-r border-b border-slate-900 py-0.5 px-1 text-center font-mono text-[9px] text-slate-400">
                        -
                      </td>
                      <td className="border-r border-b border-slate-900 py-0.5 px-1 text-center font-mono text-[9px] text-slate-400">
                        -
                      </td>
                    </tr>
                  )}

                  <tr className="hover:bg-slate-50/60">
                    <td className={`border-r border-b border-slate-900 py-0.5 px-2 ${
                      isCoreBold ? 'font-bold uppercase text-slate-950' : 'text-slate-800'
                    }`}>
                      {criterion.number}. {criterion.label}
                    </td>
                    <td className="border-r border-b border-slate-900 py-0.5 px-1 text-center align-middle">
                      {renderScoreCapsule(t1Val)}
                    </td>
                    <td className="border-r border-b border-slate-900 py-0.5 px-1 text-center align-middle">
                      {renderScoreCapsule(t2Val)}
                    </td>
                    <td className="border-r border-b border-slate-900 py-0.5 px-1 text-center align-middle">
                      {renderScoreCapsule(t3Val)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. FOOTER SIGNATURES */}
      <div className="mt-4 flex items-end justify-end">
        <div className="text-right space-y-0.5 text-xs text-slate-800 min-w-[200px]">
          <p className="font-semibold text-slate-900">
            Head Teacher: <span className="font-normal">{schoolInfo.headTeacherName || '...'}</span>
          </p>
          <p className="text-[11px] text-slate-600 italic pt-1">
            Signature and Stamp
          </p>
          <div className="h-9 border-b border-dotted border-slate-400 w-36 ml-auto" />
        </div>
      </div>

      {/* 6. SYSTEM WATERMARK TIMESTAMP (EXACT REPRODUCTION FROM TEMPLATE) */}
      <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] text-slate-500 font-mono flex items-center justify-between">
        <span>
          Downloaded by {schoolDisplayName} APP on {displayTimestamp}
        </span>
        <span className="text-[8px] uppercase tracking-wider text-slate-400">
          Official Early Childhood CBC Evaluation
        </span>
      </div>
    </div>
  );
};
