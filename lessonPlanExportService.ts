import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageOrientation,
  ShadingType,
  VerticalAlign
} from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LessonPlan } from '../types/lessonPlan';

export type ExportLangMode = 'en' | 'rw' | 'fr' | 'bi';

/**
 * Returns clean, localized labels for lesson plan tables based on selected language mode.
 */
export const getLessonPlanLabels = (langMode: ExportLangMode) => {
  switch (langMode) {
    case 'rw':
      return {
        school: 'Ishuri:',
        teacherName: 'Izina rya Mwarimu:',
        term: 'Igihembwe',
        date: 'Itariki',
        subject: 'Isomo',
        classGrade: 'Umwaka',
        unitNo: 'Umutwe No',
        lessonNo: 'Isomo No',
        duration: 'Igihe',
        classSize: 'Abanyeshuri',
        boys: '♂',
        girls: '♀',
        specialNeeds: "Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye muri iri somo n'umubare wabo muri buri cyiciro",
        unitTopic: "Umutwe w'isomo / Inyigisho",
        keyUnitCompetence: "Ubushobozi bw'ingenzi bugamijwe ku mutwe",
        lessonTitle: "Umutwe w'isomo",
        learningObjectives: "Intego z'isomo",
        lessonLocation: "Iteganyamwanya ry'aho isomo ribera (Aho ribera)",
        teachingMaterials: "Ibikoresho by'isomo",
        references: 'Ibitabo byifashishijwe (Inkamoko)',
        timing: 'Igihe kuri buri cyiciro',
        activitiesGroup: "Ubusobanuro bw'ibikorwa by'inyigire n'inyigishirize",
        teacherActivities: "Ibikorwa by'umwarimu",
        learnerActivities: "Ibikorwa by'umunyeshuri",
        competences: "Ubushobozi Rusange n'Insanganyamatsiko Zambukiranya Amasomo + Ibisobanuro Bigufi",
        selfEvaluation: 'Isuzuma mwarimu yikora'
      };
    case 'fr':
      return {
        school: 'École :',
        teacherName: "Nom de l'Enseignant(e) :",
        term: 'Trimestre',
        date: 'Date',
        subject: 'Matière',
        classGrade: 'Classe',
        unitNo: 'Unité N°',
        lessonNo: 'Leçon N°',
        duration: 'Durée',
        classSize: 'Apprenants',
        boys: '♂',
        girls: '♀',
        specialNeeds: "Types de besoins éducatifs particuliers dans cette leçon et nombre d'apprenants",
        unitTopic: "Titre de l'unité / Thème",
        keyUnitCompetence: "Compétence clé de l'unité",
        lessonTitle: 'Titre de la leçon',
        learningObjectives: 'Objectifs pédagogiques',
        lessonLocation: 'Lieu de déroulement de la leçon (Classe / Terrain / Laboratoire)',
        teachingMaterials: "Matériel didactique et d'apprentissage",
        references: 'Références / Sources',
        timing: 'Étape et Durée',
        activitiesGroup: "Description des Activités d'Enseignement et d'Apprentissage",
        teacherActivities: "Activités de l'Enseignant",
        learnerActivities: "Activités de l'Apprenant",
        competences: 'Compétences Génériques et Thèmes Transversaux + Brèves Explications',
        selfEvaluation: "Auto-évaluation de l'Enseignant"
      };
    case 'bi':
      return {
        school: 'School / Ishuri:',
        teacherName: "Teacher's Name / Izina rya Mwarimu:",
        term: 'Term / Igihembwe',
        date: 'Date / Itariki',
        subject: 'Subject / Isomo',
        classGrade: 'Class / Umwaka',
        unitNo: 'Unit / Umutwe',
        lessonNo: 'Lesson / Isomo',
        duration: 'Duration / Igihe',
        classSize: 'Learners / Abanyeshuri',
        boys: '♂',
        girls: '♀',
        specialNeeds: "Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye / Special Needs",
        unitTopic: "Umutwe w'isomo / Inyigisho (Unit Topic)",
        keyUnitCompetence: "Ubushobozi bw'ingenzi bugamijwe ku mutwe / Key Competence",
        lessonTitle: "Umutwe w'isomo / Lesson Title",
        learningObjectives: "Intego z'isomo / Instructional Objectives",
        lessonLocation: "Iteganyamwanya ry'aho isomo ribera / Location",
        teachingMaterials: "Ibikoresho by'isomo / Materials",
        references: 'Ibitabo byifashishijwe / References',
        timing: 'Igihe kuri buri cyiciro / Timing',
        activitiesGroup: "Ubusobanuro bw'ibikorwa by'inyigire n'inyigishirize / Teaching & Learning Activities",
        teacherActivities: "Ibikorwa by'umwarimu / Teacher's Activities",
        learnerActivities: "Ibikorwa by'umunyeshuri / Learner's Activities",
        competences: "Ubushobozi Rusange n'Insanganyamatsiko / Competences & Cross-Cutting Issues",
        selfEvaluation: 'Isuzuma mwarimu yikora / Self-Evaluation'
      };
    case 'en':
    default:
      return {
        school: 'School:',
        teacherName: "Teacher's Name:",
        term: 'Term',
        date: 'Date',
        subject: 'Subject',
        classGrade: 'Class',
        unitNo: 'Unit No',
        lessonNo: 'Lesson No',
        duration: 'Duration',
        classSize: 'Class Size',
        boys: '♂',
        girls: '♀',
        specialNeeds: 'Type of special educational needs in this lesson and number of learners in each category',
        unitTopic: 'Unit Title / Topic',
        keyUnitCompetence: 'Key Unit Competence',
        lessonTitle: 'Lesson Title',
        learningObjectives: 'Instructional Objectives',
        lessonLocation: 'Plan for where the lesson takes place (Classroom / Lab / Field)',
        teachingMaterials: 'Teaching and Learning Materials',
        references: 'References / Sources',
        timing: 'Timing for each step',
        activitiesGroup: 'Description of Teaching and Learning Activities',
        teacherActivities: "Teacher's Activities",
        learnerActivities: "Learner's Activities",
        competences: 'Generic Competences and Cross-Cutting Issues + Short Explanations',
        selfEvaluation: "Teacher's Self-Assessment / Evaluation"
      };
  }
};

