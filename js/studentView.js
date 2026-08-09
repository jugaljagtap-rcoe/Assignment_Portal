/* ==========================================================================
   Rizvi College of Engineering - Student Module
   ========================================================================== */

const studentView = {
  _submitting: false,
  render(container, activeNav) {
    switch(activeNav) {
      case 'solver':
        this.renderSolverCanvas(container);
        break;
      case 'grades':
        this.renderStudentGrades(container);
        break;
      case 'dashboard':
      default:
        this.renderDashboard(container);
        break;
    }
  },

  getAssignmentsForStudent(student) {
    if (!student) return [];

    const allAssignments = app.data.assignments || [];
    const subjects = app.data.subjects || [];
    const departments = app.data.departments || [];

    const studentYear = (student.yearOfStudy || 'FE').toUpperCase();
    const studentBranch = (student.branch || '').toLowerCase();

    return allAssignments.filter(asg => {
      const sub = subjects.find(s => s.id === asg.subjectId);
      if (!sub) return true;

      const isFESubject = sub.departmentId === 'dept-fe' || (sub.className && sub.className.toUpperCase() === 'FE');
      const isFEStudent = studentYear === 'FE';

      if (isFEStudent) {
        return isFESubject;
      }

      if (isFESubject) return false;

      const classMatches = sub.className ? sub.className.toUpperCase().includes(studentYear) : false;

      const dept = departments.find(d => d.id === sub.departmentId);
      let deptMatches = false;
      if (dept) {
        const deptName = (dept.name || '').toLowerCase();
        const deptShort = (dept.shortName || '').toLowerCase();
        deptMatches = deptName.includes(studentBranch) || studentBranch.includes(deptName) ||
                      (deptShort && studentBranch.includes(deptShort)) ||
                      (sub.className && sub.className.toLowerCase().includes(deptShort));
      } else {
        deptMatches = true;
      }

      return classMatches && deptMatches;
    });
  },

  renderDashboard(container) {
    const student = app.data.students.find(s => s.id === app.activeStudentId) || (app.data.students.length > 0 ? app.data.students[0] : null);

    if (!student && app.currentUser && app.currentUser.role === 'student') {
      container.innerHTML = `
        <div class="card" style="padding:48px 24px; text-align:center;">
          <div style="font-size:48px; margin-bottom:12px;">⚠️</div>
          <h2 style="font-size:18px; font-weight:700; margin-bottom:8px;">Student Profile Not Found</h2>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Your student profile (${app.currentUser.email}) could not be found in the Student Master roster. 
            Please contact your administrator at 
            <strong>jugaljagtap@eng.rizvi.edu.in</strong> to ensure your account is enrolled.
          </p>
        </div>
      `;
      return;
    }

    const assignments = this.getAssignmentsForStudent(student);
    
    let activeAsg = assignments.length > 0 ? (assignments.find(a => a.id === app.activeAssignmentId) || assignments[0]) : null;
    let schedule = activeAsg ? app.getAssignmentSchedule(activeAsg.id, student ? student.batch : 'A1') : null;

    let totalEarnedMarks = student ? this.calculateStudentTotalMarks(student.id) : 0;
    let totalPossibleMarks = 0;

    if (assignments.length > 0) {
      assignments.forEach(a => {
        (a.questions || []).forEach(q => {
          (q.parameters || []).forEach(p => {
            totalPossibleMarks += ((p.valueMarks || 0) + (p.unitMarks || 0));
          });
        });
      });
    }

    const isPreviewingMode = app.currentUser && app.currentUser.role !== 'student';

    const studentHeader = student 
      ? `Welcome, <strong>${student.name}</strong> (<code class="code-font">${student.uin}</code>) | Year: ${student.yearOfStudy || 'FE'} | Branch: ${student.branch} | Div ${student.division} / Batch ${student.batch}`
      : `Welcome to Student Lab Portal | No Student Profile Selected`;

    container.innerHTML = `
      ${!student ? `
        <div class="card" style="padding:16px 20px; background:var(--accent-blue-subtle); border:1px solid rgba(0,102,204,0.2); margin-bottom:16px; border-radius:var(--radius-md);">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div>
              <strong style="color:var(--accent-blue);">ℹ️ No Active Student Profile Selected:</strong> 
              <span style="font-size:13px; color:var(--text-secondary);">
                ${app.data.students.length === 0 ? 'There are currently 0 students enrolled in the Student Master roster. Enroll a student in Admin View to test Student Preview.' : 'Please select an enrolled student profile to inspect their assigned lab experiments.'}
              </span>
            </div>
            ${app.data.students.length > 0 ? `
              <select class="form-select" style="width:auto; padding:4px 10px; font-size:12px;" onchange="app.setActiveStudent(this.value); app.renderCurrentView();">
                <option value="">-- Select Student Profile --</option>
                ${app.data.students.map(s => `<option value="${s.id}">${s.name} (${s.uin} - ${s.yearOfStudy || 'FE'} ${s.branch})</option>`).join('')}
              </select>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h1 class="page-title">Home</h1>
          <p class="page-subtitle">${studentHeader}</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          ${isPreviewingMode && app.data.students.length > 0 ? `
            <div style="display:flex; align-items:center; gap:8px; background:var(--bg-subtle); padding:6px 12px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
              <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">👁️ Preview Profile:</span>
              <select class="form-select" style="width:auto; padding:4px 8px; font-size:12px;" onchange="app.setActiveStudent(this.value); app.renderCurrentView();">
                ${app.data.students.map(s => `
                  <option value="${s.id}" ${student && s.id === student.id ? 'selected' : ''}>
                    ${s.name} (${s.uin} - ${s.yearOfStudy || 'FE'} ${s.branch})
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          ${activeAsg ? `
            <button class="btn btn-primary" onclick="app.switchNav('solver')">
              ✏️ Continue Lab: ${activeAsg.code}
            </button>
          ` : ''}
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-content">
            <span class="kpi-label">My Class & Division</span>
            <span class="kpi-value">${student ? `${student.yearOfStudy || 'FE'} ${student.division} / ${student.batch}` : '--'}</span>
            <span class="kpi-trend positive">${student ? student.branch : 'No Branch'}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-content">
            <span class="kpi-label">Assigned Experiments</span>
            <span class="kpi-value">${assignments.length}</span>
            <span class="kpi-trend ${assignments.length > 0 ? 'positive' : 'neutral'}">
              ${assignments.filter(a => app.getAssignmentSchedule(a.id, student ? student.batch : 'A1')?.submissionsOpen).length} Open Submissions
            </span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-content">
            <span class="kpi-label">Active Experiment</span>
            <span class="kpi-value" style="font-size:20px; font-family:var(--font-mono); color:var(--accent-blue);" title="${activeAsg ? activeAsg.title : ''}">
              ${activeAsg ? activeAsg.code : 'None'}
            </span>
            <span class="kpi-trend ${schedule && schedule.submissionsOpen ? 'positive' : 'negative'}">
              ${schedule ? (schedule.submissionsOpen ? '● Submissions Open' : '● Submissions Closed') : 'No Schedule'}
            </span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-content">
            <span class="kpi-label">My Marks Earned</span>
            <span class="kpi-value">${totalEarnedMarks} / ${totalPossibleMarks}</span>
            <span class="kpi-trend positive">
              ${schedule ? (schedule.gradesReleased ? 'Grades Released' : 'Pending Evaluation') : 'No Grades'}
            </span>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 16px;">
        <h2 class="card-title" style="margin-bottom:12px;">Assigned Experiments</h2>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Assignment Code</th>
                <th>Title</th>
                <th>Subject</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align:center; padding:24px; color:var(--text-secondary);">
                    ${!student ? '⚠️ No active student profile selected. Please enroll or select a student profile.' : 'ℹ️ No lab experiments currently assigned for this class/branch.'}
                  </td>
                </tr>
              ` : assignments.map(asg => {
                const sub = app.data.subjects.find(s => s.id === asg.subjectId);
                const sch = app.getAssignmentSchedule(asg.id, student ? student.batch : 'A1');
                const isActive = activeAsg && asg.id === activeAsg.id;
                return `
                  <tr style="${isActive ? 'background:var(--accent-blue-subtle);' : ''}">
                    <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${asg.code}</td>
                    <td style="font-weight:600;">${asg.title}</td>
                    <td><span class="tag tag-co">${sub ? sub.code : ''}</span></td>
                    <td style="font-size:12px; font-weight:600;">${sch ? new Date(sch.deadline).toLocaleString() : '—'}</td>
                    <td><span class="tag ${sch && sch.submissionsOpen ? 'tag-success' : 'tag-danger'}">${sch && sch.submissionsOpen ? 'Open' : 'Closed'}</span></td>
                    <td>
                      <button class="btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm" 
                        onclick="app.activeAssignmentId='${asg.id}'; app.switchNav('solver');">
                        ✏️ ${isActive ? 'Continue Experiment' : 'Start Experiment'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  calculateStudentTotalMarks(studentId) {
    let sum = 0;
    app.data.submissions.forEach(s => {
      if (s.studentId === studentId) sum += (s.marksAwarded || 0);
    });
    return sum;
  },

  renderSolverCanvas(container) {
    const student = app.data.students.find(s => s.id === app.activeStudentId) || (app.data.students.length > 0 ? app.data.students[0] : null);
    const studentAssignments = this.getAssignmentsForStudent(student);
    const asg = studentAssignments.find(a => a.id === app.activeAssignmentId) || (studentAssignments.length > 0 ? studentAssignments[0] : null);

    if (!asg || !student) {
      container.innerHTML = `
        <div class="card" style="padding:40px; text-align:center;">
          <h2 style="font-size:18px; margin-bottom:8px;">No Active Canvas Sheet</h2>
          <p style="color:var(--text-secondary); margin-bottom:16px;">
            ${!student ? 'No student profile selected.' : 'There are currently no lab assignments published for your class/branch to solve.'}
          </p>
          <button class="btn btn-secondary" onclick="app.switchNav('dashboard')">← Return to Student Portal</button>
        </div>
      `;
      return;
    }

    if (asg.questions.length === 0) {
      container.innerHTML = `
        <div class="page-header-container">
          <div>
            <h1 class="page-title">Solve Assignment</h1>
            <p class="page-subtitle">${asg.code} — ${asg.title}</p>
          </div>
          <button class="btn btn-secondary" onclick="app.switchNav('dashboard')">← Back to Dashboard</button>
        </div>
        <div class="card" style="padding:48px 24px; text-align:center;">
          <div style="font-size:48px; margin-bottom:12px;">📋</div>
          <h2 style="font-size:18px; font-weight:700; margin-bottom:8px;">Questions Not Yet Published</h2>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto; font-size:13px;">
            Your faculty is still building the questions for <strong>${asg.code}</strong>. 
            Please check back later or contact your subject faculty for an update.
          </p>
        </div>
      `;
      return;
    }

    const subject = app.data.subjects.find(s => s.id === asg.subjectId);
    const department = subject ? app.data.departments.find(d => d.id === subject.departmentId) : null;
    const schedule = app.getAssignmentSchedule(asg.id, student.batch);

    const deptTitle = department ? department.name.toUpperCase() : 'FIRST YEAR ENGINEERING DEPARTMENT';
    const deptVision = department ? department.vision : "To establish a strong foundation in basic sciences, engineering principles, and ethical values.";
    const deptMission = department ? department.mission : [
      "To provide a strong foundation in basic sciences and engineering fundamentals.",
      "To nurture critical thinking and analytical problem-solving abilities.",
      "To bridge theoretical knowledge with practical laboratory experimentation."
    ];

    // Build Student Variable Map
    const studentVars = {};
    app.data.studentVariables.forEach(v => {
      if (v.studentId === student.id && v.assignmentId === asg.id) {
        studentVars[v.key] = v.value;
      }
    });

    const hasVariables = Object.keys(studentVars).length > 0;

    // Count how many unique variable placeholders exist in this assignment's questions
    const variablePlaceholders = new Set();
    asg.questions.forEach(q => {
      const matches = q.text.match(/\{\{(.*?)\}\}/g) || [];
      matches.forEach(m => variablePlaceholders.add(m.replace(/\{\{|\}\}/g, '').trim()));
    });
    const allVariablesLoaded = variablePlaceholders.size === 0 || 
      [...variablePlaceholders].every(key => studentVars[key] !== undefined);

    const currentDateFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Solve Assignment</h1>
          <p class="page-subtitle">${asg.code} — ${asg.title}</p>
        </div>
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Print / Save PDF</button>
      </div>

      <!-- Dynamic Batch Deadline & Policy Banner -->
      <div class="card" style="margin-bottom:20px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:var(--accent-blue);">📅 Batch ${student.batch} Deadline:</strong> ${new Date(schedule.deadline).toLocaleString()}
            <span style="font-size:12px; color:var(--text-secondary); margin-left:12px;">(Attempts Allowed: Max 3 per parameter | Retries: 2nd = -10%, 3rd = -20%)</span>
            ${new Date() > new Date(schedule.deadline) ? `
              <div style="margin-top:8px; background:var(--danger-subtle); border:1px solid var(--danger); border-radius:var(--radius-md); padding:8px 12px; font-size:12px; color:var(--danger); font-weight:600;">
                ⚠️ LATE SUBMISSION: Your batch deadline has passed. 
                A late penalty of ${schedule.latePenaltyValue || 10}% per day 
                (max ${schedule.lateMaxCap || 30}%) will be applied to all marks earned.
              </div>
            ` : ''}
          </div>
          <span class="tag tag-success">Submissions Open</span>
        </div>
      </div>

      ${!hasVariables && variablePlaceholders.size > 0 ? `
        <div class="card" style="margin-bottom:20px; background:var(--danger-subtle); border-color:var(--danger);">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:24px;">⚠️</span>
            <div>
              <strong style="color:var(--danger); font-size:14px;">Your Question Variables Are Not Yet Loaded</strong>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                Your faculty has not yet uploaded the question variables CSV for this assignment. 
                The variable placeholders in your questions will appear as <code>{{variable_name}}</code> 
                until your faculty uploads the variables file. 
                Please contact your subject faculty or wait for the variables to be published.
              </div>
            </div>
          </div>
        </div>
      ` : !allVariablesLoaded ? `
        <div class="card" style="margin-bottom:20px; background:var(--warning-subtle); border-color:var(--warning);">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:24px;">ℹ️</span>
            <div>
              <strong style="color:var(--warning); font-size:14px;">Some Variables Are Missing</strong>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                Some question variables are loaded but not all placeholders have values. 
                Missing variables will show as <code>{{variable_name}}</code> in your questions. 
                Contact your faculty if this persists.
              </div>
            </div>
          </div>
        </div>
      ` : `
        <div class="card" style="margin-bottom:20px; background:var(--success-subtle); border-color:rgba(16,185,129,0.3);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">✅</span>
            <span style="font-size:13px; font-weight:600; color:var(--success);">
              Your unique question variables are loaded — ${Object.keys(studentVars).length} variable${Object.keys(studentVars).length !== 1 ? 's' : ''} assigned to UIN ${student.uin}
            </span>
          </div>
        </div>
      `}

      <!-- Printable Assignment Sheet Canvas -->
      <div style="background:#FFF; padding:28px; border:1px solid #000; font-family:sans-serif; color:#000;">
        <!-- Top Institutional Header -->
        <div style="display:flex; align-items:center; gap:20px; border-bottom:2px solid #000; padding-bottom:12px; margin-bottom:12px;">
          <img src="assets/rizvi_logo.png" style="height:80px;" alt="Rizvi Emblem">
          <div style="flex:1; text-align:center;">
            <div style="font-size:12px; font-weight:700;">RIZVI EDUCATION SOCIETY's</div>
            <div style="font-size:22px; font-weight:800; letter-spacing:0.5px;">RIZVI COLLEGE OF ENGINEERING</div>
            <div style="font-size:10px; font-weight:600;">Approved by AICTE | Recognized by DTE | Affiliated to University of Mumbai</div>
            <div style="font-size:13px; font-weight:800; margin-top:4px; text-transform:uppercase;">DEPARTMENT OF ${deptTitle}</div>
          </div>
        </div>

        <!-- Vision & Mission Box -->
        <div style="border:1px solid #000; padding:10px; margin-bottom:14px; font-size:11px; line-height:1.4; background:#FAFAFA;">
          <div><strong>Vision:</strong> ${deptVision}</div>
          <div style="margin-top:4px;"><strong>Mission:</strong></div>
          <ol style="margin:2px 0 0 16px; padding:0;">
            ${deptMission.map(m => `<li>${m}</li>`).join('')}
          </ol>
        </div>

        <!-- Student Meta Header Block -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; border:1px solid #000; padding:10px; margin-bottom:14px; font-size:12px;">
          <div>
            <div><strong>Student Name:</strong> ${student.name}</div>
            <div><strong>UIN:</strong> <code class="code-font">${student.uin}</code></div>
            <div><strong>Branch:</strong> ${student.branch}</div>
          </div>
          <div>
            <div><strong>Class / Division / Batch:</strong> ${asg.className} / Div ${student.division} / Batch ${student.batch}</div>
            <div><strong>Academic Year / Sem:</strong> 2026-27 / ${asg.semester}</div>
            <div><strong>Date of Submission:</strong> ${currentDateFormatted}</div>
          </div>
        </div>

        <!-- Meta Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:14px; font-size:11px; text-align:center;" border="1">
          <tr style="background:#F0F0F0; font-weight:700;">
            <td>Assignment Code</td>
            <td>Subject Course</td>
            <td>Assessment Type</td>
            <td>Modules Covered</td>
            <td>Lab Outcome/s Covered</td>
          </tr>
          <tr>
            <td style="font-family:var(--font-mono); font-weight:700;">${asg.code}</td>
            <td>${subject ? subject.fullName : 'VMDL'}</td>
            <td>${asg.assessmentType}</td>
            <td>${asg.modulesCovered}</td>
            <td>${asg.outcomeCovered}</td>
          </tr>
        </table>

        <!-- Full Width Rubric Table & Prominent Bloom's Taxonomy Pyramid Section -->
        <div style="border:1px solid #000; padding:14px; margin-bottom:16px; background:#FFF;">
          <div style="font-size:12px; font-weight:700; margin-bottom:8px; text-align:center; text-transform:uppercase; letter-spacing:0.5px;">Auto-Graded Performance Rubric</div>
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:16px;" border="1">
            <tr style="background:#F0F0F0; font-weight:700; text-align:center;">
              <td>Criteria Title</td>
              <td>Level 03 (≥ 90%)</td>
              <td>Level 02 (≥ 50%)</td>
              <td>Level 01 (< 50%)</td>
              <td>Level 00 (0%)</td>
            </tr>
            <tr>
              <td style="font-weight:600; padding:6px;">Numerical Values</td>
              <td style="text-align:center;">4 Marks</td>
              <td style="text-align:center;">3 Marks</td>
              <td style="text-align:center;">1 Marks</td>
              <td style="text-align:center;">0 Marks</td>
            </tr>
            <tr>
              <td style="font-weight:600; padding:6px;">Units Precision</td>
              <td style="text-align:center;">3 Marks</td>
              <td style="text-align:center;">2 Marks</td>
              <td style="text-align:center;">1 Marks</td>
              <td style="text-align:center;">0 Marks</td>
            </tr>
          </table>

          <!-- Large, Crystal Clear Bloom's Taxonomy Pyramid Diagram -->
          <div style="border-top:1px solid #000; padding-top:12px; text-align:center;">
            <div style="font-size:11px; font-weight:700; margin-bottom:8px; text-transform:uppercase; color:#333;">Bloom's Taxonomy Cognitive Domain Levels</div>
            <img src="assets/blooms_taxonomy.png" style="max-width:100%; height:240px; display:block; margin:0 auto; object-fit:contain;" alt="Bloom's Taxonomy Pyramid">
          </div>
        </div>

        <!-- Student Notice Box -->
        <div style="border:2px solid #C00000; background:#FFF5F5; padding:10px 14px; margin-bottom:18px; border-radius:4px; font-size:11px; color:#900;">
          <strong style="font-size:12px;">📌 IMPORTANT SUBMISSION NOTICE FOR STUDENTS:</strong>
          <ul style="margin:4px 0 0 18px; padding:0;">
            <li><strong>Your data is unique:</strong> The values given in your questions are assigned only to you. Do not share or compare with others.</li>
            <li><strong>Portal submission is not enough:</strong> You must also submit your assignment sheets with complete solutions, diagrams, and working to finish your submission.</li>
          </ul>
        </div>

        <!-- Questions Section -->
        <div style="border-top:2px solid #000; padding-top:14px;">
          <h3 style="font-size:14px; margin-bottom:12px; text-transform:uppercase;">Experiment Questions & Evaluation Parameters</h3>
          
          ${asg.questions.map(q => {
            const substitutedText = q.text.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
              const val = studentVars[p1];
              if (val !== undefined) {
                // Variable loaded — show as yellow chip
                return `<span style="background:#FFF3BF; color:#742A2A; font-weight:700; padding:2px 6px; border:1px solid #D69E2E; border-radius:3px; font-family:var(--font-mono);">${val}</span>`;
              } else {
                // Variable missing — show as red placeholder
                return `<span style="background:var(--danger-subtle); color:var(--danger); font-weight:700; padding:2px 6px; border:1px solid var(--danger); border-radius:3px; font-family:var(--font-mono); font-size:11px;">{{${p1}}}</span>`;
              }
            });

            return `
              <div style="margin-bottom:20px; border-bottom:1px dashed #CCC; padding-bottom:14px;">
                <div style="display:flex; justify-content:space-between; font-weight:700; font-size:13px; margin-bottom:6px;">
                  <span>${q.sectionLabel} (${q.coId})</span>
                  <span>[Bloom's Level: ${q.btLevel}]</span>
                </div>

                <div style="font-size:13px; line-height:1.6; margin-bottom:10px;">${substitutedText}</div>

                ${q.imageUrl ? `
                  <div class="question-diagram-container" style="margin:10px 0;">
                    <img src="${app.getEmbeddableImageUrl(q.imageUrl)}" 
                         style="max-height:220px; width:auto; border:1px solid #CCC; border-radius:6px; display:block; max-width:100%; margin:8px 0;" 
                         alt="Diagram"
                         onerror="app.handleImageError(this, ${JSON.stringify(q.imageUrl || '')})">
                  </div>
                ` : ''}

                <!-- Answer Form Inputs -->
                <div style="background:#F8FAFC; border:1px solid #CBD5E1; padding:12px; border-radius:6px; margin-top:10px;">
                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:8px;">Enter Your Measured Answers:</div>
                  ${q.parameters.map(p => this.buildParameterSubmissionRow(asg.id, student.id, p)).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  buildParameterSubmissionRow(asgId, studentId, param) {
    // Check if student has variables loaded for this assignment
    const hasVarsLoaded = app.data.studentVariables.some(
      v => v.studentId === studentId && v.assignmentId === asgId
    );

    const priorAttempts = app.data.submissions.filter(s => s.studentId === studentId && s.parameterId === param.id);
    const attemptCount = priorAttempts.length;
    const latestAttempt = priorAttempts.length > 0 ? priorAttempts[priorAttempts.length - 1] : null;
    const isCapped = attemptCount >= 3;
    const isBlocked = !hasVarsLoaded;

    return `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px; font-size:12px;">
        <span style="font-weight:600; width:200px;">${param.label}:</span>
        
        <input type="number" step="any" id="input-val-${param.id}" class="form-input" placeholder="Value" 
          value="${latestAttempt ? latestAttempt.submittedValue : ''}" 
          ${isCapped || isBlocked ? 'disabled' : ''} style="width:110px; background:#FFF;">

        <input type="text" id="input-unit-${param.id}" class="form-input code-font" placeholder="Unit (${param.acceptedUnits.join('/')})" 
          value="${latestAttempt ? latestAttempt.submittedUnit : ''}" 
          ${isCapped || isBlocked ? 'disabled' : ''} style="width:110px; background:#FFF;">

        <button class="btn ${isCapped || isBlocked ? 'btn-ghost' : 'btn-primary'} btn-sm" 
          onclick="studentView.submitParameterAnswer('${asgId}', '${studentId}', '${param.id}')"
          ${isCapped || isBlocked ? 'disabled' : ''}>
          ${isCapped 
            ? '🔒 Max Attempts Used' 
            : isBlocked 
            ? '⏳ Awaiting Variables'
            : `Submit (Attempt ${attemptCount + 1}/3)`}
        </button>

        ${latestAttempt ? `
          <span class="tag tag-co" style="margin-left:auto; font-weight:600;">
            ✓ Recorded (Attempt ${latestAttempt.attemptNumber}/3)
          </span>
        ` : ''}
      </div>
    `;
  },

  calculateLatePenalty(studentBatch, assignmentId, submittedAt) {
    const schedule = app.getAssignmentSchedule(assignmentId, studentBatch);
    if (!schedule || !schedule.deadline) return 0;

    const deadlineMs = new Date(schedule.deadline).getTime();
    const submittedMs = new Date(submittedAt).getTime();

    if (submittedMs <= deadlineMs) return 0;

    const msLate = submittedMs - deadlineMs;
    const daysLate = Math.ceil(msLate / (1000 * 60 * 60 * 24));
    const penaltyPerDay = schedule.latePenaltyValue || 10;
    const maxCap = schedule.lateMaxCap || 30;

    return Math.min(daysLate * penaltyPerDay, maxCap);
  },

  submitParameterAnswer(asgId, studentId, paramId) {
    if (this._submitting) return;
    this._submitting = true;
    try {
      const valInput = document.getElementById(`input-val-${paramId}`);
      const unitInput = document.getElementById(`input-unit-${paramId}`);
      if (!valInput || !valInput.value) {
        app.showToast('Please enter a numerical value before submitting', 'warning');
        return;
      }

      const priorAttempts = app.data.submissions.filter(s => s.studentId === studentId && s.parameterId === paramId);
      if (priorAttempts.length >= 3) {
        app.showToast('Maximum attempt limit reached (3/3 attempts used). Submissions closed.', 'danger');
        return;
      }

      const hasVarsLoaded = app.data.studentVariables.some(
        v => v.studentId === studentId && v.assignmentId === asgId
      );
      if (!hasVarsLoaded) {
        app.showToast('Cannot submit — your question variables have not been loaded yet. Contact your faculty.', 'danger');
        return;
      }

      const nextAttemptNum = priorAttempts.length + 1;
      const submittedVal = parseFloat(valInput.value);
      const submittedUnit = (unitInput ? unitInput.value : '').trim();

      const student = app.data.students.find(s => s.id === studentId);
      const studentBatch = student ? student.batch : 'A1';
      const submittedAt = new Date().toISOString();
      const latePenaltyPct = this.calculateLatePenalty(studentBatch, asgId, submittedAt);

      const gt = app.data.studentAnswers.find(a => a.studentId === studentId && a.parameterId === paramId);
      let isCorrectValue = true;
      let isCorrectUnit = true;
      const attemptDeductionPct = nextAttemptNum === 1 ? 0 : nextAttemptNum === 2 ? 10 : 20;
      let marksAwarded = 4;

      if (gt) {
        const expectedVal = parseFloat(gt.correctValue);
        const diffPct = Math.abs(submittedVal - expectedVal) / expectedVal * 100;
        isCorrectValue = diffPct <= 5.0; // 5% tolerance
        isCorrectUnit = submittedUnit.toLowerCase() === (gt.correctUnit || '').toLowerCase();
        
        const baseMarks = isCorrectValue ? 4 : (diffPct <= 10.0 ? 2 : 0);
        const afterAttemptDeduction = baseMarks * (1 - attemptDeductionPct / 100);
        marksAwarded = Math.max(0, Math.round(afterAttemptDeduction * (1 - latePenaltyPct / 100)));
      } else {
        const afterAttemptDeduction = 4 * (1 - attemptDeductionPct / 100);
        marksAwarded = Math.max(0, Math.round(afterAttemptDeduction * (1 - latePenaltyPct / 100)));
      }

      const newSubmissionRecord = {
        id: 'subm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        assignmentId: asgId,
        studentId: studentId,
        parameterId: paramId,
        attemptNumber: nextAttemptNum,
        submittedValue: valInput.value,
        submittedUnit: submittedUnit,
        isCorrectValue: isCorrectValue,
        isCorrectUnit: isCorrectUnit,
        marksAwarded: marksAwarded,
        attemptDeductionPct: attemptDeductionPct,
        latePenaltyPct: latePenaltyPct,
        deductionPct: attemptDeductionPct,
        isLate: latePenaltyPct > 0,
        submittedAt: submittedAt
      };

      app.data.submissions.push(newSubmissionRecord);
      app.saveState();
      app.syncSubmissionToSupabase(newSubmissionRecord);
      
      app.showToast(`Attempt ${nextAttemptNum}/3 recorded successfully`, 'success');
    } finally {
      this._submitting = false;
    }

    this.renderSolverCanvas(document.getElementById('main-content'));

    // Scroll to the submitted parameter row so student can see confirmation
    setTimeout(() => {
      const submittedRow = document.getElementById(`input-val-${paramId}`);
      if (submittedRow) {
        submittedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  },

  renderStudentGrades(container) {
    const student = app.data.students.find(s => s.id === app.activeStudentId) || (app.data.students.length > 0 ? app.data.students[0] : null);
    const studentAssignments = this.getAssignmentsForStudent(student);
    const activeAsg = studentAssignments.length > 0 ? (studentAssignments.find(a => a.id === app.activeAssignmentId) || studentAssignments[0]) : null;
    const mySubmissions = student && activeAsg
      ? app.data.submissions.filter(s => s.studentId === student.id && s.assignmentId === activeAsg.id)
      : [];
    const schedule = activeAsg ? app.getAssignmentSchedule(activeAsg.id, student ? student.batch : 'A1') : null;

    const studentTitle = student ? `${student.name} (${student.uin})` : 'No Student Profile Selected';

    // Calculate Summary Metrics
    let maxPossibleMarks = 0;
    if (activeAsg && activeAsg.questions) {
      activeAsg.questions.forEach(q => {
        (q.parameters || []).forEach(p => {
          maxPossibleMarks += (p.valueMarks || 4);
        });
      });
    }
    if (maxPossibleMarks === 0) maxPossibleMarks = 10;

    let totalMarks = 0;
    const parameterIds = [...new Set(mySubmissions.map(s => s.parameterId))];
    parameterIds.forEach(pid => {
      const attemptsForParam = mySubmissions.filter(s => s.parameterId === pid);
      const bestAttempt = attemptsForParam.reduce((best, s) => 
        (s.marksAwarded || 0) > (best.marksAwarded || 0) ? s : best
      , attemptsForParam[0]);
      totalMarks += (bestAttempt ? bestAttempt.marksAwarded || 0 : 0);
    });

    const percentage = maxPossibleMarks > 0 ? Math.min(100, Math.round((totalMarks / maxPossibleMarks) * 100)) : 0;
    const isGradesReleased = schedule && schedule.gradesReleased;

    container.innerHTML = `
      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">My Results</h1>
          <p class="page-subtitle">Personalized Gradesheet & Assessment Report for <strong>${studentTitle}</strong></p>
        </div>
        <div class="print-hide" style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="studentView.exportStudentGradesCSV()">
            📥 Export CSV Gradesheet
          </button>
          <button class="btn btn-primary" onclick="studentView.printStudentGradesheet()">
            🖨️ Print / Save PDF Gradesheet
          </button>
        </div>
      </div>

      <!-- Assignment Selector -->
      ${studentAssignments.length > 1 ? `
      <div class="card" style="padding:14px 20px; margin-bottom:4px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div style="display:flex; align-items:center; gap:12px;">
          <label style="font-size:13px; font-weight:600; color:var(--accent-blue); white-space:nowrap;">View Grades For:</label>
          <select class="form-select" style="flex:1; background:#FFF;" 
            onchange="app.activeAssignmentId=this.value; studentView.renderStudentGrades(document.getElementById('main-content'));">
            ${studentAssignments.map(a => `
              <option value="${a.id}" ${a.id === (activeAsg ? activeAsg.id : '') ? 'selected' : ''}>
                ${a.code} — ${a.title}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      ` : ''}

      <!-- Printable Header (Visible during Print only) -->
      <div class="printable-header" style="display:none; padding:20px; border-bottom:2px solid #000; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="margin:0; font-size:20px; font-weight:800; text-transform:uppercase;">Rizvi College of Engineering</h2>
            <div style="font-size:13px; font-weight:600; color:#444;">Department of First Year Engineering | Academic Year 2026-27</div>
            <div style="font-size:12px; color:#666; margin-top:2px;">Automated Canvas Assignment Gradesheet & Rubric Performance Log</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px; font-weight:700; color:var(--accent-blue);">OFFICIAL EVALUATION SHEET</div>
            <div style="font-size:11px; color:#666;">Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>
        <hr style="margin:12px 0; border:0; border-top:1px solid #ccc;">
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; font-size:12px;">
          <div><strong>Student Name:</strong> ${student ? student.name : 'N/A'}</div>
          <div><strong>UIN:</strong> ${student ? student.uin : 'N/A'}</div>
          <div><strong>Branch:</strong> ${student ? student.branch : 'N/A'}</div>
          <div><strong>Division / Batch:</strong> ${student ? (student.division + ' - ' + student.batch) : 'N/A'}</div>
        </div>
      </div>

      <!-- Summary KPI Scorecards -->
      <div class="kpi-grid" style="margin-bottom:24px;">
        <div class="kpi-card">
          <span class="kpi-label">Total Marks Awarded</span>
          <div class="kpi-value" style="color:var(--accent-blue);">${isGradesReleased ? `${totalMarks} / ${maxPossibleMarks}` : '🔒 Hidden'}</div>
          <span class="kpi-trend positive">${isGradesReleased ? `${percentage}% Score` : 'Pending Release'}</span>
          <span style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
            ${activeAsg ? activeAsg.code : 'All Assignments'}
          </span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Total Submissions Logged</span>
          <div class="kpi-value">${mySubmissions.length}</div>
          <span class="kpi-trend neutral">Canvas Parameter Attempts</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Performance Level</span>
          <div class="kpi-value" style="font-size:20px;">
            ${isGradesReleased ? (percentage >= 80 ? '🌟 Exemplary' : percentage >= 50 ? '👍 Satisfactory' : '⚠️ Needs Work') : '⏳ Pending'}
          </div>
          <span class="kpi-trend neutral">Auto-Graded Rubric</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Evaluation Status</span>
          <div class="kpi-value" style="font-size:18px;">
            <span class="tag ${isGradesReleased ? 'tag-success' : 'tag-warning'}">
              ${isGradesReleased ? '🟢 Grades Released' : '⏳ Hidden Pending Release'}
            </span>
          </div>
          <span class="kpi-trend neutral">Faculty Schedule Policy</span>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 class="card-title">Attempt History — ${activeAsg ? activeAsg.code + ': ' + activeAsg.title : 'All Assignments'}</h3>
          <span class="tag ${isGradesReleased ? 'tag-success' : 'tag-warning'}">
            ${isGradesReleased ? `✅ Ground Truth Verified` : '⏳ Pending Faculty Approval'} · ${mySubmissions.length} Attempt${mySubmissions.length !== 1 ? 's' : ''} Logged
          </span>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Attempt #</th>
                <th>Parameter ID</th>
                <th>Submitted Value</th>
                <th>Submitted Unit</th>
                <th>Attempt Penalty</th>
                <th>Late Penalty</th>
                <th>Evaluation Status</th>
                <th>Marks Awarded</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${mySubmissions.length === 0 ? `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-secondary);">No submissions recorded yet. Click "Active Canvas Sheet" to solve questions.</td></tr>` : 
                mySubmissions.map(s => `
                  <tr>
                    <td><span class="tag tag-bt">Attempt ${s.attemptNumber}/3</span></td>
                    <td style="font-family:var(--font-mono); font-weight:700;">${s.parameterId}</td>
                    <td style="font-weight:600;">${s.submittedValue}</td>
                    <td style="font-family:var(--font-mono);">${s.submittedUnit || '-'}</td>
                    <td>
                      <span style="color:var(--warning); font-weight:600;">
                        -${s.attemptDeductionPct || s.deductionPct || 0}%
                      </span>
                    </td>
                    <td>
                      ${(s.latePenaltyPct && s.latePenaltyPct > 0) ? `
                        <span style="color:var(--danger); font-weight:600;">-${s.latePenaltyPct}%</span>
                        <span class="tag tag-danger" style="margin-left:4px; font-size:10px;">LATE</span>
                      ` : `
                        <span style="color:var(--success); font-weight:600;">On Time</span>
                      `}
                    </td>
                    <td>
                      ${isGradesReleased ? `
                        <span class="tag ${s.isCorrectValue ? 'tag-success' : 'tag-danger'}">
                          ${s.isCorrectValue ? '✓ Correct (Within ±5%)' : '✕ Out of Range'}
                        </span>
                      ` : `<span class="tag tag-bt">Pending Evaluation</span>`}
                    </td>
                    <td style="font-weight:700; color:var(--accent-blue);">
                      ${isGradesReleased ? `${s.marksAwarded} Marks` : `Hidden`}
                    </td>
                    <td style="font-size:11px; color:var(--text-secondary);">${new Date(s.submittedAt).toLocaleString()}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Printable Footer Signature Block -->
      <div class="printable-footer" style="display:none; margin-top:40px; padding-top:20px; border-top:1px dashed #aaa; justify-content:space-between; font-size:12px;">
        <div style="text-align:center; width:200px;">
          <div style="border-bottom:1px solid #000; height:40px; margin-bottom:4px;"></div>
          <strong>Student Signature</strong>
        </div>
        <div style="text-align:center; width:200px;">
          <div style="border-bottom:1px solid #000; height:40px; margin-bottom:4px;"></div>
          <strong>Course Instructor Signature</strong>
        </div>
        <div style="text-align:center; width:200px;">
          <div style="border-bottom:1px solid #000; height:40px; margin-bottom:4px;"></div>
          <strong>Head of Department (FE)</strong>
        </div>
      </div>
    `;
  },

  exportStudentGradesCSV() {
    const student = app.data.students.find(s => s.id === app.activeStudentId) || (app.data.students.length > 0 ? app.data.students[0] : null);
    if (!student) {
      app.showToast('No active student profile found to export', 'danger');
      return;
    }

    const studentAssignments = this.getAssignmentsForStudent(student);
    const activeAsg = studentAssignments.find(a => a.id === app.activeAssignmentId) || (studentAssignments.length > 0 ? studentAssignments[0] : null);
    const mySubmissions = activeAsg
      ? app.data.submissions.filter(s => s.studentId === student.id && s.assignmentId === activeAsg.id)
      : app.data.submissions.filter(s => s.studentId === student.id);
    if (mySubmissions.length === 0) {
      app.showToast('No submission history found for student to export', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Assignment Code,Assignment Title,Student UIN,Student Name,Branch,Division,Batch,Attempt Number,Parameter ID,Submitted Value,Submitted Unit,Attempt Deduction %,Late Penalty %,Is Late,Evaluation Status,Marks Awarded,Submission Timestamp\n";

    mySubmissions.forEach(s => {
      const asgCode = `"${activeAsg ? activeAsg.code : ''}"`;
      const asgTitle = `"${activeAsg ? activeAsg.title : ''}"`;
      const uin = `"${student.uin || ''}"`;
      const name = `"${student.name || ''}"`;
      const branch = `"${student.branch || ''}"`;
      const div = `"${student.division || ''}"`;
      const batch = `"${student.batch || ''}"`;
      const attempt = s.attemptNumber;
      const paramId = `"${s.parameterId || ''}"`;
      const val = `"${s.submittedValue || ''}"`;
      const unit = `"${s.submittedUnit || ''}"`;
      const attemptDed = s.attemptDeductionPct || s.deductionPct || 0;
      const latePen = s.latePenaltyPct || 0;
      const isLate = s.isLate ? "Yes" : "No";
      const evalStatus = s.isCorrectValue ? "Correct" : "Incorrect";
      const marks = s.marksAwarded || 0;
      const time = `"${new Date(s.submittedAt).toLocaleString()}"`;

      csvContent += `${asgCode},${asgTitle},${uin},${name},${branch},${div},${batch},${attempt},${paramId},${val},${unit},${attemptDed}%,${latePen}%,${isLate},${evalStatus},${marks},${time}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gradesheet_${student.uin}_${activeAsg ? activeAsg.code.replace(/[\/]/g, '_') : 'All'}_${student.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Exported CSV Gradesheet for ${student.name} (${mySubmissions.length} records)`, 'success');
  },

  printStudentGradesheet() {
    // Show printable headers & footers temporarily for printing
    const printableHeader = document.querySelector('.printable-header');
    const printableFooter = document.querySelector('.printable-footer');
    if (printableHeader) printableHeader.style.display = 'block';
    if (printableFooter) printableFooter.style.display = 'flex';

    window.print();

    // Re-hide printable elements after browser print dialog closes
    setTimeout(() => {
      if (printableHeader) printableHeader.style.display = 'none';
      if (printableFooter) printableFooter.style.display = 'none';
    }, 1000);
  }
};
