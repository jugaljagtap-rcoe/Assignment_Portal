/* ==========================================================================
   Rizvi College of Engineering - Data Store & Seed Datasets
   ==========================================================================
   SUPABASE SCHEMAS REFERENCE:

   1. subject_faculty (pk: id)
      - id TEXT, subject_id TEXT, faculty_id TEXT, academic_year TEXT, assigned_by TEXT, assigned_at TIMESTAMPTZ

   2. assignment_submissions (pk: id)
      - id TEXT, assignment_id TEXT, student_id TEXT, status TEXT, parameters_completed INT, parameters_total INT,
        total_marks_awarded NUMERIC, first_attempt_at TIMESTAMPTZ, last_attempt_at TIMESTAMPTZ, is_late BOOLEAN

   3. audit_log (pk: id)
      - id UUID, action TEXT, entity_type TEXT, entity_id TEXT, changed_by TEXT, changed_at TIMESTAMPTZ, snapshot JSONB

   4. assignment_templates (pk: id)
      - id TEXT, title TEXT, subject_code TEXT, questions JSONB, rubric_preset_id TEXT, created_by TEXT, created_at TIMESTAMPTZ

   5. submissions additions:
      - verification_status TEXT ('pending'|'verified'|'flagged'), verified_by TEXT, verified_at TIMESTAMPTZ

   6. assignments additions:
      - lifecycle_status TEXT ('draft'|'published'|'locked')
   ========================================================================== */

const HARDCODED_BRANCHES = [
  "Artificial Intelligence & Data Science",
  "Civil Engineering",
  "Computer Engineering",
  "Electronics & Computer Science",
  "Mechanical Engineering"
];

const HARDCODED_DEPARTMENTS = [
  {
    id: "dept-fe",
    name: "First Year Engineering Department",
    shortName: "FE",
    vision: "To establish a strong foundation in basic sciences, engineering principles, ethics, and interdisciplinary skills for all first-year engineering students.",
    mission: [
      "To nurture fundamental engineering knowledge and analytical problem-solving abilities.",
      "To bridge academic learning with hands-on laboratory experimentation.",
      "To instill professional ethics, teamwork, and holistic development from day one."
    ]
  },
  {
    id: "dept-aids",
    name: "Artificial Intelligence & Data Science",
    shortName: "AI&DS",
    vision: "To excel in data-driven innovation and intelligence engineering, producing professionals who transform industries through ethical AI and advanced data analytics.",
    mission: [
      "To impart deep knowledge in Machine Learning, Deep Learning, and Big Data technologies.",
      "To encourage interdisciplinary research and industry-aligned AI projects.",
      "To develop responsible AI practitioners committed to societal wellbeing."
    ]
  },
  {
    id: "dept-civil",
    name: "Civil Engineering",
    shortName: "Civil",
    vision: "To develop sustainable infrastructure engineers equipped with advanced structural design, environmental awareness, and project management skills.",
    mission: [
      "To deliver comprehensive technical education in civil and structural engineering.",
      "To promote sustainable construction practices and green technologies.",
      "To build leadership and ethical standards for community development."
    ]
  },
  {
    id: "dept-comp",
    name: "Computer Engineering",
    shortName: "Comp",
    vision: "To create globally competent computer engineers capable of solving complex computational problems and driving innovation in artificial intelligence, software design, and digital systems.",
    mission: [
      "To provide robust technical education in computer science core principles and modern software methodologies.",
      "To foster innovation and research in emerging computing technologies.",
      "To cultivate professional ethics, leadership qualities, and lifelong learning capabilities."
    ]
  },
  {
    id: "dept-ecs",
    name: "Electronics & Computer Science",
    shortName: "ECS",
    vision: "To pioneer integrated hardware-software engineering education, preparing students for leadership in embedded systems, IoT, and modern electronics.",
    mission: [
      "To offer cutting-edge instruction in hardware design and software integration.",
      "To facilitate hands-on experimentation in IoT and smart electronics.",
      "To bridge academia and industry through collaborative innovation."
    ]
  },
  {
    id: "dept-mech",
    name: "Mechanical Engineering",
    shortName: "Mech",
    vision: "To achieve excellence in transforming all aspirants into globally recognized mechanical engineers of the highest caliber with core competencies backed by multidisciplinary evolutions and innovations, proficient in sustainable design, development and services.",
    mission: [
      "To enrich the learners with strong fundamentals of Mechanical Engineering and professional ethics, using the latest technologies of teaching-learning methodologies.",
      "To equip the learners with skillsets based on simulation techniques and tools which will help them stand strong in the global competitive environment.",
      "To groom the learner through various co-curricular, extra-curricular and societal activities, to meet the diverse and versatile demand of the industry.",
      "To motivate the research and entrepreneurship culture and facilitate the learner to undertake projects of multidisciplinary domains."
    ]
  }
];