/**
 * Standard table borders configuration for REB CBC tables.
 */
const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '000000'
};

const CELL_PADDING = {
  top: 70,
  bottom: 70,
  left: 90,
  right: 90
};

const HEADER_SHADING = {
  fill: 'F1F5F9',
  type: ShadingType.CLEAR
};

type AlignmentValue = (typeof AlignmentType)[keyof typeof AlignmentType];

/**
 * Creates a standard styled table cell with wrapping and clean formatting.
 */
const makeCell = (options: {
  text?: string | string[];
  widthDxa: number;
  bold?: boolean;
  align?: AlignmentValue;
  isHeader?: boolean;
  colSpan?: number;
  rowSpan?: number;
  fontSize?: number;
}): TableCell => {
  const {
    text = '',
    widthDxa,
    bold = false,
    align = AlignmentType.LEFT,
    isHeader = false,
    colSpan,
    rowSpan,
    fontSize = 15 // 7.5pt in half-points
  } = options;

  const textLines = Array.isArray(text) ? text : [text];
  const paragraphs = textLines.map(line => 
    new Paragraph({
      alignment: align,
      spacing: { before: 0, after: 0, line: 220 },
      children: [
        new TextRun({
          text: line,
          font: 'Times New Roman',
          size: fontSize,
          bold: bold || isHeader,
          color: '000000'
        })
      ]
    })
  );

  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    columnSpan: colSpan,
    rowSpan: rowSpan,
    shading: isHeader ? HEADER_SHADING : undefined,
    verticalAlign: VerticalAlign.TOP,
    margins: CELL_PADDING,
    borders: {
      top: TABLE_BORDER,
      bottom: TABLE_BORDER,
      left: TABLE_BORDER,
      right: TABLE_BORDER
    },
    children: paragraphs.length > 0 ? paragraphs : [new Paragraph({})]
  });
};

/**
 * Builds and downloads a Word (.docx) document formatted strictly in Portrait orientation.
 * Total printable width for A4 portrait with 0.5" (720 dxa) margins = 10466 dxa.
 * All text and columns are sized and styled so nothing is cut off or clipped.
 */
