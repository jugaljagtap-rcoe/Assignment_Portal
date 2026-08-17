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

    const navHtml = `
      <div class="segmented-control print-hide" style="margin-bottom:20px; width:fit-content;">
        <button class="segmented-btn ${activeNav === 'dashboard' || !activeNav ? 'active' : ''}" onclick="app.switchNav('dashboard')">📋 My Assignments</button>
        <button class="segmented-btn ${activeNav === 'solver' ? 'active' : ''}" onclick="app.switchNav('solver')">✏️ Solve Assignment</button>
        <button class="segmented-btn ${activeNav === 'grades' ? 'active' : ''}" onclick="app.switchNav('grades')">🏆 My Results</button>
      </div>
    `;
    container.insertAdjacentHTML('afterbegin', navHtml);
  },

  getAssignmentsForStudent(student) {
    let allAssignments = app.data.assignments || [];
    if (allAssignments.length === 0) return [];

    // Part 11 Fix: Students should ONLY see published or locked assignments (no drafts)
    if (app.currentRole === 'student') {
      allAssignments = allAssignments.filter(a =>
        (a.lifecycle_status || a.state || '').toLowerCase() !== 'draft'
      );
    }

    if (!student) return allAssignments;

    const studentYear = (student.yearOfStudy || 'FE').toUpperCase().trim();
    if (!studentYear || studentYear === 'FE') return allAssignments;

    const FE_SEMESTERS = ['SEMESTER I', 'SEMESTER II', 'SEM I', 'SEM II', 'SEM 1', 'SEM 2'];
    const SE_SEMESTERS = ['SEMESTER III', 'SEMESTER IV', 'SEM III', 'SEM IV', 'SEM 3', 'SEM 4'];
    const TE_SEMESTERS = ['SEMESTER V', 'SEMESTER VI', 'SEM V', 'SEM VI', 'SEM 5', 'SEM 6'];
    const BE_SEMESTERS = ['SEMESTER VII', 'SEMESTER VIII', 'SEM VII', 'SEM VIII', 'SEM 7', 'SEM 8'];

    const allowedSemesters = {
      'SE': SE_SEMESTERS,
      'TE': TE_SEMESTERS,
      'BE': BE_SEMESTERS,
    }[studentYear] || null;

    const filtered = allAssignments.filter(asg => {
      const sub = (app.data.subjects || []).find(s => s.id === asg.subjectId || s.code === asg.subjectId);
      const semRaw = (asg.semester || sub?.semester || '').toUpperCase().trim();
      if (!semRaw) return true;
      if (FE_SEMESTERS.includes(semRaw)) return false;
      if (allowedSemesters) return allowedSemesters.includes(semRaw);
      return true;
    });

    return filtered;
  },

  getResolvedStudent() {
    let student = app.data.students.find(s => s.id === app.activeStudentId);
    if (!student && app.currentUser && app.currentUser.email) {
      const email = app.currentUser.email.trim().toLowerCase();
      const uin = (app.currentUser.uin || '').trim().toLowerCase();
      student = app.data.students.find(s =>
        (s.email && s.email.trim().toLowerCase() === email) ||
        (s.uin && s.uin.trim().toLowerCase() === uin)
      );
    }
    if (!student && app.data.students.length > 0) {
      student = app.data.students[0];
    }
    return student || null;
  },

  renderDashboard(container) {
    const student = this.getResolvedStudent();

    if (!student && app.currentUser && app.currentUser.role === 'student') {
      container.innerHTML = `
        <div class="card" style="padding:48px 24px; text-align:center;">
          <div style="font-size:48px; margin-bottom:12px;">⚠️</div>
          <h2 style="font-size:18px; font-weight:700; margin-bottom:8px;">Student Profile Not Found</h2>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Your student profile (${app.currentUser.email}) could not be found in the Student Master roster. 
            Please contact your administrator at <strong>jugaljagtap@eng.rizvi.edu.in</strong> to ensure your account is enrolled.
          </p>
        </div>
      `;
      return;
    }

    const assignments = this.getAssignmentsForStudent(student);
    let activeAsg = assignments.length > 0 ? (assignments.find(a => a.id === app.activeAssignmentId) || assignments[0]) : null;
    let schedule = activeAsg ? app.getAssignmentSchedule(activeAsg.id, student ? student.batch : 'A1') : null;

    const totalEarnedMarks = student ? this.calculateStudentTotalMarks(student.id) : 0;
    let totalPossibleMarks = 0;
    assignments.forEach(a => {
      const qList = (a.questions || []).map(q => typeof q === 'string' ? JSON.parse(q) : q);
      qList.forEach(q => {
        totalPossibleMarks += (parseFloat(q.max_marks || q.maxMarks) || 10);
      });
    });

    container.innerHTML = `
      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">Welcome back, ${student ? student.name : 'Student'}!</h1>
          <p class="page-subtitle">UIN: <strong class="mono-val">${student ? student.uin : '--'}</strong> · Branch: <strong>${student ? student.branch : 'Engineering'}</strong></p>
        </div>
        
        <div style="display:flex; gap:12px; align-items:center;">
          ${(app.currentRole === 'admin' || (app.currentUser && app.currentUser.isDualRole)) ? `
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-size:12px; font-weight:600; color:var(--text-secondary);">Student Perspective:</label>
              <select class="form-select" style="font-size:12px; height:32px; background:#FFF;" onchange="app.setActiveStudent(this.value);">
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

      <div style="margin-bottom:16px;">
        <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); display:block; margin-bottom:6px;">Assignment Journey Timeline</label>
        <div class="timeline-pills-row">
          ${assignments.map(a => {
            const isActive = activeAsg && a.id === activeAsg.id;
            const aSubRecord = (app.data.assignmentSubmissions || []).find(as => as.studentId === (student ? student.id : '') && as.assignmentId === a.id);
            const status = aSubRecord ? aSubRecord.status : 'not_started';

            let label = 'Not Started';
            let pillClass = 'pill-draft';
            if (status === 'submitted') { label = '✓ Submitted'; pillClass = 'pill-published active'; }
            else if (status === 'late') { label = '🕐 Late'; pillClass = 'pill-flagged'; }
            else if (status === 'partial') { label = '🟡 Partial'; pillClass = 'pill-pending'; }

            return `
              <div class="timeline-pill ${isActive ? 'active' : pillClass}" onclick="app.startAssignment('${a.id}');">
                ${a.code}: ${label}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">My Class & Division</span>
          <span class="kpi-value">${student ? `${student.yearOfStudy || 'FE'} ${student.division} / ${student.batch}` : '--'}</span>
          <span class="kpi-trend positive">${student ? student.branch : 'No Branch'}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Assigned Experiments</span>
          <span class="kpi-value">${assignments.length}</span>
          <span class="kpi-trend ${assignments.length > 0 ? 'positive' : 'neutral'}">
            ${assignments.filter(a => app.getAssignmentSchedule(a.id, student ? student.batch : 'A1')?.submissionsOpen).length} Open Submissions
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Active Experiment</span>
          <span class="kpi-value" style="font-size:20px; font-family:var(--font-mono); color:var(--accent-blue);" title="${activeAsg ? activeAsg.title : ''}">
            ${activeAsg ? activeAsg.code : 'None'}
          </span>
          <span class="kpi-trend ${schedule && schedule.submissionsOpen ? 'positive' : 'negative'}">
            ${schedule ? (schedule.submissionsOpen ? '● Submissions Open' : '● Submissions Closed') : 'No Schedule'}
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">My Marks Earned</span>
          <span class="kpi-value">${totalEarnedMarks.toFixed(1)} / ${totalPossibleMarks}</span>
          <span class="kpi-trend positive">
            ${schedule ? (schedule.gradesReleased ? 'Grades Released' : 'Pending Evaluation') : 'No Grades'}
          </span>
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
                <th>Submission Status</th>
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
                const aSubRecord = (app.data.assignmentSubmissions || []).find(as => as.studentId === student?.id && as.assignmentId === asg.id);
                const stStatus = aSubRecord ? aSubRecord.status : 'not_started';

                return `
                  <tr style="${isActive ? 'background:var(--accent-blue-subtle);' : ''}">
                    <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${asg.code}</td>
                    <td style="font-weight:600;">${asg.title}</td>
                    <td><span class="tag tag-co">${sub ? sub.code : ''}</span></td>
                    <td style="font-size:12px; font-weight:600;">${sch ? new Date(sch.deadline).toLocaleString() : '—'}</td>
                    <td>
                      <span class="col-pill ${stStatus === 'submitted' ? 'pill-verified' : stStatus === 'late' ? 'pill-flagged' : stStatus === 'partial' ? 'pill-pending' : 'pill-draft'}">
                        ${stStatus.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button class="btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="app.startAssignment('${asg.id}');">
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
    const student = app.data.students.find(s => s.id === studentId || s.uin === studentId);
    const uin = student ? student.uin : studentId;
    app.data.submissions.forEach(s => {
      if (s.studentId === studentId || (uin && s.studentId === uin)) sum += (s.marksAwarded || 0);
    });
    return sum;
  },

  renderSolverCanvas(container) {
    try {
      const student = this.getResolvedStudent();
      const studentAssignments = this.getAssignmentsForStudent(student);
      const asg = (app.data.assignments || []).find(a => a.id === app.activeAssignmentId || a.code === app.activeAssignmentId || (a.originalId && a.originalId === app.activeAssignmentId)) ||
                  studentAssignments.find(a => a.id === app.activeAssignmentId || a.code === app.activeAssignmentId || (a.originalId && a.originalId === app.activeAssignmentId)) ||
                  (studentAssignments.length > 0 ? studentAssignments[0] : null);

      if (!asg || !student) {
        container.innerHTML = `
          <div class="card" style="padding:40px; text-align:center;">
            <h2 style="font-size:18px; margin-bottom:8px;">No Active Canvas Sheet</h2>
            <p style="color:var(--text-secondary); margin-bottom:16px;">
              ${!student ? 'No student profile selected.' : 'There are currently no published lab assignments for your class/branch to solve.'}
            </p>
            <button class="btn btn-secondary" onclick="app.switchNav('dashboard')">← Return to Student Portal</button>
          </div>
        `;
        return;
      }

      if (!asg.questions || asg.questions.length === 0) {
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
              Your faculty is still building the questions for <strong>${asg.code}</strong>. Please check back later.
            </p>
          </div>
        `;
        return;
      }

      const schedule = app.getAssignmentSchedule(asg.id, student ? student.batch : 'A1') || {
        deadline: '2026-12-31T23:59',
        submissionsOpen: true,
        gradesReleased: true,
        latePenaltyValue: 10,
        lateMaxCap: 30
      };

      const deadlineText = schedule.deadline ? new Date(schedule.deadline).toLocaleString() : '31/12/2026, 11:59:00 PM';
      const isLate = schedule.deadline ? new Date() > new Date(schedule.deadline) : false;

      const studentVars = {};
      (app.data.studentVariables || []).forEach(v => {
        if (v.studentId === student.id && (v.assignmentId === asg.id || v.assignmentId === asg.code || v.assignmentId === asg.originalId)) {
          studentVars[v.key] = v.value;
        }
      });

      container.innerHTML = `
        <div class="page-header-container print-hide">
          <div>
            <h1 class="page-title">Solve Assignment</h1>
            <p class="page-subtitle">${asg.code} — ${asg.title}</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary" onclick="app.renderAssignmentSheet('${asg.id}', '${student ? student.id : ''}')">📄 View Assignment Sheet</button>
            <button class="btn btn-secondary" onclick="window.print()">🖨️ Print / Save PDF</button>
          </div>
        </div>

        <div class="print-hide" style="margin-bottom:16px;">
          <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); display:block; margin-bottom:6px;">Assignment Journey Timeline</label>
          <div class="timeline-pills-row">
            ${studentAssignments.map(a => {
              const isActive = asg && a.id === asg.id;
              const aSubRecord = (app.data.assignmentSubmissions || []).find(as => as.studentId === student.id && as.assignmentId === a.id);
              const status = aSubRecord ? aSubRecord.status : 'not_started';
              
              let label = 'Not Started';
              let pillClass = '';
              if (status === 'submitted') { label = '✓ Submitted'; pillClass = 'active'; }
              else if (status === 'late') { label = '🕐 Late'; pillClass = ''; }
              else if (status === 'partial') { label = '🟡 Partial'; pillClass = ''; }

              return `
                <div class="timeline-pill ${isActive ? 'active' : pillClass}" onclick="app.startAssignment('${a.id}');">
                  ${a.code}: ${label}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card print-hide" style="margin-bottom:20px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:var(--accent-blue);">📅 Batch ${student.batch} Deadline:</strong> ${deadlineText}
              <span style="font-size:12px; color:var(--text-secondary); margin-left:12px;">(Attempts Allowed: Max 3 per parameter | Retries: 2nd = -10%, 3rd = -20%)</span>
              ${isLate ? `
                <div style="margin-top:8px; background:var(--danger-subtle); border:1px solid var(--danger); border-radius:var(--radius-md); padding:8px 12px; font-size:12px; color:var(--danger); font-weight:600;">
                  ⚠️ LATE SUBMISSION: Your batch deadline has passed. A late penalty of ${schedule.latePenaltyValue || 10}% per day will be applied.
                </div>
              ` : ''}
            </div>
            <span class="tag ${schedule.submissionsOpen === false ? 'tag-danger' : 'tag-success'}">${schedule.submissionsOpen === false ? 'Submissions Closed' : 'Submissions Open'}</span>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:20px;">
          ${(asg.questions || []).map((q, qIndex) => {
            const qPrefix = `Q${qIndex + 1}_`;
            const qStudentVars = {};
            Object.keys(studentVars).forEach(k => {
              if (k.startsWith(qPrefix)) {
                qStudentVars[k.slice(qPrefix.length)] = studentVars[k];
              }
            });
            return `
              <div class="card" style="padding:20px;">
                <strong style="font-size:15px; color:var(--accent-blue);">${q.sectionLabel || `Question ${qIndex+1}`}</strong>
                <div style="font-size:14px; margin-top:8px; line-height:1.6;">${app.formatQuestionText(q.text, qStudentVars)}</div>
                ${q.imageUrl ? `<img src="${app.getEmbeddableImageUrl(q.imageUrl)}" style="max-width:100%; height:auto; margin-top:12px; border-radius:8px;">` : ''}

                <div style="margin-top:16px; border-top:1px solid var(--border-default); padding-top:16px;">
                  <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary);">Evaluation Parameters</label>
                  <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
                    ${(q.parameters || []).map(p => this.renderParameterInputField(asg.id, student.id, q, p)).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch(e) {
      console.error('Error rendering solver canvas:', e);
      container.innerHTML = `<div class="card"><div class="empty-state">Error loading assignment canvas.</div></div>`;
    }
  },

  renderParameterInputField(asgId, studentId, question, param) {
    const paramId = param.id;
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    const rubric = app.getRubricPreset(asg?.rubric_preset_id || asg?.rubricPresetId);

    // Multipliers
    const gMult = rubric?.given_multiplier ?? 1;
    const iMult = rubric?.intermediate_multiplier ?? 2;
    const fMult = rubric?.final_multiplier ?? 3;

    // Calculate parameter share of question max_marks
    const qParams = question.parameters || [];
    const sumMults = qParams.reduce((sum, p) => {
      const type = p.parameter_type || p.parameterType || 'intermediate';
      const m = type === 'given' ? gMult : type === 'final' ? fMult : iMult;
      return sum + m;
    }, 0) || 1;

    const pType = param.parameter_type || param.parameterType || 'intermediate';
    const pMult = pType === 'given' ? gMult : pType === 'final' ? fMult : iMult;
    const qMaxMarks = parseFloat(question.max_marks || question.maxMarks) || 10;
    const paramShareMarks = (pMult / sumMults) * qMaxMarks;

    const priorAttempts = app.data.submissions.filter(s => s.studentId === studentId && s.parameterId === paramId);
    const attemptCount = priorAttempts.length;
    const isCapped = attemptCount >= 3;
    const latestAttempt = priorAttempts.length > 0 ? priorAttempts[priorAttempts.length - 1] : null;

    let bestRawMarks = 0;
    let bestFinalMarks = 0;
    priorAttempts.forEach(s => {
      bestRawMarks = Math.max(bestRawMarks, s.rawMarks || s.raw_marks || s.marksAwarded || 0);
      bestFinalMarks = Math.max(bestFinalMarks, s.marksAwarded || s.finalMarks || 0);
    });

    const gt = app.data.studentAnswers.find(a => a.studentId === studentId && a.parameterId === paramId);
    const narrativeTags = latestAttempt ? app.computeAttemptNarrativeTag(latestAttempt, gt, param) : [];

    return `
      <div style="background:var(--bg-subtle); padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <strong style="font-size:13px; color:var(--text-primary);">${param.label}</strong>
            <span class="tag tag-co" style="font-size:10px; margin-left:6px; text-transform:uppercase;">${pType} (${pMult}x)</span>
            <span style="font-size:11px; color:var(--text-secondary); margin-left:8px;">(Param Share: <strong class="mono-val">${paramShareMarks.toFixed(2)}</strong> / Q Max ${qMaxMarks})</span>
          </div>
          <span class="mono-val" style="font-size:12px; font-weight:700; color:var(--accent-blue);">Attempt ${attemptCount}/3</span>
        </div>

        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <input type="number" step="any" id="input-val-${paramId}" class="form-input code-font" placeholder="Value" 
            value="${latestAttempt ? latestAttempt.submittedValue : ''}" ${isCapped ? 'disabled' : ''} style="width:140px; background:#FFF;">

          <input type="text" id="input-unit-${paramId}" class="form-input code-font" placeholder="Unit (${param.unitHint || ''})" 
            value="${latestAttempt ? latestAttempt.submittedUnit : ''}" ${isCapped ? 'disabled' : ''} style="width:120px; background:#FFF;">

          <button class="btn ${isCapped ? 'btn-ghost' : 'btn-primary'} btn-sm" onclick="studentView.submitParameterAnswer('${asgId}', '${studentId}', '${paramId}')" ${isCapped ? 'disabled' : ''}>
            ${isCapped ? '🔒 Max Attempts Used' : `Submit (Attempt ${attemptCount + 1}/3)`}
          </button>
        </div>

        ${priorAttempts.length > 0 ? `
          <div class="param-summary-footer" style="margin-top:10px;">
            <span>Attempts: <strong class="mono-val">${attemptCount} / 3</strong></span>
            <span>Raw Marks: <strong class="mono-val" style="color:var(--accent-blue);">${bestRawMarks.toFixed(2)} / ${paramShareMarks.toFixed(2)}</strong></span>
            <span>Final Marks: <strong class="mono-val" style="color:var(--success);">${bestFinalMarks.toFixed(2)} / ${paramShareMarks.toFixed(2)}</strong></span>
            ${latestAttempt && latestAttempt.attemptDeductionPct > 0 ? `<span style="color:var(--warning); font-size:11px; font-weight:600;">⚠️ ${latestAttempt.attemptDeductionPct}% attempt deduction</span>` : ''}
            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">
              ${narrativeTags.map(t => `<span class="tag tag-co" style="font-size:10px;">${t}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  async submitParameterAnswer(asgId, studentId, paramId) {
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
        app.showToast('Maximum attempt limit reached (3/3 attempts used)', 'danger');
        return;
      }

      const nextAttemptNum = priorAttempts.length + 1;
      const submittedVal = parseFloat(valInput.value);
      const submittedUnit = (unitInput ? unitInput.value : '').trim();
      const submittedAt = new Date().toISOString();

      const asg = (app.data.assignments || []).find(a => a.id === asgId);
      const rubric = app.getRubricPreset(asg?.rubric_preset_id || asg?.rubricPresetId);

      // Multipliers
      const gMult = rubric?.given_multiplier ?? 1;
      const iMult = rubric?.intermediate_multiplier ?? 2;
      const fMult = rubric?.final_multiplier ?? 3;

      // Find Question & Param
      const questions = (asg?.questions || []).map(q => typeof q === 'string' ? JSON.parse(q) : q);
      let targetQ = null;
      let targetParam = null;
      for (const q of questions) {
        const p = (q.parameters || []).find(param => param.id === paramId);
        if (p) { targetQ = q; targetParam = p; break; }
      }

      const qMaxMarks = parseFloat(targetQ?.max_marks || targetQ?.maxMarks) || 10;
      const qParams = targetQ?.parameters || [];
      const sumMults = qParams.reduce((sum, p) => {
        const type = p.parameter_type || p.parameterType || 'intermediate';
        const m = type === 'given' ? gMult : type === 'final' ? fMult : iMult;
        return sum + m;
      }, 0) || 1;

      const pType = targetParam?.parameter_type || targetParam?.parameterType || 'intermediate';
      const pMult = pType === 'given' ? gMult : pType === 'final' ? fMult : iMult;
      const paramShareMarks = (pMult / sumMults) * qMaxMarks;

      const numWeight = (rubric?.numerical_weight ?? 70) / 100;
      const unitWeight = (rubric?.units_weight ?? 30) / 100;

      const numericalShare = paramShareMarks * numWeight;
      const unitsShare = paramShareMarks * unitWeight;

      const tolEx = rubric?.tolerance_exemplary ?? 2;
      const tolPr = rubric?.tolerance_proficient ?? 5;
      const tolDev = rubric?.tolerance_developing ?? 10;

      const gt = app.data.studentAnswers.find(a => a.studentId === studentId && a.parameterId === paramId) ||
                 { correctValue: targetParam?.correctValue };

      let isCorrectValue = false;
      let numericalEarned = 0;

      if (gt && gt.correctValue !== undefined && gt.correctValue !== '') {
        const expectedVal = parseFloat(gt.correctValue);
        let diffPct = 0;
        if (!isNaN(expectedVal) && expectedVal !== 0) {
          diffPct = Math.abs(submittedVal - expectedVal) / Math.abs(expectedVal) * 100;
        }
        if (diffPct <= tolEx) {
          isCorrectValue = true;
          numericalEarned = numericalShare; // 100%
        } else if (diffPct <= tolPr) {
          isCorrectValue = true;
          numericalEarned = numericalShare * 0.75; // 75%
        } else if (diffPct <= tolDev) {
          isCorrectValue = false;
          numericalEarned = numericalShare * 0.50; // 50%
        } else {
          isCorrectValue = false;
          numericalEarned = 0;
        }
      } else {
        // Fallback default full credit if ground truth unconfigured
        numericalEarned = numericalShare;
        isCorrectValue = true;
      }

      // Units correctness share: track but award full marks (deferred)
      const unitsEarned = unitsShare;
      const isCorrectUnit = true;

      const rawMarks = numericalEarned + unitsEarned;

      // Attempt deduction rule
      let attemptDeductionPct = 0;
      if (rubric?.attempt_deductions_enabled) {
        attemptDeductionPct = nextAttemptNum === 1 ? 0 : nextAttemptNum === 2 ? 10 : 20;
      }

      const finalMarks = Math.max(0, rawMarks * (1 - attemptDeductionPct / 100));

      const newRecord = {
        id: 'subm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        assignmentId: asgId,
        studentId: studentId,
        parameterId: paramId,
        attemptNumber: nextAttemptNum,
        submittedValue: valInput.value,
        submittedUnit: submittedUnit,
        isCorrectValue: isCorrectValue,
        isCorrectUnit: isCorrectUnit,
        rawMarks: rawMarks,
        raw_marks: rawMarks,
        marksAwarded: finalMarks,
        finalMarks: finalMarks,
        attemptDeductionPct: attemptDeductionPct,
        verificationStatus: 'pending',
        submittedAt: submittedAt
      };

      app.data.submissions.push(newRecord);

      // Roll up record to assignment_submissions
      const allAsgParams = (asg?.questions || []).flatMap(q => {
        const parsed = typeof q === 'string' ? JSON.parse(q) : q;
        return parsed.parameters || [];
      });
      const studentAllAsgSubs = app.data.submissions.filter(s => s.studentId === studentId && s.assignmentId === asgId);
      const uniqueParamsDone = new Set(studentAllAsgSubs.map(s => s.parameterId)).size;
      const statusStr = uniqueParamsDone === 0 ? 'not_started' : uniqueParamsDone >= Math.max(1, allAsgParams.length) ? 'submitted' : 'partial';

      let totalEarned = 0;
      allAsgParams.forEach(p => {
        const pSubs = studentAllAsgSubs.filter(s => s.parameterId === p.id);
        const best = pSubs.reduce((b, s) => (s.marksAwarded || 0) > (b.marksAwarded || 0) ? s : b, pSubs[0]);
        if (best) totalEarned += (best.marksAwarded || 0);
      });

      const rolledUpRecord = {
        id: `asg-sub-${studentId}-${asgId}`,
        assignment_id: asgId,
        student_id: studentId,
        status: statusStr,
        parameters_completed: uniqueParamsDone,
        parameters_total: allAsgParams.length,
        total_marks_awarded: totalEarned,
        last_attempt_at: submittedAt
      };

      let existingRolledUp = (app.data.assignmentSubmissions || []).find(as => as.id === rolledUpRecord.id);
      if (existingRolledUp) {
        Object.assign(existingRolledUp, rolledUpRecord);
      } else {
        if (!app.data.assignmentSubmissions) app.data.assignmentSubmissions = [];
        app.data.assignmentSubmissions.push(rolledUpRecord);
      }

      app.saveState();
      await app.syncSubmissionToSupabase(newRecord);

      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
          await supabaseClient.from('assignment_submissions').upsert(rolledUpRecord);
        } catch(e) { console.warn('Rollup upsert notice:', e); }
      }

      app.showToast(`Attempt ${nextAttemptNum}/3 submitted successfully`, 'success');
    } finally {
      this._submitting = false;
    }

    this.renderSolverCanvas(document.getElementById('main-content'));
  },

  renderStudentGrades(container) {
    const student = this.getResolvedStudent();
    const studentAssignments = this.getAssignmentsForStudent(student);
    const activeAsg = studentAssignments.length > 0 ? (studentAssignments.find(a => a.id === app.activeAssignmentId) || studentAssignments[0]) : null;
    const mySubmissions = student && activeAsg ? app.data.submissions.filter(s => (s.studentId === student.id || s.studentId === student.uin) && s.assignmentId === activeAsg.id) : [];

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">My Results</h1>
          <p class="page-subtitle">Gradesheet & Evaluation History for <strong>${student ? student.name : 'Student'}</strong></p>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 class="card-title" style="margin-bottom:12px;">Attempt History — ${activeAsg ? activeAsg.code : 'All'}</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Attempt #</th>
                <th>Parameter ID</th>
                <th>Submitted Value</th>
                <th>Submitted Unit</th>
                <th>Narrative Tag</th>
                <th>Raw Marks</th>
                <th>Final Marks</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${mySubmissions.map(s => {
                const gt = app.data.studentAnswers.find(a => a.studentId === student?.id && a.parameterId === s.parameterId);
                const paramObj = (app.data.assignments || []).flatMap(a => {
                  const qList = typeof a.questions === 'string' ? JSON.parse(a.questions || '[]') : (a.questions || []);
                  return qList.flatMap(q => q.parameters || []);
                }).find(p => p.id === s.parameterId);
                const narrativeTags = app.computeAttemptNarrativeTag(s, gt, paramObj);

                const rawVal = (s.rawMarks ?? s.raw_marks ?? s.marksAwarded ?? 0);
                const finalVal = (s.marksAwarded ?? s.finalMarks ?? 0);

                return `
                  <tr>
                    <td><span class="tag tag-bt">Attempt ${s.attemptNumber}/3</span></td>
                    <td class="mono-val" style="font-weight:600;">${s.parameterId}</td>
                    <td class="mono-val" style="font-weight:700;">${s.submittedValue}</td>
                    <td><span class="tag tag-co">${s.submittedUnit || '-'}</span></td>
                    <td>
                      <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        ${narrativeTags.map(t => `<span class="tag tag-co" style="font-size:10px;">${t}</span>`).join('')}
                      </div>
                    </td>
                    <td class="mono-val" style="font-weight:800; color:var(--accent-blue);">${rawVal.toFixed(2)}</td>
                    <td class="mono-val" style="font-weight:800; color:var(--success);">${finalVal.toFixed(2)}</td>
                    <td class="mono-val" style="font-size:11px;">${new Date(s.submittedAt).toLocaleString()}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${this.renderStudentCOAttainmentHTML(student, activeAsg)}
    `;
  },

  renderStudentCOAttainmentHTML(student, activeAsg) {
    const courseOutcomes = app.data.courseOutcomes || [];
    if (courseOutcomes.length === 0 || !student) return '';

    const paramMap = {};
    (app.data.assignments || []).forEach(asg => {
      (asg.questions || []).forEach(q => {
        (q.parameters || []).forEach(p => {
          paramMap[p.id] = { coId: q.coId || 'CO1', valueMarks: p.valueMarks || 4 };
        });
      });
    });

    return `
      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">My Course Outcome (CO) Attainment Profile</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:14px;">
          ${courseOutcomes.map(co => {
            const relevantPids = Object.keys(paramMap).filter(pid => paramMap[pid].coId === co.code);
            let earned = 0;
            let maxMarks = 0;
            relevantPids.forEach(pid => {
              maxMarks += (paramMap[pid].valueMarks || 4);
              const sub = app.data.submissions.find(s => (s.studentId === student.id || s.studentId === student.uin) && s.parameterId === pid);
              if (sub) earned += (sub.marksAwarded || 0);
            });
            const pct = maxMarks > 0 ? Math.round((earned / maxMarks) * 100) : 0;
            const attained = pct >= (app.data.attainmentSettings?.studentThresholdPct || 60);

            return `
              <div style="background:var(--bg-subtle); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span class="tag ${co.type === 'LO' ? 'tag-lo' : 'tag-co'}">${co.code}</span>
                  <span class="tag ${attained ? 'tag-success' : 'tag-danger'}" style="font-size:11px;">${attained ? '✓ Attained' : '✕ Not Attained'}</span>
                </div>
                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">${co.description}</div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:8px;">
                  <span>Score: <strong class="mono-val">${earned.toFixed(1)} / ${maxMarks}</strong></span>
                  <strong class="mono-val" style="color:${attained ? 'var(--success)' : 'var(--danger)'};">${pct}%</strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
};
