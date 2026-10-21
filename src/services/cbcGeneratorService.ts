import { LessonPlan, LessonStage, EducationLevel } from '../types/lessonPlan';
import { 
  CBC_GENERIC_COMPETENCES, 
  CBC_CROSS_CUTTING_ISSUES, 
  CBC_RECOMMENDED_STAGES 
} from '../data/rwandaCbcData';

interface GenerateOptions {
  subject: string;
  classGrade: string;
  lessonTitle: string;
  unitTopic?: string;
  duration?: string;
  term?: string;
  educationLevel?: EducationLevel | '';
  language?: 'en' | 'rw' | 'fr';
}

/**
 * Intelligent deterministic Rwanda CBC Lesson Plan generator.
 * Produces official MINEDUC/REB compliant curriculum outlines
 * without requiring any paid API or external service.
 */
export function generateCbcLessonPlanOutline(options: GenerateOptions): Partial<LessonPlan> {
  const {
    subject = '',
    classGrade = '',
    lessonTitle = '',
    unitTopic = '',
    duration = '40 min',
    term = 'Term 1',
    educationLevel = '',
    language = 'en'
  } = options;

  const topicOrTitle = (lessonTitle || unitTopic || subject || 'Lesson').trim();
  const isKinyarwanda = language === 'rw' || subject.toLowerCase().includes('kinyarwanda');
  const isFrench = language === 'fr' || subject.toLowerCase().includes('français') || subject.toLowerCase().includes('francais');

  // Derive duration numbers
  const durationNum = parseInt(duration.replace(/\D/g, ''), 10) || 40;
  const introTime = Math.max(5, Math.round(durationNum * 0.15));
  const concTime = Math.max(5, Math.round(durationNum * 0.15));
  const devTime = Math.max(15, durationNum - introTime - concTime);

  // Pick suitable competences and cross-cutting issues
  const genericCompetences = [
    CBC_GENERIC_COMPETENCES[0], // Critical Thinking
    CBC_GENERIC_COMPETENCES[1], // Creativity and Innovation
    CBC_GENERIC_COMPETENCES[3], // Communication
    CBC_GENERIC_COMPETENCES[4]  // Cooperation
  ];

  const crossCuttingIssues = [
    CBC_CROSS_CUTTING_ISSUES[1], // Gender Education
    CBC_CROSS_CUTTING_ISSUES[2], // Inclusive Education
    CBC_CROSS_CUTTING_ISSUES[3]  // Environment and Sustainability
  ];

  // Learning Objectives (Bloom's Taxonomy aligned)
  let objectives = '';
  let keyCompetence = '';
  let materials = '';
  let references = '';
  let specialNeeds = '';
  let evaluation = '';

  if (isKinyarwanda) {
    keyCompetence = `Gushyira mu bikorwa ubumenyi n'ubushobozi bwerekeye ${topicOrTitle} mu buzima bwa buri munsi no gukemura ibibazo bijyanye nabyo.`;
    objectives = `Ku mpera z'iri somo, umunyeshuri azaba ashobora:\n` +
      `1. Ubumenyi: Gusobanura neza ibyerekeye ${topicOrTitle}.\n` +
      `2. Ubumenyingiro: Kugaragaza, gusesengura no gukoresha ubumenyi bwa ${topicOrTitle} mu gukora imyitozo.\n` +
      `3. Imyifatire n'indangagaciro: Kugaragaza umwete, ubufatanye no kubahana mu matsinda y'abanyeshuri.`;
    materials = `Igitabo cy'umunyeshuri, ikibaho, ingwa, amafoto cyangwa ibishushanyo bisobanura ${topicOrTitle}, n'ibikoresho bifatika (realia).`;
    references = `Integanyanyigisho y'u Rwanda (REB / MINEDUC), Igitabo cy'umwarimu n'icy'umunyeshuri, n'inkoranyamagambo.`;
    specialNeeds = `Abanyeshuri bafite intege nke mu gusoma no kwandika barahabwa ubufasha bwite no kwegerezwa bagenzi babo babafasha mu matsinda.`;
    evaluation = `Abanyeshuri hafi ya bose bageze ku ntego y'isomo. Bashoboye gusobanura neza ${topicOrTitle} no gukora imyitozo bahawe. Abanyeshuri bake bagize ingorane bazongera gufashwa mu myitozo yo gukomeza (remedial activities).`;
  } else if (isFrench) {
    keyCompetence = `Appliquer les compétences et concepts relatifs à "${topicOrTitle}" dans la résolution de problèmes du quotidien.`;
    objectives = `À la fin de cette leçon, l'apprenant doit être capable de :\n` +
      `1. Connaissances : Définir et expliquer clairement les notions de ${topicOrTitle}.\n` +
      `2. Savoir-faire : Analyser et résoudre avec précision les activités liées à ${topicOrTitle}.\n` +
      `3. Attitudes et valeurs : Faire preuve de collaboration, d'écoute active et de respect mutuel lors du travail en groupe.`;
    materials = `Manuel de l'élève, tableau noir, craie, fiches pédagogiques illustrées, matériel concret.`;
    references = `Programme national CBC (REB / MINEDUC), Guide de l'enseignant et livre de l'élève.`;
    specialNeeds = `Les apprenants ayant des difficultés d'apprentissage bénéficient d'un soutien personnalisé et sont intégrés au sein de groupes hétérogènes.`;
    evaluation = `La majorité des apprenants ont atteint les objectifs pédagogiques. Ils ont participé activement aux activités sur ${topicOrTitle}. Une remédiation ciblée sera proposée aux élèves en difficulté.`;
  } else {
    keyCompetence = `Apply foundational concepts and skills related to "${topicOrTitle}" in practical situations and problem-solving scenarios.`;
    objectives = `By the end of the lesson, learners will be able to:\n` +
      `1. Knowledge & Understanding: Correctly define, describe, and explain key concepts of ${topicOrTitle}.\n` +
      `2. Skills: Apply, analyze, and demonstrate the processes involved in ${topicOrTitle} through guided exercises.\n` +
      `3. Attitudes & Values: Demonstrate curiosity, active collaboration, teamwork, and respect for diversity during pair and group activities.`;
    materials = `Student's Book, chalkboard, chalk/markers, charts, illustrative diagrams, flashcards, and local concrete realia.`;
    references = `Rwanda Competence-Based Curriculum Syllabus (MINEDUC / REB), Teacher's Guide and Student's Textbooks.`;
    specialNeeds = `Learners with learning difficulties are assigned supportive peers in mixed-ability groups and receive scaffolded instructions from the teacher.`;
    evaluation = `The vast majority of learners achieved the lesson objectives by successfully completing the tasks on ${topicOrTitle}. Follow-up remedial support will be provided during the practice session.`;
  }

  // Construct 3 official CBC Learning Stages (Table 3)
  const stages: LessonStage[] = [
    {
      id: `stage-${Date.now()}-1`,
      stageName: isKinyarwanda ? 'Intangiriro (Introduction)' : isFrench ? 'Introduction' : 'Introduction',
      duration: `${introTime} min`,
      teacherActivities: isKinyarwanda
        ? `• Gusuhuza abanyeshuri no kugenzura isuku n'ubwitabire.\n• Kubaza ibibazo byibutsa isomo ryashize rihuye n'iri ry'uyu munsi.\n• Gutangiza ikiganiro gishishikaza abanyeshuri kuri ${topicOrTitle} no gutangaza intego z'isomo.`
        : isFrench
        ? `• Saluer les élèves, vérifier la présence et organiser la classe.\n• Réviser les prérequis en posant des questions stimulantes sur les leçons antérieures.\n• Présenter l'accroche pédagogique et les objectifs de la leçon sur ${topicOrTitle}.`
        : `• Greet learners, check attendance and classroom readiness.\n• Elicit prerequisite knowledge through targeted oral questions connecting to previous work.\n• Present an engaging hook or real-life question introducing "${topicOrTitle}" and clearly share the lesson objectives.`,
      learnerActivities: isKinyarwanda
        ? `• Gutega amatwi no gusubiza ibibazo by'umwarimu.\n• Kugaragaza ibyo basanzwe bazi ku isomo no kwandika umutwe w'isomo mu makaye.`
        : isFrench
        ? `• Écouter attentivement et répondre aux questions de révision.\n• Exprimer leurs idées préalables et noter le titre de la leçon dans leurs cahiers.`
        : `• Listen attentively and actively respond to introductory review questions.\n• Brainstorm initial ideas about the topic and write down the lesson title in their notebooks.`,
      competencesAndCrossCutting: isKinyarwanda
        ? `a) Ubushobozi rusange: Itumanaho, gutekereza byimbitse.\nb) Insanganyamatsiko: Uburinganire (guhaza amahirwe angana abahungu n'abakobwa).`
        : isFrench
        ? `a) Compétences génériques : Communication, Pensée critique.\nb) Thèmes transversaux : Égalité des genres (participation équitable).`
        : `a) Generic Competences: Communication skills, Critical thinking.\nb) Cross-Cutting Issues: Gender Education (equitable questions for boys and girls).`,
      materials: 'Chalkboard, realia',
      assessment: 'Oral questions & diagnostic check'
    },
    {
      id: `stage-${Date.now()}-2`,
      stageName: isKinyarwanda ? 'Isomo nyirizina (Lesson Development)' : isFrench ? 'Développement de la leçon' : 'Lesson Development',
      duration: `${devTime} min`,
      teacherActivities: isKinyarwanda
        ? `• Gushyira abanyeshuri mu matsinda akwiriye kandi adaheza.\n• Guha buri tsinda umukoro n'ibikoresho byo gukoresha kuri ${topicOrTitle}.\n• Kuzenguruka mu matsinda afasha abafite ibibazo no gutanga amabwiriza asobanutse.\n• Guha amatsinda umwanya wo kugaragaza ibyo bagezeho ku kibaho.`
        : isFrench
        ? `• Répartir les élèves en groupes de travail hétérogènes et inclusifs.\n• Distribuer les consignes et matériels nécessaires à l'étude de ${topicOrTitle}.\n• Circuler parmi les groupes pour guider, faciliter et encourager la recherche autonome.\n• Inviter les représentants de chaque groupe à présenter leurs résultats au tableau.`
        : `• Organize learners into heterogeneous, gender-balanced small groups.\n• Assign guided discovery tasks and hands-on materials relating to "${topicOrTitle}".\n• Facilitate learning by circulating among groups, posing guiding questions, and scaffolding struggling learners.\n• Invite group representatives to present findings on the chalkboard and encourage peer feedback.`,
      learnerActivities: isKinyarwanda
        ? `• Gukorera hamwe mu matsinda, kungurana ibitekerezo no gukora imyitozo bahawe.\n• Kwandika imyanzuro ku mpapuro cyangwa ku kibaho.\n• Kubaza ibibazo no gutanga ibitekerezo byubaka kuri bagenzi babo.`
        : isFrench
        ? `• Travailler en coopération, échanger des arguments et résoudre les exercices proposés.\n• Noter les synthèses et présenter les conclusions au tableau.\n• Échanger avec les autres groupes et poser des questions de clarification.`
        : `• Collaborate within groups, discuss observations, and solve the assigned tasks.\n• Record synthesis notes and present solutions on the chalkboard.\n• Engage in constructive peer discussion and formulate clarifying questions.`,
      competencesAndCrossCutting: isKinyarwanda
        ? `a) Ubushobozi rusange: Gukorera hamwe, gushakashatsi no gukemura ibibazo, kurema no guhanga udushya.\nb) Insanganyamatsiko: Uburezi budaheza, imibanire myiza n'amahoro.`
        : isFrench
        ? `a) Compétences génériques : Coopération, Résolution de problèmes, Créativité.\nb) Thèmes transversaux : Éducation inclusive, Paix et valeurs.`
        : `a) Generic Competences: Cooperation and interpersonal skills, Problem-solving and research, Creativity and innovation.\nb) Cross-Cutting Issues: Inclusive Education (peer support), Peace and Values Education (mutual respect).`,
      materials: 'Student Book, charts, worksheets',
      assessment: 'Observation of group work, presentation evaluation'
    },
    {
      id: `stage-${Date.now()}-3`,
      stageName: isKinyarwanda ? 'Umusuzo w\'isomo (Conclusion & Evaluation)' : isFrench ? 'Conclusion et Évaluation' : 'Conclusion & Evaluation',
      duration: `${concTime} min`,
      teacherActivities: isKinyarwanda
        ? `• Guhuza imyanzuro n'abanyeshuri no gutanga incamake y'ingenzi kuri ${topicOrTitle}.\n• Gutanga isuzuma rigufi (exit ticket / imyitozo ngiro).\n• Gutanga umukoro wo gukorera mu rugo no gushima abanyeshuri bose bitwaye neza.`
        : isFrench
        ? `• Synthétiser les notions clés avec la participation active de la classe.\n• Administrer une évaluation formative rapide (questions de vérification).\n• Donner des devoirs à domicile et féliciter les apprenants pour leurs efforts.`
        : `• Synthesize the main takeaways of the lesson with active learner participation.\n• Administer a formative assessment (quick exit check / oral questions on ${topicOrTitle}).\n• Assign homework/practice tasks from the curriculum textbook and commend learners for active engagement.`,
      learnerActivities: isKinyarwanda
        ? `• Gutanga incamake y'ibyo bize mu magambo yabo bwite.\n• Gukora isuzuma rigufi ku mpapuro cyangwa mu makaye.\n• Kwandika umukoro wo mu rugo.`
        : isFrench
        ? `• Résumer les points essentiels avec leurs propres mots.\n• Compléter individuellement l'évaluation formative.\n• Noter les devoirs dans le journal de classe.`
        : `• Summarize key learning points in their own words.\n• Individually answer the formative assessment questions.\n• Record homework tasks and learning goals for the next session.`,
      competencesAndCrossCutting: isKinyarwanda
        ? `a) Ubushobozi rusange: Kwiga ubuzima bwose (Lifelong learning), gukoresha neza igihe.\nb) Insanganyamatsiko: Umuco w'ubuziranenge (Standardisation culture).`
        : isFrench
        ? `a) Compétences génériques : Apprentissage tout au long de la vie.\nb) Thèmes transversaux : Culture de la normalisation.`
        : `a) Generic Competences: Lifelong learning, Self-evaluation.\nb) Cross-Cutting Issues: Standardisation Culture (accuracy in recording results).`,
      materials: 'Chalkboard, notebooks',
      assessment: 'Formative exit questions & homework'
    }
  ];

  return {
    subject,
    classGrade,
    lessonTitle: lessonTitle || topicOrTitle,
    unitTopic: unitTopic || topicOrTitle,
    duration,
    term,
    educationLevel,
    keyUnitCompetence: keyCompetence,
    learningObjectives: objectives,
    teachingMaterials: materials,
    references,
    specialNeedsLearners: specialNeeds,
    teacherSelfEvaluation: evaluation,
    stages
  };
}