export const exportLessonPlanToWord = async (
  plan: LessonPlan,
  teacherName: string,
  schoolName: string,
  langMode: ExportLangMode,
  fileName: string
): Promise<void> => {
  const labels = getLessonPlanLabels(langMode);
  const TOTAL_WIDTH = 10466; // Total usable width in DXA for A4 portrait

  // 1. Top Identification Row: School on left, Teacher's Name on top-right
  const schoolDisplay = (schoolName || plan.schoolName || 'GS GITUMBA').trim();
  const teacherDisplay = (teacherName || plan.teacherName || '—').trim();

  const topIdentificationTable = new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: TABLE_BORDER,
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5233, type: WidthType.DXA },
            margins: { top: 40, bottom: 80, left: 40, right: 40 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: `${labels.school} `,
                    font: 'Times New Roman',
                    size: 17, // 8.5pt
                    bold: true
                  }),
                  new TextRun({
                    text: schoolDisplay.toUpperCase(),
                    font: 'Times New Roman',
                    size: 17,
                    bold: true
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 5233, type: WidthType.DXA },
            margins: { top: 40, bottom: 80, left: 40, right: 40 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: `${labels.teacherName} `,
                    font: 'Times New Roman',
                    size: 17, // 8.5pt
                    bold: true
                  }),
                  new TextRun({
                    text: teacherDisplay,
                    font: 'Times New Roman',
                    size: 17,
                    bold: true,
                    underline: {}
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // 2. Table 1: Official 8-column CBC metadata bar (Total = 10466 dxa)
  // Col widths: Term 1000, Date 1200, Subject 1800, Class 1100, Unit 1100, Lesson 1100, Duration 1266, Size 1900
  const t1ColWidths = [1000, 1200, 1800, 1100, 1100, 1100, 1266, 1900];
  
  let learnersBreakdown = '';
  if (plan.numberOfBoys || plan.numberOfGirls) {
    const parts = [];
    if (plan.numberOfBoys) parts.push(`♂ ${plan.numberOfBoys}`);
    if (plan.numberOfGirls) parts.push(`♀ ${plan.numberOfGirls}`);
    learnersBreakdown = parts.join(' | ');
  }

  const table1 = new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell({ text: labels.term, widthDxa: t1ColWidths[0], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.date, widthDxa: t1ColWidths[1], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.subject, widthDxa: t1ColWidths[2], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.classGrade, widthDxa: t1ColWidths[3], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.unitNo, widthDxa: t1ColWidths[4], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.lessonNo, widthDxa: t1ColWidths[5], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.duration, widthDxa: t1ColWidths[6], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.classSize, widthDxa: t1ColWidths[7], isHeader: true, align: AlignmentType.CENTER })
        ]
      }),
      new TableRow({
        children: [
          makeCell({ text: plan.term || '—', widthDxa: t1ColWidths[0], align: AlignmentType.CENTER }),
          makeCell({ text: plan.date || '—', widthDxa: t1ColWidths[1], align: AlignmentType.CENTER }),
          makeCell({ text: plan.subject || '—', widthDxa: t1ColWidths[2], bold: true, align: AlignmentType.CENTER }),
          makeCell({ text: plan.classGrade || '—', widthDxa: t1ColWidths[3], bold: true, align: AlignmentType.CENTER }),
          makeCell({ text: plan.unitNo || '—', widthDxa: t1ColWidths[4], align: AlignmentType.CENTER }),
          makeCell({ text: plan.lessonNo || '—', widthDxa: t1ColWidths[5], align: AlignmentType.CENTER }),
          makeCell({ text: plan.duration || '—', widthDxa: t1ColWidths[6], align: AlignmentType.CENTER }),
          makeCell({
            text: learnersBreakdown
              ? [plan.numberOfLearners ? `${plan.numberOfLearners}` : '—', learnersBreakdown]
              : `${plan.numberOfLearners || '—'}`,
            widthDxa: t1ColWidths[7],
            align: AlignmentType.CENTER
          })
        ]
      })
    ]
  });

  // 3. Table 2: 8 Rows Objectives & Context
  const t2LabelWidth = 2930;
  const t2ValueWidth = 7536;

  const contextRows = [
    { label: labels.specialNeeds, value: plan.specialNeedsLearners || '—' },
    { label: labels.unitTopic, value: plan.unitTopic || plan.unitTitle || '—' },
    { label: labels.keyUnitCompetence, value: plan.keyUnitCompetence || '—' },
    { label: labels.lessonTitle, value: plan.lessonTitle || '—', bold: true },
    { label: labels.learningObjectives, value: plan.learningObjectives || '—' },
    { label: labels.lessonLocation, value: plan.lessonLocation || '—' },
    { label: labels.teachingMaterials, value: plan.teachingMaterials || '—' },
    { label: labels.references, value: plan.references || '—' }
  ];

  const table2 = new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    rows: contextRows.map(row => 
      new TableRow({
        children: [
          makeCell({ text: row.label, widthDxa: t2LabelWidth, isHeader: true }),
          makeCell({ text: row.value, widthDxa: t2ValueWidth, bold: row.bold })
        ]
      })
    )
  });

  // 4. Table 3: Main Steps Table (Timing, Teacher Act, Learner Act, Competences)
  // Col widths: Timing 1650, Teacher 3033, Learner 3033, Competences 2750 = 10466
  const t3ColWidths = [1650, 3033, 3033, 2750];

  const stageRows: TableRow[] = (plan.stages && plan.stages.length > 0)
    ? plan.stages.map((stage, idx) => {
        const timeText = [
          stage.stageName || `Stage ${idx + 1}`,
          stage.duration ? `(${stage.duration})` : ''
        ].filter(Boolean);

        const compText = stage.competencesAndCrossCutting ||
          (stage.assessment || stage.materials
            ? [
                stage.materials ? `Materials: ${stage.materials}` : null,
                stage.assessment ? `Assessment: ${stage.assessment}` : null
              ].filter(Boolean).join('\n')
            : '—');

        return new TableRow({
          children: [
            makeCell({ text: timeText, widthDxa: t3ColWidths[0], bold: true, isHeader: true }),
            makeCell({ text: stage.teacherActivities || '—', widthDxa: t3ColWidths[1] }),
            makeCell({ text: stage.learnerActivities || '—', widthDxa: t3ColWidths[2] }),
            makeCell({ text: compText, widthDxa: t3ColWidths[3] })
          ]
        });
      })
    : [
        new TableRow({
          children: [
            makeCell({
              text: 'No stages added yet.',
              widthDxa: TOTAL_WIDTH,
              colSpan: 4,
              align: AlignmentType.CENTER
            })
          ]
        })
      ];

  const table3 = new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell({ text: labels.timing, widthDxa: t3ColWidths[0], isHeader: true, rowSpan: 2, align: AlignmentType.CENTER }),
          makeCell({ text: labels.activitiesGroup, widthDxa: t3ColWidths[1] + t3ColWidths[2], isHeader: true, colSpan: 2, align: AlignmentType.CENTER }),
          makeCell({ text: labels.competences, widthDxa: t3ColWidths[3], isHeader: true, rowSpan: 2, align: AlignmentType.CENTER })
        ]
      }),
      new TableRow({
        tableHeader: true,
        children: [
          makeCell({ text: labels.teacherActivities, widthDxa: t3ColWidths[1], isHeader: true, align: AlignmentType.CENTER }),
          makeCell({ text: labels.learnerActivities, widthDxa: t3ColWidths[2], isHeader: true, align: AlignmentType.CENTER })
        ]
      }),
      ...stageRows
    ]
  });

  // 5. Table 4: Teacher's Self-Assessment / Evaluation (Isuzuma mwarimu yikora)
  const evalValue = plan.teacherSelfEvaluation ||
    plan.teacherReflection ||
    plan.assessmentSummary ||
    '—';

  const table4 = new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          makeCell({ text: labels.selfEvaluation, widthDxa: 2500, isHeader: true }),
          makeCell({ text: evalValue, widthDxa: 7966 })
        ]
      })
    ]
  });

  // Spacing paragraphs between tables
  const spacer = () => new Paragraph({ spacing: { before: 80, after: 80 } });

  // Document Assembly - Portrait orientation, 0.5" margins
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              width: 11906, // A4 Portrait width
              height: 16838 // A4 Portrait height
            },
            margin: {
              top: 720,    // 0.5 inch (36pt)
              bottom: 720, // 0.5 inch (36pt)
              left: 720,   // 0.5 inch (36pt)
              right: 720   // 0.5 inch (36pt)
            }
          }
        },
        children: [
          topIdentificationTable,
          spacer(),
          table1,
          spacer(),
          table2,
          spacer(),
          table3,
          spacer(),
          table4
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports the rendered lesson plan element directly into a high-quality PDF.
 */
export const exportLessonPlanToPdf = async (
  element: HTMLElement,
  fileName: string,
  orientation: 'landscape' | 'portrait' = 'portrait'
): Promise<void> => {
  // Capture high-resolution raster of document
  const canvas = await html2canvas(element, {
    scale: 2.2, // High DPI for crisp text
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdf = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pdfPageWidth = orientation === 'landscape' ? 297 : 210;
  const pdfPageHeight = orientation === 'landscape' ? 210 : 297;
  const marginMm = 6;
  const printableWidth = pdfPageWidth - marginMm * 2;
  const printableHeight = pdfPageHeight - marginMm * 2;

  const imgWidth = printableWidth;
  const imgHeight = (canvas.height * printableWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = marginMm;

  // Page 1
  pdf.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight);
  heightLeft -= printableHeight;

  // Multi-page handling if table spans multiple pages
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + marginMm;
    pdf.addPage('a4', orientation);
    pdf.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;
  }

  pdf.save(`${fileName}.pdf`);
};
