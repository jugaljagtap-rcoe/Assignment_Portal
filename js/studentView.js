/* ==========================================================================
   Rizvi College of Engineering - Student Module
   ========================================================================== */

const studentView = {
  _submitting: false,

  getAsgTypeLabel(asg) {
    if (!asg) return 'Assignment';
    const t = (asg.series_type || asg.seriesType || 'A').toUpperCase();
    return { 'L': 'Lab Practical', 'A': 'Assignment', 'T': 'Test/Quiz', 'P': 'Project' }[t] || 'Assignment';
  },

  getAsgQuestions(asg) {
    if (!asg) return [];
    if (Array.isArray(asg.questions)) return asg.questions;
    if (typeof asg.questions === 'string') {
      try { return JSON.parse(asg.questions); } catch(_) { return []; }
    }
    return [];
  },

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

  getResolvedStudent() {
    const studentsForAY = app.getStudentsForAY();
    let student = studentsForAY.find(s => s.id === app.activeStudentId);
    if (!student && app.currentUser && app.currentUser.email) {
      const email = app.currentUser.email.trim().toLowerCase();
      const uin = (app.currentUser.uin || '').trim().toLowerCase();
      student = studentsForAY.find(s =>
        (s.email && s.email.trim().toLowerCase() === email) ||
        (s.uin && s.uin.trim().toLowerCase() === uin)
      );
    }
    if (!student && studentsForAY.length > 0) {
      student = studentsForAY[0];
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

    if (app.activeSubjectId) {
      const activeSub = (app.data.subjects || []).find(s => s.id === app.activeSubjectId);
      if (activeSub) {
        this.renderSubjectWorkspace(container, activeSub);
        return;
      }
    }

    const subjects = app.getSubjectsForStudent(student);
    const publishedAsgs = app.getAssignmentsForStudent(student);
    const studentsForAY = app.getStudentsForAY();

    container.innerHTML = `
      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">My Courses & Labs</h1>
          <p class="page-subtitle">${student ? student.name : 'Student'} · UIN: <strong class="mono-val">${student ? student.uin : '--'}</strong> · Branch: <strong>${student ? student.branch : 'Engineering'}</strong></p>
        </div>
        
        <div style="display:flex; gap:12px; align-items:center;">
          ${(app.currentRole === 'admin' || (app.currentUser && app.currentUser.isDualRole)) ? `
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-size:12px; font-weight:600; color:var(--text-secondary);">Student Perspective:</label>
              <select class="form-select" style="font-size:12px; height:32px; background:#FFF;" onchange="app.setActiveStudent(this.value);">
                ${studentsForAY.map(s => `
                  <option value="${s.id}" ${student && s.id === student.id ? 'selected' : ''}>
                    ${s.name} (${s.uin} - ${s.yearOfStudy || 'FE'} ${s.branch})
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}
        </div>
      </div>

      ${subjects.length === 0 ? `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">
            <div class="empty-state-emoji">📚</div>
            <h3 class="empty-state-title">No courses assigned yet</h3>
            <p class="empty-state-subtitle">Contact your administrator.</p>
          </div>
        </div>
      ` : `
        <div class="dept-blocks-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${subjects.map(sub => {
            const subjectAsgs = publishedAsgs.filter(a => a.subject_id === sub.id || a.subjectId === sub.id);
            const dept = (HARDCODED_DEPARTMENTS || []).find(d => d.id === (sub.departmentId || sub.department_id));
            
            let submittedCount = 0;
            let marksEarned = 0;

            subjectAsgs.forEach(a => {
              const aSubRecord = (app.data.assignmentSubmissions || []).find(as => as.studentId === student?.id && (as.assignmentId === a.id || as.assignment_id === a.id));
              const stStatus = aSubRecord ? aSubRecord.status : 'not_started';
              if (stStatus === 'submitted' || stStatus === 'late') submittedCount++;

              if (aSubRecord) marksEarned += (parseFloat(aSubRecord.total_marks_awarded) || 0);
            });

            const pendingCount = subjectAsgs.length - submittedCount;

            return `
              <div class="card subject-card-item" style="cursor:pointer; transition:transform 0.15s ease, box-shadow 0.15s ease; border-top: 4px solid var(--accent-blue);" onclick="app.activeSubjectId = '${sub.id}'; studentView.renderSubjectWorkspace(document.getElementById('main-content'), (app.data.subjects || []).find(s => s.id === '${sub.id}'));">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span class="tag tag-co" style="font-weight:700;">${sub.code}</span>
                  <span class="tag tag-bt">${dept ? dept.shortName : 'FE'}</span>
                </div>
                <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:4px; line-height:1.3;">
                  ${sub.fullName || sub.name}
                </h3>
                <p style="font-size:12px; color:var(--text-secondary); margin-bottom:14px;">Semester: ${sub.semester || 'Semester I'}</p>

                ${subjectAsgs.length === 0 ? `
                  <div style="padding:10px; background:var(--warning-subtle); color:var(--warning); border-radius:var(--radius-sm); font-size:12px; font-weight:600; text-align:center;">
                    ⚠️ Nothing to submit yet
                  </div>
                ` : `
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-default);">
                    <div>
                      <div style="font-size:10px; color:var(--text-tertiary); font-weight:700; text-transform:uppercase;">Total Assignments</div>
                      <div style="font-size:15px; font-weight:800; color:var(--text-primary);" class="mono-val">${subjectAsgs.length}</div>
                    </div>
                    <div>
                      <div style="font-size:10px; color:var(--text-tertiary); font-weight:700; text-transform:uppercase;">Submitted</div>
                      <div style="font-size:15px; font-weight:800; color:var(--success);" class="mono-val">${submittedCount}</div>
                    </div>
                    <div>
                      <div style="font-size:10px; color:var(--text-tertiary); font-weight:700; text-transform:uppercase;">Pending</div>
                      <div style="font-size:15px; font-weight:800; color:var(--warning);" class="mono-val">${pendingCount}</div>
                    </div>
                    <div>
                      <div style="font-size:10px; color:var(--text-tertiary); font-weight:700; text-transform:uppercase;">Marks Earned</div>
                      <div style="font-size:15px; font-weight:800; color:var(--accent-blue);" class="mono-val">${marksEarned.toFixed(1)}</div>
                    </div>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  renderSubjectWorkspace(container, sub) {
    if (!sub) return;
    app.activeSubjectId = sub.id;
    const student = this.getResolvedStudent();
    const allAsgs = app.getAssignmentsForStudent(student).filter(a => a.subject_id === sub.id || a.subjectId === sub.id);

    const TYPE_LABELS = { L: 'Lab Practicals', A: 'Assignments', T: 'Tests & Quizzes', P: 'Projects' };
    const order = ['L', 'A', 'T', 'P'];

    const dept = (HARDCODED_DEPARTMENTS || []).find(d => d.id === (sub.departmentId || sub.department_id));

    container.innerHTML = `
      <div class="breadcrumb-container" style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
        <a href="javascript:void(0)" onclick="app.activeSubjectId = null; studentView.renderDashboard(document.getElementById('main-content'));" style="color:var(--accent-blue); font-weight:600; text-decoration:none;">My Courses</a>
        <span>&gt;</span>
        <span style="font-weight:700; color:var(--text-primary);">${sub.code}</span>
      </div>

      <div class="card" style="margin-bottom:20px; border-left:4px solid var(--accent-blue);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
              <span class="tag tag-co" style="font-weight:700;">${sub.code}</span>
              <span class="tag tag-bt">${dept ? dept.shortName : 'FE'}</span>
              <span class="tag tag-bt">${sub.semester || 'Semester'}</span>
            </div>
            <h1 class="page-title" style="font-size:20px;">${sub.fullName || sub.name}</h1>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.activeSubjectId = null; studentView.renderDashboard(document.getElementById('main-content'));">
            ← Back to Courses
          </button>
        </div>
      </div>

      ${allAsgs.length === 0 ? `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">
            <div class="empty-state-emoji">📝</div>
            <h3 class="empty-state-title">No assignments published yet — check back later</h3>
          </div>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${order.map(type => {
            const group = allAsgs.filter(a => (a.series_type || a.seriesType || 'A').toUpperCase() === type);
            if (group.length === 0) return '';
            const typeLabel = TYPE_LABELS[type] || 'Assignments';

            return `
              <div class="card subject-group-card">
                <div class="subject-group-header" onclick="facultyView.toggleSubjectGroup(this)" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                  <h3 class="card-title" style="margin:0; font-size:15px; font-weight:700;">${typeLabel} (${group.length})</h3>
                  <span class="subject-group-toggle-icon" style="font-size:14px; font-weight:700;">▼</span>
                </div>
                <div class="subject-group-body" style="display:block; margin-top:12px;">
                  <div class="dept-blocks-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:14px;">
                    ${group.map(asg => {
                      const sch = app.getAssignmentSchedule(asg.id, student ? student.batch : 'A1');
                      const aSubRecord = (app.data.assignmentSubmissions || []).find(as => as.studentId === student?.id && (as.assignmentId === asg.id || as.assignment_id === asg.id));
                      const stStatus = aSubRecord ? aSubRecord.status : 'not_started';
                      
                      let statusPill = `<span class="col-pill pill-draft">Not Started</span>`;
                      if (stStatus === 'submitted') statusPill = `<span class="col-pill pill-published">✓ Submitted</span>`;
                      else if (stStatus === 'late') statusPill = `<span class="col-pill pill-flagged">🕐 Late</span>`;
                      else if (stStatus === 'partial') statusPill = `<span class="col-pill pill-pending">🟡 In Progress</span>`;

                      const paramsDone = aSubRecord ? (aSubRecord.parameters_completed || 0) : 0;
                      const paramsTotal = aSubRecord ? (aSubRecord.parameters_total || 1) : 1;
                      const pctDone = Math.round((paramsDone / Math.max(1, paramsTotal)) * 100);
                      const marksEarned = aSubRecord ? (parseFloat(aSubRecord.total_marks_awarded) || 0).toFixed(1) : '0';

                      let btnHtml = '';
                      if (stStatus === 'submitted' || stStatus === 'late') {
                        btnHtml = `<button class="btn btn-secondary btn-sm" style="width:100%;" onclick="app.activeAssignmentId = '${asg.id}'; app.switchNav('grades');">📄 View Results</button>`;
                      } else if (stStatus === 'partial') {
                        btnHtml = `<button class="btn btn-primary btn-sm" style="width:100%;" onclick="app.activeAssignmentId = '${asg.id}'; app.switchNav('solver');">✏️ Continue</button>`;
                      } else {
                        btnHtml = `<button class="btn btn-primary btn-sm" style="width:100%;" onclick="app.activeAssignmentId = '${asg.id}'; app.switchNav('solver');">✏️ Start</button>`;
                      }

                      return `
                        <div class="card" style="padding:14px; background:var(--bg-subtle); border:1px solid var(--border-default); display:flex; flex-direction:column; justify-space-between; gap:10px;">
                          <div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                              <div style="font-weight:700; color:var(--accent-blue);" class="mono-val">${asg.display_code || asg.working_title || asg.title || asg.id}</div>
                              ${statusPill}
                            </div>
                            <div style="font-size:11px; color:var(--text-secondary); margin-bottom:8px;">
                              Deadline: <strong>${sch ? new Date(sch.deadline).toLocaleString() : '—'}</strong>
                            </div>
                            <div style="margin-bottom:8px;">
                              <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px; font-weight:600;">
                                <span>Progress (${paramsDone}/${paramsTotal})</span>
                                <span>${pctDone}%</span>
                              </div>
                              <div style="height:6px; background:var(--bg-subtle); border:1px solid var(--border-default); border-radius:3px; overflow:hidden;">
                                <div style="width:${pctDone}%; height:100%; background:${stStatus === 'submitted' ? 'var(--success)' : 'var(--accent-blue)'}; transition:width 0.2s ease;"></div>
                              </div>
                            </div>
                            <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">
                              Marks Earned: <strong class="mono-val" style="color:var(--accent-blue);">${marksEarned}</strong>
                            </div>
                          </div>
                          <div>
                            ${btnHtml}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  calculateStudentTotalMarks(studentId) {
    let sum = 0;
    const studentsForAY = app.getStudentsForAY();
    const student = studentsForAY.find(s => s.id === studentId || s.uin === studentId);
    const uin = student ? student.uin : studentId;
    app.data.submissions.forEach(s => {
      if (s.studentId === studentId || (uin && s.studentId === uin)) sum += (s.marksAwarded || 0);
    });
    return sum;
  },

  renderSolverCanvas(container) {
    try {
      const student = this.getResolvedStudent();
      const studentAssignments = app.getAssignmentsForStudent(student);
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
          </div>
        `;
        return;
      }

      if (this.getAsgQuestions(asg).length === 0) {
        container.innerHTML = `
          <div class="page-header-container">
            <div>
              <h1 class="page-title">Solve Assignment</h1>
              <p class="page-subtitle">${asg.display_code || asg.working_title || asg.title || asg.code} — ${asg.working_title || asg.title}</p>
            </div>
            <button class="btn btn-secondary" onclick="app.switchNav('dashboard')">← Back to Dashboard</button>
          </div>
          <div class="card" style="padding:48px 24px; text-align:center;">
            <div style="font-size:48px; margin-bottom:12px;">📋</div>
            <h2 style="font-size:18px; font-weight:700; margin-bottom:8px;">Questions Not Yet Published</h2>
            <p style="color:var(--text-secondary); max-width:480px; margin:0 auto; font-size:13px;">
              Your faculty is still building the questions for <strong>${asg.display_code || asg.working_title || asg.title || asg.code}</strong>. Please check back later.
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

      const questions = this.getAsgQuestions(asg);
      const studentSubmissions = (app.data.submissions || []).filter(s => s.studentId === student.id && s.assignmentId === asg.id);
      
      const answeredParamIds = new Set(studentSubmissions.map(s => s.parameterId));
      let totalParamsCount = 0;
      
      const qIndicators = questions.map((q, idx) => {
        const qParams = q.parameters || [];
        totalParamsCount += qParams.length;
        const qHasSubmission = qParams.some(p => answeredParamIds.has(p.id));
        const dotStyle = qHasSubmission
          ? 'display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--text-secondary); vertical-align: middle; margin-left: 4px;'
          : 'display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--text-tertiary); background: transparent; vertical-align: middle; margin-left: 4px; box-sizing: border-box;';
        return `<span>Q${idx + 1} <span style="${dotStyle}"></span></span>`;
      });

      const displayCode = asg.display_code || asg.working_title || asg.title;

      const progressStripHtml = `
        <div style="background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 10px 16px; font-size: 13px; font-weight: 600; font-family: var(--font-mono); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span>${displayCode}</span>
            <span style="color: var(--text-tertiary);">·</span>
            <div style="display: flex; gap: 12px; align-items: center;">
              ${qIndicators.join('')}
            </div>
          </div>
          <div>
            <span>${answeredParamIds.size} / ${totalParamsCount} parameters answered</span>
          </div>
        </div>
      `;

      container.innerHTML = `
        ${progressStripHtml}

        <div class="page-header-container print-hide">
          <div>
            <h1 class="page-title">Solve Assignment</h1>
            <p class="page-subtitle">${asg.display_code || asg.working_title || asg.title || asg.code} — ${asg.working_title || asg.title}</p>
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
                  ${a.display_code || a.working_title || a.title || a.code}: ${label}
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
          ${questions.map((q, qIndex) => {
            const qPrefix = `Q${qIndex + 1}_`;
            const qStudentVars = {};
            Object.keys(studentVars).forEach(k => {
              if (k.startsWith(qPrefix)) {
                qStudentVars[k.slice(qPrefix.length)] = studentVars[k];
              }
            });

            const qParams = q.parameters || [];
            const qAnsweredCount = qParams.filter(p => answeredParamIds.has(p.id)).length;
            const qTotalCount = qParams.length;
            const qProgressPct = qTotalCount > 0 ? (qAnsweredCount / qTotalCount) * 100 : 0;

            return `
              <div class="card" style="padding:20px;">
                <strong style="font-size:15px; color:var(--accent-blue);">${q.sectionLabel || `Question ${qIndex+1}`}</strong>
                <div style="font-size:14px; margin-top:8px; line-height:1.6;">${app.formatQuestionText(q.text, qStudentVars)}</div>
                ${q.imageUrl ? `<img src="${app.getEmbeddableImageUrl(q.imageUrl)}" class="question-diagram" alt="Question Diagram">` : ''}

                <div style="background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px; margin-top: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">✏️ Your Answers</span>
                    <span style="font-size: 12px; font-weight: 600; color: var(--text-tertiary); font-family: var(--font-mono);">${qAnsweredCount} / ${qTotalCount} parameters answered</span>
                  </div>
                  <div style="height: 4px; background: var(--bg-hover); border-radius: var(--radius-pill); margin: 6px 0 12px 0;">
                    <div style="height: 100%; background: var(--accent-blue); border-radius: var(--radius-pill); width: ${qProgressPct}%; transition: width 0.3s ease;"></div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${qParams.map(p => this.renderParameterInputField(asg.id, student.id, q, p)).join('')}
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
    const priorAttempts = app.data.submissions.filter(s => s.studentId === studentId && s.parameterId === paramId);
    const attemptCount = priorAttempts.length;
    const isCapped = attemptCount >= 3;
    const latestAttempt = priorAttempts.length > 0 ? priorAttempts[priorAttempts.length - 1] : null;

    let borderLeftColor = 'var(--border-strong)';
    if (isCapped) {
      borderLeftColor = 'var(--text-tertiary)';
    } else if (attemptCount > 0) {
      borderLeftColor = 'var(--text-secondary)';
    }

    const maxAttempts = 3;
    let dotsHtml = '';
    for (let i = 1; i <= maxAttempts; i++) {
      if (i <= attemptCount) {
        dotsHtml += `<span style="color: var(--text-secondary); font-size: 14px;">● </span>`;
      } else {
        dotsHtml += `<span style="color: var(--text-tertiary); font-size: 14px;">○ </span>`;
      }
    }

    const nextAttemptNum = Math.min(3, attemptCount + 1);

    const valVal = latestAttempt ? latestAttempt.submittedValue : '';
    const unitVal = latestAttempt ? latestAttempt.submittedUnit : '';
    const isInitialEmpty = !valVal;

    return `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-left: 3px solid ${borderLeftColor}; border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 8px; transition: border-left-color 0.2s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${param.label}</span>
          <div>
            ${dotsHtml}
            <span style="font-size: 11px; color: var(--text-tertiary);">${attemptCount}/3</span>
          </div>
        </div>

        ${isCapped ? `
          <div style="font-size: 13px; font-weight: 600; color: var(--text-tertiary); margin-top: 10px;">
            🔒 Maximum attempts used — Last answer: ${latestAttempt ? latestAttempt.submittedValue : ''} ${latestAttempt ? latestAttempt.submittedUnit : ''}
          </div>
        ` : `
          <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center;">
            <input type="number" step="any" id="input-val-${paramId}" class="form-input code-font"
              value="${valVal}"
              oninput="document.getElementById('btn-submit-${paramId}').disabled = !this.value; document.getElementById('btn-submit-${paramId}').style.opacity = !this.value ? '0.4' : '1';"
              style="width: 160px; height: 36px; font-family: var(--font-mono); font-weight: 600; font-size: 14px; border: 1px solid var(--border-strong); border-radius: var(--radius-md) 0 0 var(--radius-md); padding: 0 12px; background: var(--bg-surface);" />
            <input type="text" id="input-unit-${paramId}" class="form-input code-font"
              value="${unitVal}"
              style="width: 80px; height: 36px; font-family: var(--font-mono); font-weight: 600; font-size: 13px; border: 1px solid var(--border-strong); border-left: none; border-radius: 0 var(--radius-md) var(--radius-md) 0; padding: 0 10px; background: var(--bg-subtle); text-align: center;" />
            <button id="btn-submit-${paramId}" class="btn btn-primary btn-sm"
              ${isInitialEmpty ? 'disabled style="opacity: 0.4;"' : ''}
              onclick="studentView.submitParameterAnswer('${asgId}', '${studentId}', '${paramId}')">
              Submit (Attempt ${nextAttemptNum}/3)
            </button>
          </div>
        `}

        ${(!isCapped && attemptCount > 0) ? `
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
            Answer recorded — Attempt ${attemptCount}/3 used
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

      const student = this.getResolvedStudent();
      const schedule = app.getAssignmentSchedule(asgId, student ? student.batch : 'A1');
      const isLate = schedule && schedule.deadline ? new Date() > new Date(schedule.deadline) : false;

      if (isLate) {
        app.showToast('Late submission recorded — penalty may apply', 'warning');
      }

      if (nextAttemptNum < 3) {
        app.showToast(`Answer recorded — Attempt ${nextAttemptNum}/3`, 'info');
      } else if (nextAttemptNum === 3) {
        app.showToast('Maximum attempts reached for this parameter', 'warning');
      }

      if (allAsgParams.length > 0 && uniqueParamsDone >= allAsgParams.length) {
        app.showToast('All answers submitted for this assignment', 'success');
      }
    } finally {
      this._submitting = false;
    }

    this.renderSolverCanvas(document.getElementById('main-content'));
  },

  renderStudentGrades(container) {
    const student = this.getResolvedStudent();
    const studentAssignments = app.getAssignmentsForStudent(student);
    const activeAsg = studentAssignments.length > 0 ? (studentAssignments.find(a => a.id === app.activeAssignmentId) || studentAssignments[0]) : null;
    const mySubmissions = student && activeAsg ? app.data.submissions.filter(s =>
      (s.studentId === student.id || s.studentId === student.uin || s.student_id === student.id || s.student_id === student.uin) &&
      (s.assignmentId === activeAsg.id || s.assignment_id === activeAsg.id)
    ) : [];

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">My Results</h1>
          <p class="page-subtitle">Gradesheet & Evaluation History for <strong>${student ? student.name : 'Student'}</strong></p>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 class="card-title" style="margin-bottom:12px;">Attempt History — ${activeAsg ? (activeAsg.display_code || activeAsg.working_title || activeAsg.title || activeAsg.id) : 'All'}</h3>
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
      let asgQuestions = asg.questions;
      if (typeof asgQuestions === 'string') {
        try { asgQuestions = JSON.parse(asgQuestions); } catch(_) { asgQuestions = []; }
      }
      if (!Array.isArray(asgQuestions)) asgQuestions = [];
      asgQuestions.forEach(q => {
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
