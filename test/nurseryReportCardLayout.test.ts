/**
 * Automated Verification for Nursery Report Card School Information & Printed/PDF Layout
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NurseryReportCardDocument } from '../src/components/NurseryReportCardDocument';
import { NurseryStudent, NurserySchoolInfo, StudentTermAssessment } from '../src/types/nurseryReport';

const sampleStudent: NurseryStudent = {
  id: 'student_123',
  fullName: 'Mugisha Christian',
  classGrade: 'N1',
  gender: 'Boy',
  ownerUid: 'teacher_uid_1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const sampleSchoolInfo: NurserySchoolInfo = {
  schoolName: 'GS GITUMBA',
  district: 'Rulindo',
  sector: 'Buyoga',
  cell: 'Gitumba',
  village: 'Nyarubande',
  academicYear: '2026',
  headTeacherName: 'Kamanzi Jean Baptiste',
  headTeacherPhone: '+250 788 123 456',
  logoUrl: '',
  stampText: 'GS GITUMBA OFFICIAL STAMP'
};

const sampleAssessment: StudentTermAssessment = {
  id: 'assessment_123',
  studentId: 'student_123',
  academicYear: '2026',
  term1Scores: { c1: 'EXCELLENT', c2: 'VERY_GOOD' },
  term2Scores: {},
  term3Scores: {},
  ownerUid: 'teacher_uid_1',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

let passed = 0;
let failed = 0;

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
console.log('RUNNING NURSERY REPORT CARD LAYOUT & SCHOOL INFO AUDIT');
console.log('===========================================================');

// Render with authenticated user name
const html = renderToString(
  React.createElement(NurseryReportCardDocument, {
    student: sampleStudent,
    schoolInfo: sampleSchoolInfo,
    assessment: sampleAssessment,
    downloadedByName: 'Uwimana Marie'
  })
);

// 1. School Information Header Tests
assert(html.includes('REPUBLIC OF RWANDA'), 'Header displays REPUBLIC OF RWANDA');
assert(html.includes('GS GITUMBA'), 'Header displays School Name');
assert(html.includes('Rulindo'), 'Header displays District');
assert(html.includes('Buyoga'), 'Header displays Sector');
assert(html.includes('+250 788 123 456'), 'Header displays School Phone');

// Split document into header and footer parts
const tableIndex = html.indexOf('<table');
const headerHtml = html.substring(0, tableIndex);
const postTableHtml = html.substring(tableIndex);

assert(!headerHtml.includes('Kamanzi Jean Baptiste'), 'Head Teacher name is REMOVED from the school information header');
assert(!headerHtml.includes('Head Teacher:'), 'Head Teacher label is REMOVED from the school information header');

// 2. Removal of "Early Childhood CBC Evaluation"
assert(!html.includes('Early Childhood CBC Evaluation'), '"Early Childhood CBC Evaluation" is completely removed from entire document');

// 3. Downloaded By Section
assert(html.includes('Downloaded by:'), 'Document includes "Downloaded by:" label');
assert(html.includes('Uwimana Marie'), 'Document uses authenticated teacher profile name "Uwimana Marie"');
assert(!html.includes('Downloaded by GS GITUMBA APP'), 'Does not use obsolete "Downloaded by [School] APP"');

// Check position: Downloaded by must appear BEFORE the Stamp & Signature block and AFTER the table
const downloadAttributionIndex = postTableHtml.indexOf('download-attribution');
const stampBoxIndex = postTableHtml.indexOf('stamp-box');
assert(downloadAttributionIndex > 0, 'Downloaded by appears after marks table');
assert(downloadAttributionIndex < stampBoxIndex, 'Downloaded by appears directly below marks table before stamp area');

// 4. Head Teacher's name ONLY below the stamp area
const headTeacherInPostTable = postTableHtml.indexOf('Kamanzi Jean Baptiste');
assert(headTeacherInPostTable > stampBoxIndex, 'Head Teacher full name appears strictly below the stamp area');

// Check that Head Teacher name appears exactly once in the entire document
const headTeacherOccurrences = (html.match(/Kamanzi Jean Baptiste/g) || []).length;
assert(headTeacherOccurrences === 1, `Head Teacher name appears exactly once in the document (count: ${headTeacherOccurrences})`);

// 5. Graceful handling when authenticated user name is unavailable
const htmlNoName = renderToString(
  React.createElement(NurseryReportCardDocument, {
    student: sampleStudent,
    schoolInfo: sampleSchoolInfo,
    assessment: sampleAssessment,
    downloadedByName: null
  })
);
assert(!htmlNoName.includes('Downloaded by:'), 'When name is null, "Downloaded by:" is omitted gracefully without inventing a name');
assert(htmlNoName.includes('Downloaded on'), 'When name is null, displays "Downloaded on [timestamp]" cleanly');
assert(!htmlNoName.includes('twizerefelix90@gmail.com'), 'Does not invent admin email as downloader');

console.log('===========================================================');
console.log(`TOTAL AUDIT CHECKS: ${passed} PASSED, ${failed} FAILED`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
}
