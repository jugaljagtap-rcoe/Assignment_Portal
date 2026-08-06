/* ==========================================================================
   Rizvi College of Engineering - Student Module
   ========================================================================== */

const studentView = {
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

  renderDashboard(container) {
    const student = app.data.students.find(s => s.id === app.activeStudentId) || (app.data.students.length > 0 ? app.data.students[0] : null);
    const assignments = app.data.assignments || [];
    
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

    const studentHeader = student 
      ? `Welcome, <strong>${student.name}</strong> (<code class="code-font">${student.uin}</code>) | Branch: ${student.branch} | Div ${student.division} / Batch ${student.batch}`
      : `Welcome to Student Lab Portal | No Student Profile Selected`;

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Student Lab Portal</h1>
          <p class="page-subtitle">${studentHeader}</p>
        </div>
        ${activeAsg ? `<button class="btn btn-primary" onclick="app.switchNav('solver')">✏️ Open Active Canvas Sheet</button>` : ''}
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">My Class & Division</span>
          <span class="kpi-value">${student ? `${student.division} / ${student.batch}` : '--'}</span>
          <span class="kpi-trend positive">${student ? student.branch : 'No Branch'}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Active Assignment</span>
          <span class="kpi-value">${activeAsg ? `Exp ${String(activeAsg.number).padStart(2, '0')}` : '--'}</span>
          <span class="kpi-trend neutral">${activeAsg ? activeAsg.title.split(':')[0] : 'No Experiments'}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Batch Deadline</span>
          <span class="kpi-value" style="font-size:16px;">${schedule ? new Date(schedule.deadline).toLocaleDateString() : '--'}</span>
          <span class="kpi-trend ${schedule && schedule.submissionsOpen ? 'negative' : 'neutral'}">
            ${schedule ? (schedule.submissionsOpen ? 'Submissions Open' : 'Closed') : 'No Active Deadlines'}
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">My Marks Earned</span>
          <span class="kpi-value">${totalEarnedMarks} / ${totalPossibleMarks}</span>
          <span class="kpi-trend positive">
            ${schedule ? (schedule.gradesReleased ? 'Grades Released' : 'Pending Evaluation') : 'No Grades'}
          </span>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <h2 class="card-title" style="margin-bottom:16px;">Assigned Experiments</h2>
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
                    ℹ️ No lab experiments currently assigned. Contact your subject faculty.
                  </td>
                </tr>
              ` : assignments.map(asg => {
                const sub = app.data.subjects.find(s => s.id === asg.subjectId);
                const sch = app.getAssignmentSchedule(asg.id, student ? student.batch : 'A1');
                return `
                  <tr>
                    <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${asg.code}</td>
                    <td style="font-weight:600;">${asg.title}</td>
                    <td><span class="tag tag-co">${sub ? sub.code : ''}</span></td>
                    <td style="font-size:12px; font-weight:600;">${new Date(sch.deadline).toLocaleString()}</td>
                    <td><span class="tag ${sch.submissionsOpen ? 'tag-success' : 'tag-danger'}">${sch.submissionsOpen ? 'Open' : 'Closed'}</span></td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="app.activeAssignmentId='${asg.id}'; app.switchNav('solver');">Solve Canvas Sheet</button>
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
    const asg = app.data.assignments.find(a => a.id === app.activeAssignmentId) || (app.data.assignments.length > 0 ? app.data.assignments[0] : null);

    if (!asg || !student) {
      container.innerHTML = `
        <div class="card" style="padding:40px; text-align:center;">
          <h2 style="font-size:18px; margin-bottom:8px;">No Active Canvas Sheet</h2>
          <p style="color:var(--text-secondary); margin-bottom:16px;">There are currently no lab assignments published to solve.</p>
          <button class="btn btn-secondary" onclick="app.switchNav('dashboard')">← Return to Student Portal</button>
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

    if (!studentVars['var_m_kg']) studentVars['var_m_kg'] = (10 + (parseInt(student.uin) % 7)).toFixed(1);
    if (!studentVars['var_k_Nmm']) studentVars['var_k_Nmm'] = (350 + (parseInt(student.uin) % 150)).toFixed(1);
    if (!studentVars['var_c_Nsm']) studentVars['var_c_Nsm'] = (5.0 + (parseInt(student.uin) % 5)).toFixed(1);

    const currentDateFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Digital Canvas Assignment Sheet</h1>
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
          </div>
          <span class="tag tag-success">Submissions Open</span>
        </div>
      </div>

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
              const val = studentVars[p1] || "10.0";
              return `<span style="background:#FFF3BF; color:#742A2A; font-weight:700; padding:2px 6px; border:1px solid #D69E2E; border-radius:3px;">${val}</span>`;
            });

            return `
              <div style="margin-bottom:20px; border-bottom:1px dashed #CCC; padding-bottom:14px;">
                <div style="display:flex; justify-content:space-between; font-weight:700; font-size:13px; margin-bottom:6px;">
                  <span>${q.sectionLabel} (${q.coId})</span>
                  <span>[Bloom's Level: ${q.btLevel}]</span>
                </div>

                <div style="font-size:13px; line-height:1.6; margin-bottom:10px;">${substitutedText}</div>

                ${q.imageUrl ? `<img src="${q.imageUrl}" style="max-height:160px; display:block; margin:10px 0; border:1px solid #CCC;" alt="Diagram">` : ''}

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
    const priorAttempts = app.data.submissions.filter(s => s.studentId === studentId && s.parameterId === param.id);
    const attemptCount = priorAttempts.length;
    const latestAttempt = priorAttempts.length > 0 ? priorAttempts[priorAttempts.length - 1] : null;
    const isCapped = attemptCount >= 3;

    return `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px; font-size:12px;">
        <span style="font-weight:600; width:200px;">${param.label}:</span>
        
        <input type="number" step="any" id="input-val-${param.id}" class="form-input" placeholder="Value" 
          value="${latestAttempt ? latestAttempt.submittedValue : ''}" 
          ${isCapped ? 'disabled' : ''} style="width:110px; background:#FFF;">

        <input type="text" id="input-unit-${param.id}" class="form-input code-font" placeholder="Unit (${param.acceptedUnits.join('/')})" 
          value="${latestAttempt ? latestAttempt.submittedUnit : ''}" 
          ${isCapped ? 'disabled' : ''} style="width:110px; background:#FFF;">

        <button class="btn ${isCapped ? 'btn-ghost' : 'btn-primary'} btn-sm" 
          onclick="studentView.submitParameterAnswer('${asgId}', '${studentId}', '${param.id}')"
          ${isCapped ? 'disabled' : ''}>
          ${isCapped ? '🔒 Max Attempts Used' : `Submit (Attempt ${attemptCount + 1}/3)`}
        </button>

        ${latestAttempt ? `
          <span class="tag tag-co" style="margin-left:auto; font-weight:600;">
            ✓ Recorded (Attempt ${latestAttempt.attemptNumber}/3)
          </span>
        ` : ''}
      </div>
    `;
  },

  submitParameterAnswer(asgId, studentId, paramId) {
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

    const nextAttemptNum = priorAttempts.length + 1;
    const submittedVal = parseFloat(valInput.value);
    const submittedUnit = (unitInput ? unitInput.value : '').trim();

    const gt = app.data.studentAnswers.find(a => a.studentId === studentId && a.parameterId === paramId);
    let isCorrectValue = true;
    let isCorrectUnit = true;
    let marksAwarded = 4;

    if (gt) {
      const expectedVal = parseFloat(gt.correctValue);
      const diffPct = Math.abs(submittedVal - expectedVal) / expectedVal * 100;
      isCorrectValue = diffPct <= 5.0; // 5% tolerance
      isCorrectUnit = submittedUnit.toLowerCase() === (gt.correctUnit || '').toLowerCase();
      
      const deductionPct = nextAttemptNum === 1 ? 0 : nextAttemptNum === 2 ? 10 : 20;
      const baseMarks = isCorrectValue ? 4 : (diffPct <= 10.0 ? 2 : 0);
      marksAwarded = Math.max(0, Math.round(baseMarks * (1 - deductionPct / 100)));
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
      deductionPct: nextAttemptNum === 1 ? 0 : nextAttemptNum === 2 ? 10 : 20,
      submittedAt: new Date().toISOString()
    };

    app.data.submissions.push(newSubmissionRecord);
    app.saveState();
    
    app.showToast(`Attempt ${nextAttemptNum}/3 recorded successfully`, 'success');
    this.renderSolverCanvas(document.getElementById('main-content'));
  },

  renderStudentGrades(container) {
    const student = app.data.students.find(s => s.id === app.activeStudentId) || (app.data.students.length > 0 ? app.data.students[0] : null);
    const mySubmissions = student ? app.data.submissions.filter(s => s.studentId === student.id) : [];
    const activeAsg = app.data.assignments.length > 0 ? (app.data.assignments.find(a => a.id === app.activeAssignmentId) || app.data.assignments[0]) : null;
    const schedule = activeAsg ? app.getAssignmentSchedule(activeAsg.id, student ? student.batch : 'A1') : null;

    const studentTitle = student ? `${student.name} (${student.uin})` : 'No Student Profile Selected';

    // Calculate Summary Metrics
    let totalMarks = 0;
    let maxPossibleMarks = mySubmissions.length * 4 || 10;
    mySubmissions.forEach(s => {
      totalMarks += (s.marksAwarded || 0);
    });
    const percentage = maxPossibleMarks > 0 ? Math.min(100, Math.round((totalMarks / maxPossibleMarks) * 100)) : 0;
    const isGradesReleased = schedule && schedule.gradesReleased;

    container.innerHTML = `
      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">My Grades & Rubric Evaluation</h1>
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
          <h3 class="card-title">Attempt History & Parameter Evaluation Log</h3>
          <span class="tag ${isGradesReleased ? 'tag-success' : 'tag-warning'}">
            ${isGradesReleased ? '✅ Ground Truth Verified' : '⏳ Pending Faculty Approval'}
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
                <th>Evaluation Status</th>
                <th>Marks Awarded</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${mySubmissions.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-secondary);">No submissions recorded yet. Click "Active Canvas Sheet" to solve questions.</td></tr>` : 
                mySubmissions.map(s => `
                  <tr>
                    <td><span class="tag tag-bt">Attempt ${s.attemptNumber}/3</span></td>
                    <td style="font-family:var(--font-mono); font-weight:700;">${s.parameterId}</td>
                    <td style="font-weight:600;">${s.submittedValue}</td>
                    <td style="font-family:var(--font-mono);">${s.submittedUnit || '-'}</td>
                    <td><span style="color:var(--danger); font-weight:600;">-${s.deductionPct || 0}%</span></td>
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

    const mySubmissions = app.data.submissions.filter(s => s.studentId === student.id);
    if (mySubmissions.length === 0) {
      app.showToast('No submission history found for student to export', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student UIN,Student Name,Branch,Division,Batch,Attempt Number,Parameter ID,Submitted Value,Submitted Unit,Penalty Deduction %,Evaluation Status,Marks Awarded,Submission Timestamp\n";

    mySubmissions.forEach(s => {
      const uin = `"${student.uin || ''}"`;
      const name = `"${student.name || ''}"`;
      const branch = `"${student.branch || ''}"`;
      const div = `"${student.division || ''}"`;
      const batch = `"${student.batch || ''}"`;
      const attempt = s.attemptNumber;
      const paramId = `"${s.parameterId || ''}"`;
      const val = `"${s.submittedValue || ''}"`;
      const unit = `"${s.submittedUnit || ''}"`;
      const penalty = s.deductionPct || 0;
      const evalStatus = s.isCorrectValue ? "Correct" : "Incorrect";
      const marks = s.marksAwarded || 0;
      const time = `"${new Date(s.submittedAt).toLocaleString()}"`;

      csvContent += `${uin},${name},${branch},${div},${batch},${attempt},${paramId},${val},${unit},${penalty}%,${evalStatus},${marks},${time}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gradesheet_${student.uin}_${student.name.replace(/\s+/g, '_')}.csv`);
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
