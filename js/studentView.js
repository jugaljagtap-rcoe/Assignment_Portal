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

    // Level 1 — Subject Cards Grid
    const subjects = app.getSubjectsForStudent(student);
    const studentAsgs = app.getAssignmentsForStudent(student);
    const studentsForAY = app.getStudentsForAY();

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

      <div class="card-header" style="margin-bottom:16px;">
        <h2 class="card-title">My Courses & Lab Modules</h2>
        <p class="card-subtitle">Select a subject to view published experiment assignments, progress track, and submit work</p>
      </div>

      ${subjects.length === 0 ? `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">
            <div class="empty-state-emoji">📚</div>
            <h3 class="empty-state-title">No Enrolled Courses Found</h3>
            <p class="empty-state-subtitle">No active subject courses mapped for your academic year (${student?.yearOfStudy || 'FE'}) and branch.</p>
          </div>
        </div>
      ` : `
        <div class="dept-blocks-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:16px;">
          ${subjects.map(sub => {
            const subAsgs = studentAsgs.filter(a => (a.subjectId || a.subject_id) === sub.id);
            const dept = (app.data.departments || []).find(d => d.id === (sub.departmentId || sub.department_id));
            
            let totalSubAsgs = subAsgs.length;
            let submittedCount = 0;
            let pendingCount = 0;
            let marksEarned = 0;

            subAsgs.forEach(a => {
              const aSubRecord = (app.data.assignmentSubmissions || []).find(as => as.studentId === student?.id && (as.assignmentId === a.id || as.assignment_id === a.id));
              const stStatus = aSubRecord ? aSubRecord.status : 'not_started';
              if (stStatus === 'submitted' || stStatus === 'late') submittedCount++;
              else pendingCount++;

              if (aSubRecord) marksEarned += (parseFloat(aSubRecord.total_marks_awarded) || 0);
            });

            return `
              <div class="card subject-card-item" style="cursor:pointer; transition:transform 0.15s ease, box-shadow 0.15s ease; border-top: 4px solid var(--accent-blue);" onclick="app.activeSubjectId = '${sub.id}'; studentView.renderSubjectWorkspace(document.getElementById('main-content'), (app.data.subjects || []).find(s => s.id === '${sub.id}'));">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span class="tag tag-co" style="font-weight:700;">${sub.code}</span>
                  <span class="tag tag-bt">${dept ? dept.shortName : 'FE'}</span>
                </div>
                <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:4px; line-height:1.3;">
                  ${sub.fullName || sub.name}
                </h3>
                <p style="font-size:12px; color:var(--text-secondary); margin-bottom:14px;">${sub.semester || 'Semester'}</p>

                ${totalSubAsgs === 0 ? `
                  <div style="padding:10px; background:var(--warning-subtle); color:var(--warning); border-radius:var(--radius-sm); font-size:12px; font-weight:600; text-align:center;">
                    ⚠️ Nothing to submit yet
                  </div>
                ` : `
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-default);">
                    <div>
                      <div style="font-size:10px; color:var(--text-tertiary); font-weight:700; text-transform:uppercase;">Total Assignments</div>
                      <div style="font-size:15px; font-weight:800; color:var(--text-primary);" class="mono-val">${totalSubAsgs}</div>
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
    const subAsgs = app.getAssignmentsForStudent(student).filter(a => (a.subjectId || a.subject_id) === sub.id);

    const seriesGroupMap = {
      'L': { title: 'Lab Practicals (L Series)', list: [] },
      'A': { title: 'Assignments (A Series)', list: [] },
      'T': { title: 'Tests & Quizzes (T Series)', list: [] },
      'P': { title: 'Projects (P Series)', list: [] }
    };

    subAsgs.forEach(a => {
      const type = (a.series_type || a.seriesType || 'A').toUpperCase();
      if (seriesGroupMap[type]) seriesGroupMap[type].list.push(a);
      else seriesGroupMap['A'].list.push(a);
    });

    const activeGroups = Object.keys(seriesGroupMap).filter(k => seriesGroupMap[k].list.length > 0);

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
              <span class="tag tag-bt">${sub.semester || 'Semester'}</span>
            </div>
            <h1 class="page-title" style="font-size:20px;">${sub.fullName || sub.name}</h1>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.activeSubjectId = null; studentView.renderDashboard(document.getElementById('main-content'));">
            ← Back to Courses
          </button>
        </div>
      </div>

      ${activeGroups.length === 0 ? `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">
            <div class="empty-state-emoji">📝</div>
            <h3 class="empty-state-title">No assignments published yet</h3>
            <p class="empty-state-subtitle">Your faculty member has not published any assignments or lab practicals for ${sub.code} yet.</p>
          </div>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${activeGroups.map(groupKey => {
            const group = seriesGroupMap[groupKey];
            return `
              <div class="card subject-group-card">
                <h3 class="card-title" style="margin-bottom:12px; font-size:15px; font-weight:700;">${group.title}</h3>
                <div class="table-container">
                  <table class="custom-table">
                    <thead>
                      <tr>
                        <th>Code / Title</th>
                        <th>Deadline</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Marks Earned</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${group.list.map(asg => {
                        const sch = app.getAssignmentSchedule(asg.id, student ? student.batch : 'A1');
                        const aSubRecord = (app.data.assignmentSubmissions || []).find(as => as.studentId === student?.id && (as.assignmentId === asg.id || as.assignment_id === asg.id));
                        const stStatus = aSubRecord ? aSubRecord.status : 'not_started';
                        
                        let statusLabel = 'NOT STARTED';
                        let pillClass = 'pill-draft';
                        if (stStatus === 'submitted') { statusLabel = 'SUBMITTED'; pillClass = 'pill-published'; }
                        else if (stStatus === 'late') { statusLabel = 'LATE'; pillClass = 'pill-flagged'; }
                        else if (stStatus === 'partial') { statusLabel = 'PARTIAL'; pillClass = 'pill-pending'; }

                        const paramsDone = aSubRecord ? (aSubRecord.parameters_completed || 0) : 0;
                        const paramsTotal = aSubRecord ? (aSubRecord.parameters_total || 1) : 1;
                        const pctDone = Math.round((paramsDone / Math.max(1, paramsTotal)) * 100);
                        const marks = aSubRecord ? (parseFloat(aSubRecord.total_marks_awarded) || 0).toFixed(1) : '0.0';

                        let btnText = 'Start';
                        if (stStatus === 'submitted' || stStatus === 'late') btnText = 'View Results';
                        else if (stStatus === 'partial') btnText = 'Continue';

                        return `
                          <tr>
                            <td>
                              <div style="font-weight:700; color:var(--accent-blue);" class="mono-val">${asg.display_code || asg.code || asg.id}</div>
                              <div style="font-size:12px; color:var(--text-secondary); font-weight:600;">${asg.title || asg.working_title}</div>
                            </td>
                            <td style="font-size:12px; font-weight:600;">${sch ? new Date(sch.deadline).toLocaleString() : '—'}</td>
                            <td style="width:140px;">
                              <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px; font-weight:600;">
                                <span>${paramsDone}/${paramsTotal}</span>
                                <span>${pctDone}%</span>
                              </div>
                              <div style="height:6px; background:var(--bg-subtle); border-radius:3px; overflow:hidden;">
                                <div style="width:${pctDone}%; height:100%; background:${stStatus === 'submitted' ? 'var(--success)' : 'var(--accent-blue)'}; transition:width 0.2s ease;"></div>
                              </div>
                            </td>
                            <td>
                              <span class="col-pill ${pillClass}">
                                ${statusLabel}
                              </span>
                            </td>
                            <td class="mono-val" style="font-weight:700;">${marks}</td>
                            <td>
                              <button class="btn ${stStatus === 'not_started' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="app.activeAssignmentId = '${asg.id}'; app.switchNav('solver');">
                                ${btnText} →
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

      container.innerHTML = `
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
          ${this.getAsgQuestions(asg).map((q, qIndex) => {
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
                ${q.imageUrl ? `<img src="${app.getEmbeddableImageUrl(q.imageUrl)}" class="question-diagram" alt="Question Diagram">` : ''}

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