// Single Hardcoded Admin & Dual-Role Account
const HARDCODED_ADMIN_EMAILS = [
  "jugaljagtap@eng.rizvi.edu.in"
];

const ACADEMIC_YEARS = [
  { id: "ay-2026-27", label: "2026-27", active: true },
  { id: "ay-2025-26", label: "2025-26", active: false }
];

const INITIAL_DATA = {
  academicYears: JSON.parse(JSON.stringify(ACADEMIC_YEARS)),
  departments: JSON.parse(JSON.stringify(HARDCODED_DEPARTMENTS)),

  academicClasses: [
    { id: "class-fe", code: "FE", name: "First Year Engineering", departmentId: "dept-fe", semesters: ["Semester I", "Semester II"] },
    { id: "class-aids-se", code: "SE AI&DS", name: "Second Year Artificial Intelligence & Data Science", departmentId: "dept-aids", semesters: ["Semester III", "Semester IV"] },
    { id: "class-aids-te", code: "TE AI&DS", name: "Third Year Artificial Intelligence & Data Science", departmentId: "dept-aids", semesters: ["Semester V", "Semester VI"] },
    { id: "class-aids-be", code: "BE AI&DS", name: "Final Year Artificial Intelligence & Data Science", departmentId: "dept-aids", semesters: ["Semester VII", "Semester VIII"] },
    { id: "class-civil-se", code: "SE Civil", name: "Second Year Civil Engineering", departmentId: "dept-civil", semesters: ["Semester III", "Semester IV"] },
    { id: "class-civil-te", code: "TE Civil", name: "Third Year Civil Engineering", departmentId: "dept-civil", semesters: ["Semester V", "Semester VI"] },
    { id: "class-civil-be", code: "BE Civil", name: "Final Year Civil Engineering", departmentId: "dept-civil", semesters: ["Semester VII", "Semester VIII"] },
    { id: "class-comp-se", code: "SE Comp", name: "Second Year Computer Engineering", departmentId: "dept-comp", semesters: ["Semester III", "Semester IV"] },
    { id: "class-comp-te", code: "TE Comp", name: "Third Year Computer Engineering", departmentId: "dept-comp", semesters: ["Semester V", "Semester VI"] },
    { id: "class-comp-be", code: "BE Comp", name: "Final Year Computer Engineering", departmentId: "dept-comp", semesters: ["Semester VII", "Semester VIII"] },
    { id: "class-ecs-se", code: "SE ECS", name: "Second Year Electronics & Computer Science", departmentId: "dept-ecs", semesters: ["Semester III", "Semester IV"] },
    { id: "class-ecs-te", code: "TE ECS", name: "Third Year Electronics & Computer Science", departmentId: "dept-ecs", semesters: ["Semester V", "Semester VI"] },
    { id: "class-ecs-be", code: "BE ECS", name: "Final Year Electronics & Computer Science", departmentId: "dept-ecs", semesters: ["Semester VII", "Semester VIII"] },
    { id: "class-mech-se", code: "SE Mech", name: "Second Year Mechanical Engineering", departmentId: "dept-mech", semesters: ["Semester III", "Semester IV"] },
    { id: "class-mech-te", code: "TE Mech", name: "Third Year Mechanical Engineering", departmentId: "dept-mech", semesters: ["Semester V", "Semester VI"] },
    { id: "class-mech-be", code: "BE Mech", name: "Final Year Mechanical Engineering", departmentId: "dept-mech", semesters: ["Semester VII", "Semester VIII"] }
  ],

  programOutcomes: [],
  programSpecificOutcomes: [],
  assignmentSequences: [],
  modules: [],

  rubricPresets: [],

  students: [],
  faculty: [
    { id: "fac-admin-jugal", name: "Prof. Jugal Jagtap", email: "jugaljagtap@eng.rizvi.edu.in", departmentId: "dept-fe", role: "admin", assignedSubjects: [], isDualRole: true }
  ],
  subjectFaculty: [],
  subjects: [],
  courseOutcomes: [],
  coPOMapping: [],
  assignments: [],
  assignmentSubmissions: [],
  studentVariables: [],
  studentAnswers: [],
  submissions: [],
  auditLogs: [],
  assignmentTemplates: [],

  attainmentSettings: {
    studentThresholdPct: 60,
    classTargetPct: 70
  },

  portalSettings: {}
};
