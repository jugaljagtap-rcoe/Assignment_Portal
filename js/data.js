/* ==========================================================================
   Rizvi College of Engineering - Data Store & Seed Datasets
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

const INITIAL_DATA = {
  academicYears: [
    { id: "ay-2026-27", label: "2026-27", active: true },
    { id: "ay-2025-26", label: "2025-26", active: false }
  ],
  
  departments: JSON.parse(JSON.stringify(HARDCODED_DEPARTMENTS)),

  academicClasses: [
    // First Year Engineering
    { id: "class-fe", code: "FE", name: "First Year Engineering", departmentId: "dept-fe", semesters: ["Semester I", "Semester II"] },

    // Artificial Intelligence & Data Science
    { id: "class-aids-se", code: "SE AI&DS", name: "Second Year Artificial Intelligence & Data Science", departmentId: "dept-aids", semesters: ["Semester III", "Semester IV"] },
    { id: "class-aids-te", code: "TE AI&DS", name: "Third Year Artificial Intelligence & Data Science", departmentId: "dept-aids", semesters: ["Semester V", "Semester VI"] },
    { id: "class-aids-be", code: "BE AI&DS", name: "Final Year Artificial Intelligence & Data Science", departmentId: "dept-aids", semesters: ["Semester VII", "Semester VIII"] },

    // Civil Engineering
    { id: "class-civil-se", code: "SE Civil", name: "Second Year Civil Engineering", departmentId: "dept-civil", semesters: ["Semester III", "Semester IV"] },
    { id: "class-civil-te", code: "TE Civil", name: "Third Year Civil Engineering", departmentId: "dept-civil", semesters: ["Semester V", "Semester VI"] },
    { id: "class-civil-be", code: "BE Civil", name: "Final Year Civil Engineering", departmentId: "dept-civil", semesters: ["Semester VII", "Semester VIII"] },

    // Computer Engineering
    { id: "class-comp-se", code: "SE Comp", name: "Second Year Computer Engineering", departmentId: "dept-comp", semesters: ["Semester III", "Semester IV"] },
    { id: "class-comp-te", code: "TE Comp", name: "Third Year Computer Engineering", departmentId: "dept-comp", semesters: ["Semester V", "Semester VI"] },
    { id: "class-comp-be", code: "BE Comp", name: "Final Year Computer Engineering", departmentId: "dept-comp", semesters: ["Semester VII", "Semester VIII"] },

    // Electronics & Computer Science
    { id: "class-ecs-se", code: "SE ECS", name: "Second Year Electronics & Computer Science", departmentId: "dept-ecs", semesters: ["Semester III", "Semester IV"] },
    { id: "class-ecs-te", code: "TE ECS", name: "Third Year Electronics & Computer Science", departmentId: "dept-ecs", semesters: ["Semester V", "Semester VI"] },
    { id: "class-ecs-be", code: "BE ECS", name: "Final Year Electronics & Computer Science", departmentId: "dept-ecs", semesters: ["Semester VII", "Semester VIII"] },

    // Mechanical Engineering
    { id: "class-mech-se", code: "SE Mech", name: "Second Year Mechanical Engineering", departmentId: "dept-mech", semesters: ["Semester III", "Semester IV"] },
    { id: "class-mech-te", code: "TE Mech", name: "Third Year Mechanical Engineering", departmentId: "dept-mech", semesters: ["Semester V", "Semester VI"] },
    { id: "class-mech-be", code: "BE Mech", name: "Final Year Mechanical Engineering", departmentId: "dept-mech", semesters: ["Semester VII", "Semester VIII"] }
  ],

  programOutcomes: [
    { id: "PO1", code: "PO1", description: "Engineering Knowledge: Apply math, science, and engineering fundamentals." },
    { id: "PO2", code: "PO2", description: "Problem Analysis: Identify and formulate complex engineering problems." },
    { id: "PO3", code: "PO3", description: "Design/Development of Solutions: Design components or processes." },
    { id: "PO4", code: "PO4", description: "Conduct Investigations of Complex Problems: Use research-based methods." },
    { id: "PO5", code: "PO5", description: "Modern Tool Usage: Select and apply appropriate techniques and tools." },
    { id: "PO6", code: "PO6", description: "The Engineer and Society: Apply contextual reasoning to societal issues." },
    { id: "PO7", code: "PO7", description: "Environment and Sustainability: Understand sustainable development." },
    { id: "PO8", code: "PO8", description: "Ethics: Apply ethical principles and commit to professional ethics." },
    { id: "PO9", code: "PO9", description: "Individual and Team Work: Function effectively as an individual and in teams." },
    { id: "PO10", code: "PO10", description: "Communication: Communicate effectively on complex engineering activities." },
    { id: "PO11", code: "PO11", description: "Project Management and Finance: Apply engineering management principles." },
    { id: "PO12", code: "PO12", description: "Life-long Learning: Engage in independent and life-long learning." }
  ],

  programSpecificOutcomes: [
    { id: "PSO1", code: "PSO1", description: "Domain Modeling & Simulation: Apply modern engineering software tools to solve domain-specific problems." },
    { id: "PSO2", code: "PSO2", description: "Practical & Laboratory Competency: Design, execute, and analyze real-world laboratory experiments." }
  ],

  modules: [],

  rubricPresets: [
    {
      id: "rub-analytical-001",
      name: "Grading Rubric (Analytical)",
      type: "grading_analytical",
      isShared: true,
      facultyId: "fac-admin-jugal",
      totalMarks: 20,
      criteria: [
        {
          id: "crit-num-acc",
          title: "1. Numerical Calculation Accuracy",
          type: "auto_numerical",
          maxMarks: 12,
          levels: [
            { level: "Exemplary", minPct: 90, marks: 12, description: "All calculated values fall within ±2% tolerance of formula." },
            { level: "Proficient", minPct: 75, marks: 9, description: "Calculated values fall within ±5% tolerance of formula." },
            { level: "Developing", minPct: 50, marks: 6, description: "Calculated values fall within ±10% tolerance of formula." },
            { level: "Unsatisfactory", minPct: 0, marks: 0, description: "Values exceed ±10% error margin or wrong formulas throughout." }
          ]
        },
        {
          id: "crit-units-sel",
          title: "2. Engineering Units Selection",
          type: "auto_units",
          maxMarks: 5,
          levels: [
            { level: "Exemplary", minPct: 90, marks: 5, description: "100% of parameters have correct engineering units (e.g. rad/s, N/m)." },
            { level: "Proficient", minPct: 75, marks: 3.75, description: "≥75% of parameters have correct engineering units." },
            { level: "Developing", minPct: 50, marks: 2.5, description: "50% of parameters have correct engineering units." },
            { level: "Unsatisfactory", minPct: 0, marks: 0, description: "Units missing or wrong units throughout." }
          ]
        },
        {
          id: "crit-comp-rate",
          title: "3. Parameter Completion Rate",
          type: "completion",
          maxMarks: 2,
          levels: [
            { level: "Exemplary", minPct: 100, marks: 2, description: "100% (6/6 parameters) attempted & submitted." },
            { level: "Proficient", minPct: 75, marks: 1.5, description: "75-90% (4-5 parameters) attempted & submitted." },
            { level: "Developing", minPct: 50, marks: 1, description: "50% (3 parameters) attempted & submitted." },
            { level: "Unsatisfactory", minPct: 0, marks: 0, description: "<50% (<3 parameters) attempted & submitted." }
          ]
        },
        {
          id: "crit-sub-timeliness",
          title: "4. Submission Timeliness",
          type: "timeliness",
          maxMarks: 1,
          levels: [
            { level: "Exemplary", minPct: 100, marks: 1, description: "Submitted on or before deadline." },
            { level: "Proficient", minPct: 75, marks: 0.75, description: "Submitted <2 hours late." },
            { level: "Developing", minPct: 50, marks: 0.5, description: "Submitted 2-24 hours late." },
            { level: "Unsatisfactory", minPct: 0, marks: 0, description: "Submitted >24 hours late without approval." }
          ]
        }
      ]
    },
    {
      id: "rub-nba-threshold-001",
      name: "NBA Attainment Rubric (Threshold)",
      type: "nba_threshold",
      isShared: true,
      facultyId: "fac-admin-jugal",
      totalMarks: 100,
      criteria: [
        {
          id: "crit-nba-levels",
          title: "NBA CO/LO Attainment Mapping Levels",
          type: "threshold",
          levels: [
            { level: "Level 3 (High Attainment)", minPct: 80, marks: 3, description: "Scored ≥ 80% marks on assignment questions." },
            { level: "Level 2 (Moderate Attainment)", minPct: 50, marks: 2, description: "Scored 50% - 79% marks on assignment questions." },
            { level: "Level 1 (Low Attainment)", minPct: 1, marks: 1, description: "Scored 1% - 49% marks on assignment questions." },
            { level: "Level 0 (Unattained)", minPct: 0, marks: 0, description: "Scored 0% / Not attempted." }
          ]
        }
      ]
    }
  ],

  students: [],

  faculty: [
    { id: "fac-admin-jugal", name: "Prof. Jugal Jagtap", email: "jugaljagtap@eng.rizvi.edu.in", departmentId: "dept-fe", role: "admin", assignedSubjects: [], isDualRole: true }
  ],

  subjects: [
    {
      id: "sub-24051181",
      code: "24051181",
      shortName: "VMD Lab",
      fullName: "Vibration and Machinery Diagnostics Laboratory (PEL-I)",
      departmentId: "dept-mech",
      className: "TE Mech",
      semester: "Semester V"
    },
    {
      id: "sub-esl101",
      code: "ESL101",
      shortName: "EM Lab",
      fullName: "Engineering Mechanics Lab",
      departmentId: "dept-fe",
      className: "FE",
      semester: "Semester I"
    }
  ],

  courseOutcomes: [],

  assignments: [],

  studentVariables: [],

  studentAnswers: [],

  submissions: [],

  attainmentSettings: {
    studentThresholdPct: 60,
    classTargetPct: 70
  }
};
