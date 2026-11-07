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
        className="w-10 h-3 mx-auto rounded-full shadow-2xs border border-black/20"
        style={{
          width: '38px',
          height: '11px',
          margin: '0 auto',
          borderRadius: '9999px',
          backgroundColor: colorHex,
          border: '1px solid rgba(0, 0, 0, 0.25)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          display: 'block'
        }}
        title={PERFORMANCE_LEGEND[level]?.label || ''}
      />
    );
  };

  return (
    <div 
      className={`nursery-report-page bg-white text-slate-900 font-sans select-text ${
        isPrintMode ? 'p-4 w-full max-w-none' : 'p-5 sm:p-6 max-w-[800px] mx-auto shadow-md border border-slate-200 rounded-lg'
      }`}
      style={{
        pageBreakAfter: 'always',
        breakAfter: 'page',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontSize: '10px',
        lineHeight: 1.25
      }}
    >
      {/* 1. HEADER SECTION (Logo, School Details, QR Code) */}
      <div 
        className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-2.5"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '8px'
        }}
      >
        {/* Left: School Logo (Strictly bounded 64x64px box, object-fit: contain) */}
        <div 
          className="school-logo-container shrink-0 flex items-center justify-center bg-white rounded-lg border border-slate-200 p-0.5"
          style={{
            width: '64px',
            height: '64px',
            minWidth: '64px',
            maxWidth: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '2px'
          }}
        >
          {schoolInfo.logoUrl ? (
            <img 
              src={schoolInfo.logoUrl} 
              alt={schoolDisplayName} 
              className="school-logo-img"
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '60px',
                maxHeight: '60px',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block'
              }}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div 
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '60px',
                maxHeight: '60px',
                borderRadius: '50%',
                backgroundColor: '#0d3b66',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #f59e0b',
                padding: '2px',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1 }}>
                {schoolDisplayName.substring(0, 10)}
              </span>
              <span style={{ fontSize: '6.5px', color: '#fcd34d' }}>EST. 1996</span>
            </div>
          )}
        </div>

        {/* Center: School Institutional Metadata */}
        <div 
          className="flex-1 min-w-0 px-2 space-y-0.5" 
          style={{ flex: '1 1 0%', minWidth: 0, padding: '0 8px' }}
        >
          <h1 
            className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-none"
            style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0', lineHeight: 1.15 }}
          >
            {schoolDisplayName}
          </h1>

          <p className="text-[10px] text-slate-800" style={{ fontSize: '9.5px', color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
            District: <span className="font-semibold">{schoolInfo.district || '______'}</span> | Sector: <span className="font-semibold">{schoolInfo.sector || '______'}</span> | Cell: <span className="font-semibold">{schoolInfo.cell || '______'}</span> | Village: <span className="font-semibold">{schoolInfo.village || '______'}</span>
          </p>

          <p 
            className="text-[10px] text-slate-800 font-bold uppercase tracking-wide"
            style={{ fontSize: '9.5px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', margin: '2px 0', lineHeight: 1.2 }}
          >
            Academic Year: {effectiveAcademicYear} | ANNUAL PROGRESS REPORT
          </p>

          <p className="text-[10px] text-slate-800" style={{ fontSize: '9.5px', color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
            Head Teacher: <span className="font-semibold">{schoolInfo.headTeacherName || '______'}</span> | Tel: <span className="font-semibold">{schoolInfo.headTeacherPhone || '______'}</span>
          </p>
        </div>

        {/* Right: Verification QR code (Strictly bounded) */}
        <div 
          className="shrink-0 p-0.5 border border-slate-300 bg-white"
          style={{
            width: '64px',
            height: '64px',
            minWidth: '64px',
            maxWidth: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            padding: '2px'
          }}
        >
          <SimpleQrCode size={58} />
        </div>
      </div>

      {/* 2. STUDENT REPORT CARD IDENTIFICATION BOX */}
      <div 
        className="mt-2 flex items-start justify-between border-b border-slate-300 pb-2"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid #cbd5e1',
          paddingTop: '6px',
          paddingBottom: '6px'
        }}
      >
        <div className="space-y-0.5">
          <h2 
            className="text-xs font-extrabold uppercase tracking-wide text-slate-900"
            style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', margin: '0 0 2px 0' }}
          >
            STUDENT REPORT CARD
          </h2>

          <div className="space-y-0.5 text-xs text-slate-800" style={{ fontSize: '10px', color: '#1e293b' }}>
            <p style={{ margin: '1px 0' }}>
              <span className="text-slate-600 font-medium">Full Name: </span>
              <span className="font-bold text-slate-950 uppercase" style={{ fontWeight: 800, color: '#020617' }}>{student.fullName || '—'}</span>
            </p>
            <p style={{ margin: '1px 0' }}>
              <span className="text-slate-600 font-medium">Class: </span>
              <span className="font-bold text-slate-950 uppercase" style={{ fontWeight: 800, color: '#020617' }}>{student.classGrade || 'N1'}</span>
            </p>
            <p style={{ margin: '1px 0' }}>
              <span className="text-slate-600 font-medium">Gender: </span>
              <span className="font-bold text-slate-950" style={{ fontWeight: 800, color: '#020617' }}>{student.gender || '—'}</span>
            </p>
            {student.registrationNumber && (
              <p className="text-[9px] text-slate-500 font-mono" style={{ fontSize: '9px', color: '#64748b', margin: '1px 0', fontFamily: 'monospace' }}>
                Reg No: {student.registrationNumber}
              </p>
            )}
          </div>
        </div>

        {/* Student Photo Box (Strictly bounded) */}
        <div 
          className="border border-slate-300 bg-slate-50 flex items-center justify-center text-center p-0.5 shrink-0 overflow-hidden"
          style={{
            width: '64px',
            height: '64px',
            minWidth: '64px',
            maxWidth: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            boxSizing: 'border-box',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
            flexShrink: 0
          }}
        >
          {student.photoUrl ? (
            <img 
              src={student.photoUrl} 
              alt={student.fullName} 
              className="w-full h-full object-cover" 
              style={{ width: '100%', height: '100%', maxWidth: '60px', maxHeight: '60px', objectFit: 'cover', display: 'block' }}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[10px] text-slate-400 font-semibold select-none" style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>
              No Photo
            </span>
          )}
        </div>
      </div>

      {/* 3. PERFORMANCE LEGEND */}
      <div 
        className="mt-2 mb-1.5"
        style={{ marginTop: '6px', marginBottom: '6px' }}
      >
        <p 
          className="text-[9.5px] font-extrabold uppercase text-slate-900 mb-1 tracking-wider"
          style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', margin: '0 0 3px 0', letterSpacing: '0.05em' }}
        >
          PERFORMANCE LEGEND:
        </p>
        <div 
          className="flex flex-wrap items-center gap-3 text-[9.5px] font-medium text-slate-800"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '9.5px', color: '#1e293b' }}
        >
          <div className="flex items-center space-x-1.5" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ width: '18px', height: '9px', display: 'inline-block', borderRadius: '2px', backgroundColor: '#48bb78', border: '1px solid rgba(0,0,0,0.2)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Excellent</span>
          </div>
          <div className="flex items-center space-x-1.5" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ width: '18px', height: '9px', display: 'inline-block', borderRadius: '2px', backgroundColor: '#3182ce', border: '1px solid rgba(0,0,0,0.2)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Very Good</span>
          </div>
          <div className="flex items-center space-x-1.5" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ width: '18px', height: '9px', display: 'inline-block', borderRadius: '2px', backgroundColor: '#ecc94b', border: '1px solid rgba(0,0,0,0.2)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Developing</span>
          </div>
          <div className="flex items-center space-x-1.5" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span 
              className="w-5 h-2.5 inline-block rounded-2xs border border-black/20" 
              style={{ width: '18px', height: '9px', display: 'inline-block', borderRadius: '2px', backgroundColor: '#e53e3e', border: '1px solid rgba(0,0,0,0.2)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} 
            />
            <span>Needs Improvement</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN ASSESSMENT TABLE (IBYIGWA N'IMYITWARIRE) */}
      <div 
        className="border-t border-l border-slate-900"
        style={{ borderTop: '1px solid #0f172a', borderLeft: '1px solid #0f172a' }}
      >
        <table 
          className="w-full border-collapse text-[9.5px]"
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', tableLayout: 'fixed' }}
        >
          <thead>
            <tr 
              className="bg-slate-100 font-bold text-slate-900" 
              style={{ backgroundColor: '#f1f5f9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <th 
                className="border-r border-b border-slate-900 py-0.5 px-2 text-left uppercase w-[58%]"
                style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 6px', textAlign: 'left', textTransform: 'uppercase', width: '58%' }}
              >
                IBYIGWA N'IMYITWARIRE
              </th>
              <th 
                className="border-r border-b border-slate-900 py-0.5 px-1 text-center uppercase w-[14%]"
                style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 4px', textAlign: 'center', textTransform: 'uppercase', width: '14%' }}
              >
                TERM 1
              </th>
              <th 
                className="border-r border-b border-slate-900 py-0.5 px-1 text-center uppercase w-[14%]"
                style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 4px', textAlign: 'center', textTransform: 'uppercase', width: '14%' }}
              >
                TERM 2
              </th>
              <th 
                className="border-r border-b border-slate-900 py-0.5 px-1 text-center uppercase w-[14%]"
                style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 4px', textAlign: 'center', textTransform: 'uppercase', width: '14%' }}
              >
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
                    <tr 
                      className="bg-slate-50 font-bold text-slate-900 uppercase" 
                      style={{ backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      <td 
                        className="border-r border-b border-slate-900 py-0.5 px-2 font-bold text-[9.5px]"
                        style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 6px', fontWeight: 700, fontSize: '9.5px' }}
                      >
                        {criterion.sectionTitle}
                      </td>
                      <td 
                        className="border-r border-b border-slate-900 py-0.5 px-1 text-center font-mono text-[9px] text-slate-400"
                        style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', color: '#94a3b8' }}
                      >
                        -
                      </td>
                      <td 
                        className="border-r border-b border-slate-900 py-0.5 px-1 text-center font-mono text-[9px] text-slate-400"
                        style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', color: '#94a3b8' }}
                      >
                        -
                      </td>
                      <td 
                        className="border-r border-b border-slate-900 py-0.5 px-1 text-center font-mono text-[9px] text-slate-400"
                        style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '2px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', color: '#94a3b8' }}
                      >
                        -
                      </td>
                    </tr>
                  )}

                  <tr className="hover:bg-slate-50/60" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td 
                      className={`border-r border-b border-slate-900 py-0.5 px-2 ${
                        isCoreBold ? 'font-bold uppercase text-slate-950' : 'text-slate-800'
                      }`}
                      style={{ 
                        borderRight: '1px solid #0f172a', 
                        borderBottom: '1px solid #0f172a', 
                        padding: '1.5px 6px',
                        fontWeight: isCoreBold ? 700 : 400,
                        textTransform: isCoreBold ? 'uppercase' : 'none',
                        color: isCoreBold ? '#020617' : '#1e293b'
                      }}
                    >
                      {criterion.number}. {criterion.label}
                    </td>
                    <td 
                      className="border-r border-b border-slate-900 py-0.5 px-1 text-center align-middle"
                      style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '1.5px 4px', textAlign: 'center', verticalAlign: 'middle' }}
                    >
                      {renderScoreCapsule(t1Val)}
                    </td>
                    <td 
                      className="border-r border-b border-slate-900 py-0.5 px-1 text-center align-middle"
                      style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '1.5px 4px', textAlign: 'center', verticalAlign: 'middle' }}
                    >
                      {renderScoreCapsule(t2Val)}
                    </td>
                    <td 
                      className="border-r border-b border-slate-900 py-0.5 px-1 text-center align-middle"
                      style={{ borderRight: '1px solid #0f172a', borderBottom: '1px solid #0f172a', padding: '1.5px 4px', textAlign: 'center', verticalAlign: 'middle' }}
                    >
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
      <div 
        className="mt-3 flex items-end justify-end"
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', marginTop: '8px' }}
      >
        <div 
          className="text-right space-y-0.5 text-xs text-slate-800 min-w-[200px]"
          style={{ textAlign: 'right', minWidth: '190px' }}
        >
          <p className="font-semibold text-slate-900" style={{ fontSize: '10.5px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>
            Head Teacher: <span className="font-normal" style={{ fontWeight: 400 }}>{schoolInfo.headTeacherName || '...'}</span>
          </p>
          <p className="text-[10px] text-slate-600 italic pt-0.5" style={{ fontSize: '9.5px', color: '#475569', fontStyle: 'italic', margin: 0 }}>
            Signature and Stamp
          </p>
          <div 
            className="h-8 border-b border-dotted border-slate-400 w-36 ml-auto"
            style={{ height: '24px', borderBottom: '1px dotted #94a3b8', width: '130px', marginLeft: 'auto' }} 
          />
        </div>
      </div>

      {/* 6. SYSTEM WATERMARK TIMESTAMP */}
      <div 
        className="mt-2.5 pt-1.5 border-t border-slate-200 text-[8.5px] text-slate-500 font-mono flex items-center justify-between"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          marginTop: '8px',
          paddingTop: '4px',
          fontSize: '8.5px',
          color: '#64748b',
          fontFamily: 'monospace'
        }}
      >
        <span>
          Downloaded by {schoolDisplayName} APP on {displayTimestamp}
        </span>
        <span className="text-[8px] uppercase tracking-wider text-slate-400" style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
          Official Early Childhood CBC Evaluation
        </span>
      </div>
    </div>
  );
};
