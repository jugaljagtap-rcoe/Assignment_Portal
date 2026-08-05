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

  modules: [
    { id: "mod-vmdl-1", subjectId: "sub-vmdl", code: "Module 01", title: "Module 01: Natural Frequency Measurement of Dynamic Systems" },
    { id: "mod-vmdl-2", subjectId: "sub-vmdl", code: "Module 02", title: "Module 02: Damped Free Vibration Systems & Logarithmic Decrement" },
    { id: "mod-phy-1", subjectId: "sub-phy", code: "Module 01", title: "Module 01: Measurements, Error Analysis & Oscillations" },
    { id: "mod-phy-2", subjectId: "sub-phy", code: "Module 02", title: "Module 02: Wave Optics & Interference in Thin Films" }
  ],

  rubricPresets: [
    {
      id: "rub-001",
      name: "Standard Auto-Graded Lab Rubric",
      isShared: true,
      facultyId: "fac-admin-jugal",
      totalMarks: 10,
      criteria: [
        {
          id: "crit-1",
          title: "Criteria 01 (Numerical Values)",
          type: "auto_numerical",
          tolerancePct: 5,
          levels: [
            { level: "Level 3", minPct: 90, marks: 4, description: "≥ 90% parameters within ±5% tolerance" },
            { level: "Level 2", minPct: 50, marks: 3, description: "≥ 50% parameters within ±5% tolerance" },
            { level: "Level 1", minPct: 1,  marks: 1, description: "< 50% parameters within ±10% tolerance" },
            { level: "Level 0", minPct: 0,  marks: 0, description: "0% parameters correct / nowhere near" }
          ]
        },
        {
          id: "crit-2",
          title: "Criteria 02 (Units)",
          type: "auto_units",
          levels: [
            { level: "Level 3", minPct: 90, marks: 3, description: "≥ 90% units correct" },
            { level: "Level 2", minPct: 50, marks: 2, description: "≥ 50% units correct" },
            { level: "Level 1", minPct: 1,  marks: 1, description: "< 50% units correct" },
            { level: "Level 0", minPct: 0,  marks: 0, description: "No correct units" }
          ]
        },
        {
          id: "crit-3",
          title: "Criteria 03 (Diagrams & Setup)",
          type: "manual",
          levels: [
            { level: "Level 3", minPct: 90, marks: 3, description: "To scale, named correctly" },
            { level: "Level 2", minPct: 50, marks: 2, description: "Either not to scale or not named" },
            { level: "Level 1", minPct: 1,  marks: 1, description: "Neither to scale nor named" },
            { level: "Level 0", minPct: 0,  marks: 0, description: "No diagram provided" }
          ]
        }
      ]
    }
  ],

  students: [
    { id: "st-101", uin: "24051001", name: "Aarav Sharma", email: "24051001@eng.rizvi.edu.in", branch: "Mechanical Engineering", division: "A", batch: "A1" },
    { id: "st-102", uin: "24051002", name: "Ananya Patel", email: "24051002@eng.rizvi.edu.in", branch: "Computer Engineering", division: "A", batch: "A1" },
    { id: "st-103", uin: "24051003", name: "Devansh Mehta", email: "24051003@eng.rizvi.edu.in", branch: "Artificial Intelligence & Data Science", division: "A", batch: "A2" },
    { id: "st-104", uin: "24051004", name: "Isha Gupta", email: "24051004@eng.rizvi.edu.in", branch: "Electronics & Computer Science", division: "A", batch: "A2" },
    { id: "st-105", uin: "24051005", name: "Kabir Khan", email: "24051005@eng.rizvi.edu.in", branch: "Civil Engineering", division: "B", batch: "B1" },
    { id: "st-106", uin: "24051006", name: "Riya Verma", email: "24051006@eng.rizvi.edu.in", branch: "Mechanical Engineering", division: "B", batch: "B2" },
    { id: "st-107", uin: "24051007", name: "Siddharth Rao", email: "24051007@eng.rizvi.edu.in", branch: "Computer Engineering", division: "C", batch: "C1" },
    { id: "st-108", uin: "24051008", name: "Zoya Shaikh", email: "24051008@eng.rizvi.edu.in", branch: "Artificial Intelligence & Data Science", division: "D", batch: "D3" }
  ],

  faculty: [
    { id: "fac-admin-jugal", name: "Prof. Jugal Jagtap", email: "jugaljagtap@eng.rizvi.edu.in", departmentId: "dept-fe", role: "admin", assignedSubjects: ["sub-phy", "sub-mech", "sub-vmdl"], isDualRole: true },
    { id: "fac-1", name: "Dr. Ramesh Iyer", email: "ramesh.iyer@eng.rizvi.edu.in", departmentId: "dept-fe", role: "faculty", assignedSubjects: ["sub-phy"] },
    { id: "fac-2", name: "Prof. Priya Nair", email: "priya.nair@eng.rizvi.edu.in", departmentId: "dept-mech", role: "faculty", assignedSubjects: ["sub-mech"] }
  ],

  subjects: [
    { id: "sub-phy", code: "FEL101", shortName: "PhysicsLab", fullName: "Applied Physics Laboratory I", departmentId: "dept-fe" },
    { id: "sub-mech", code: "FEL102", shortName: "MechanicsLab", fullName: "Engineering Mechanics Laboratory", departmentId: "dept-mech" },
    { id: "sub-vmdl", code: "24051181", shortName: "VMDL", fullName: "Vibration and Machinery Diagnostics Laboratory", departmentId: "dept-mech" }
  ],

  courseOutcomes: [
    { id: "co-vmdl-1", subjectId: "sub-vmdl", code: "24051181.CO1", description: "To familiarize with mechanical vibration fundamentals and free undamped systems.", poId: "PO1" },
    { id: "co-vmdl-2", subjectId: "sub-vmdl", code: "24051181.CO2", description: "Analyze damping parameters and logarithmic decrement in dynamic systems.", poId: "PO2" },
    { id: "co-phy-1", subjectId: "sub-phy", code: "FEL101.CO1", description: "Determine natural frequency of mechanical systems.", poId: "PO1" },
    { id: "co-phy-2", subjectId: "sub-phy", code: "FEL101.CO2", description: "Analyze damping parameters in oscillatory systems.", poId: "PO2" }
  ],

  assignments: [
    {
      id: "asg-001",
      code: "RCOE/TE-Mech/2026-27/24051181VMDL_A001",
      subjectId: "sub-vmdl",
      facultyId: "fac-admin-jugal",
      number: 1,
      title: "A001: Assignment on Mechanical Vibration Fundamentals and Free Undamped Systems",
      description: "Perform experimental measurements on mass-spring setup. Calculate natural frequency, static deflection, and damping ratio.",
      className: "TE Mech",
      semester: "Semester V",
      assessmentType: "Direct",
      modulesCovered: "Module 01: Natural Frequency Measurement of Dynamic Systems",
      outcomeCovered: "24051181.CO1: To familiarize with mechanical vibration fundamentals and free undamped systems",
      publishDate: "2026-08-01T09:00",
      deadline: "2026-08-10T23:59",
      rubricPresetId: "rub-001",
      createdAt: "2026-08-04",
      schedules: [
        {
          id: "sch-1",
          scopeType: "batch",
          scopeValue: "A1",
          publishDate: "2026-08-01T09:00",
          deadline: "2026-08-10T23:59",
          submissionsOpen: true,
          gradesReleased: true,
          attemptDeductions: [
            { attempt: 1, deductionPct: 0 },
            { attempt: 2, deductionPct: 10 },
            { attempt: 3, deductionPct: 20 }
          ],
          latePenaltyType: "per_day",
          latePenaltyValue: 10,
          lateMaxCap: 30
        }
      ],
      questions: [
        {
          id: "q-1",
          order: 1,
          sectionLabel: "Q1",
          text: "A mass-spring system consists of a mass m = {{var_m_kg}} kg attached to a helical spring with stiffness k = {{var_k_Nmm}} N/mm. Determine the natural frequency ω_n and static deflection δ_st.",
          imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=60",
          coId: "24051181.CO1",
          btLevel: "BT3",
          parameters: [
            { id: "param-q1-p1", code: "Q001_P01", order: 1, label: "Q1: Natural Frequency (ω_n)", acceptedUnits: ["rad/s", "Hz"], unitRequired: true, valueMarks: 4, unitMarks: 1, tolerancePct: 2 },
            { id: "param-q1-p2", code: "Q001_P02", order: 2, label: "Q1: Static Deflection (δ_st)", acceptedUnits: ["mm", "m"], unitRequired: true, valueMarks: 4, unitMarks: 1, tolerancePct: 2 }
          ]
        },
        {
          id: "q-2",
          order: 2,
          sectionLabel: "Q2",
          text: "If the damping coefficient c = {{var_c_Nsm}} N·s/m is added to the above setup, calculate the critical damping coefficient c_c and damping ratio ζ.",
          imageUrl: "",
          coId: "24051181.CO1",
          btLevel: "BT4",
          parameters: [
            { id: "param-q2-p1", code: "Q002_P01", order: 1, label: "Q2: Damping Ratio (ζ)", acceptedUnits: ["ratio", "none"], unitRequired: false, valueMarks: 5, unitMarks: 0, tolerancePct: 3 }
          ]
        }
      ]
    }
  ],

  studentVariables: [
    { assignmentId: "asg-001", studentId: "st-101", uin: "24051001", key: "var_m_kg", value: "12.5" },
    { assignmentId: "asg-001", studentId: "st-101", uin: "24051001", key: "var_k_Nmm", value: "450.0" },
    { assignmentId: "asg-001", studentId: "st-101", uin: "24051001", key: "var_c_Nsm", value: "8.2" },
    
    { assignmentId: "asg-001", studentId: "st-102", uin: "24051002", key: "var_m_kg", value: "14.0" },
    { assignmentId: "asg-001", studentId: "st-102", uin: "24051002", key: "var_k_Nmm", value: "380.0" },
    { assignmentId: "asg-001", studentId: "st-102", uin: "24051002", key: "var_c_Nsm", value: "6.5" },

    { assignmentId: "asg-001", studentId: "st-103", uin: "24051003", key: "var_m_kg", value: "10.0" },
    { assignmentId: "asg-001", studentId: "st-103", uin: "24051003", key: "var_k_Nmm", value: "400.0" },
    { assignmentId: "asg-001", studentId: "st-103", uin: "24051003", key: "var_c_Nsm", value: "7.0" },

    { assignmentId: "asg-001", studentId: "st-104", uin: "24051004", key: "var_m_kg", value: "15.5" },
    { assignmentId: "asg-001", studentId: "st-104", uin: "24051004", key: "var_k_Nmm", value: "520.0" },
    { assignmentId: "asg-001", studentId: "st-104", uin: "24051004", key: "var_c_Nsm", value: "9.1" },

    { assignmentId: "asg-001", studentId: "st-105", uin: "24051005", key: "var_m_kg", value: "11.2" },
    { assignmentId: "asg-001", studentId: "st-105", uin: "24051005", key: "var_k_Nmm", value: "360.0" },
    { assignmentId: "asg-001", studentId: "st-105", uin: "24051005", key: "var_c_Nsm", value: "5.8" },

    { assignmentId: "asg-001", studentId: "st-106", uin: "24051006", key: "var_m_kg", value: "13.8" },
    { assignmentId: "asg-001", studentId: "st-106", uin: "24051006", key: "var_k_Nmm", value: "490.0" },
    { assignmentId: "asg-001", studentId: "st-106", uin: "24051006", key: "var_c_Nsm", value: "8.0" },

    { assignmentId: "asg-001", studentId: "st-107", uin: "24051007", key: "var_m_kg", value: "16.0" },
    { assignmentId: "asg-001", studentId: "st-107", uin: "24051007", key: "var_k_Nmm", value: "410.0" },
    { assignmentId: "asg-001", studentId: "st-107", uin: "24051007", key: "var_c_Nsm", value: "7.5" },

    { assignmentId: "asg-001", studentId: "st-108", uin: "24051008", key: "var_m_kg", value: "12.0" },
    { assignmentId: "asg-001", studentId: "st-108", uin: "24051008", key: "var_k_Nmm", value: "430.0" },
    { assignmentId: "asg-001", studentId: "st-108", uin: "24051008", key: "var_c_Nsm", value: "6.9" }
  ],

  studentAnswers: [
    { assignmentId: "asg-001", studentId: "st-101", parameterId: "param-q1-p1", correctValue: "189.74", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-101", parameterId: "param-q1-p2", correctValue: "0.272", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-101", parameterId: "param-q2-p1", correctValue: "0.0017", correctUnit: "ratio" },

    { assignmentId: "asg-001", studentId: "st-102", parameterId: "param-q1-p1", correctValue: "164.75", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-102", parameterId: "param-q1-p2", correctValue: "0.361", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-102", parameterId: "param-q2-p1", correctValue: "0.0014", correctUnit: "ratio" },

    { assignmentId: "asg-001", studentId: "st-103", parameterId: "param-q1-p1", correctValue: "200.00", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-103", parameterId: "param-q1-p2", correctValue: "0.245", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-103", parameterId: "param-q2-p1", correctValue: "0.0018", correctUnit: "ratio" },

    { assignmentId: "asg-001", studentId: "st-104", parameterId: "param-q1-p1", correctValue: "183.17", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-104", parameterId: "param-q1-p2", correctValue: "0.292", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-104", parameterId: "param-q2-p1", correctValue: "0.0016", correctUnit: "ratio" },

    { assignmentId: "asg-001", studentId: "st-105", parameterId: "param-q1-p1", correctValue: "179.28", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-105", parameterId: "param-q1-p2", correctValue: "0.305", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-105", parameterId: "param-q2-p1", correctValue: "0.0014", correctUnit: "ratio" },

    { assignmentId: "asg-001", studentId: "st-106", parameterId: "param-q1-p1", correctValue: "188.44", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-106", parameterId: "param-q1-p2", correctValue: "0.276", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-106", parameterId: "param-q2-p1", correctValue: "0.0015", correctUnit: "ratio" },

    { assignmentId: "asg-001", studentId: "st-107", parameterId: "param-q1-p1", correctValue: "160.08", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-107", parameterId: "param-q1-p2", correctValue: "0.383", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-107", parameterId: "param-q2-p1", correctValue: "0.0015", correctUnit: "ratio" },

    { assignmentId: "asg-001", studentId: "st-108", parameterId: "param-q1-p1", correctValue: "189.30", correctUnit: "rad/s" },
    { assignmentId: "asg-001", studentId: "st-108", parameterId: "param-q1-p2", correctValue: "0.274", correctUnit: "mm" },
    { assignmentId: "asg-001", studentId: "st-108", parameterId: "param-q2-p1", correctValue: "0.0015", correctUnit: "ratio" }
  ],

  submissions: [
    {
      id: "subm-001",
      assignmentId: "asg-001",
      studentId: "st-101",
      parameterId: "param-q1-p1",
      attemptNumber: 1,
      submittedValue: "189.74",
      submittedUnit: "rad/s",
      isCorrectValue: true,
      isCorrectUnit: true,
      marksAwarded: 4,
      deductionPct: 0,
      submittedAt: "2026-08-04T14:30"
    }
  ],

  attainmentSettings: {
    studentThresholdPct: 60,
    classTargetPct: 70
  }
};
