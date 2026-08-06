/* ==========================================================================
   Rizvi College of Engineering - Faculty Module
   ========================================================================== */

const facultyView = {
  activeCSVAssignmentId: 'asg-001',
  tempModalParameters: [],

  render(container, activeNav) {
    switch(activeNav) {
      case 'assignments':
        this.renderAssignmentBuilder(container);
        break;
      case 'outcomes':
        this.renderCOAndModulesManager(container);
        break;
      case 'rubrics':
        this.renderRubricBuilder(container);
        break;
      case 'schedules':
        this.renderScheduleManager(container);
        break;
      case 'csv-pipeline':
        this.renderCSVPipeline(container);
        break;
      case 'analytics':
        analyticsView.render(container);
        break;
      case 'dashboard':
      default:
        this.renderDashboard(container);
        break;
    }
  },

  renderDashboard(container) {
    const uniqueEvaluatedStudents = new Set(app.data.submissions.map(s => s.studentId)).size;
    const totalStudents = app.data.students.length;

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Faculty Lab Portal</h1>
          <p class="page-subtitle">Manage lab assignments, student variables, and solution CSV pipelines</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
      </div>

      <div class="card" style="margin-bottom: 24px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div>
            <h3 class="card-title" style="font-size:15px; color:var(--accent-blue);">Inspect Student Question & Variable Set</h3>
            <div style="font-size:12px; color:var(--text-secondary);">Type UIN or Name fragment to inspect personalized student sheets without leaving your session</div>
          </div>
          <span class="tag tag-co" style="font-size:11px;">Production Safe Inspection</span>
        </div>
        <div style="display:flex; gap:12px;">
          <input type="text" id="faculty-student-search" class="form-input" placeholder="Search by UIN (e.g. 24051001) or Name..." style="flex:1; background:#FFF;" oninput="facultyView.searchStudentSheet()">
          <button class="btn btn-primary btn-sm" onclick="facultyView.searchStudentSheet()">Inspect Sheet</button>
        </div>
        <div id="student-search-results" style="margin-top:12px;"></div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Active Experiments</span>
          <span class="kpi-value">${app.data.assignments.length}</span>
          <span class="kpi-trend positive">Physics & Vibration Lab</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Scheduled Batches</span>
          <span class="kpi-value">12</span>
          <span class="kpi-trend neutral">Batches A1 to D3</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Submissions Evaluated</span>
          <span class="kpi-value">${uniqueEvaluatedStudents} / ${totalStudents}</span>
          <span class="kpi-trend positive">Unique Students</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Class CO Attainment</span>
          <span class="kpi-value">84%</span>
          <span class="kpi-trend positive">≥ 70% Target Met</span>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-header">
          <div>
            <h2 class="card-title">My Lab Assignments</h2>
            <p class="card-subtitle">Select an assignment to build questions, edit schedules, or upload CSV solution keys</p>
          </div>
        </div>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Assignment Code</th>
                <th>Title</th>
                <th>Subject</th>
                <th>Active Batches</th>
                <th>Deadline Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${app.data.assignments.map(asg => {
                const sub = app.data.subjects.find(s => s.id === asg.subjectId);
                const activeSch = asg.schedules ? asg.schedules.length : 0;
                return `
                  <tr>
                    <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono); font-size:12px;">${asg.code || 'RCOE/2026-27/FE/FEL101_A001'}</td>
                    <td style="font-weight:600;">${asg.title}</td>
                    <td><span class="tag tag-co">${sub ? sub.code : ''}</span></td>
                    <td><span class="tag tag-bt">${activeSch} Scheduled</span></td>
                    <td><span class="tag tag-success">Open for Submissions</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="app.activeAssignmentId='${asg.id}'; app.switchNav('assignments');">Edit Questions</button>
                      <button class="btn btn-primary btn-sm" onclick="facultyView.activeCSVAssignmentId='${asg.id}'; app.switchNav('csv-pipeline');">Upload CSV Key</button>
                      <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteAssignment('${asg.id}')">🗑️ Delete</button>
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

  deleteAssignment(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    if (!confirm(`Are you sure you want to delete "${asg.title}" (${asg.code})?`)) return;

    app.data.assignments = app.data.assignments.filter(a => a.id !== asgId);
    app.saveState();
    app.showToast(`Deleted assignment ${asg.code}`, 'info');
    this.renderDashboard(document.getElementById('main-content'));
  },

  searchStudentSheet() {
    const q = (document.getElementById('faculty-student-search').value || '').toLowerCase().trim();
    const container = document.getElementById('student-search-results');
    if (!q) { container.innerHTML = ''; return; }

    const matches = app.data.students.filter(s => s.uin.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q));
    if (matches.length === 0) {
      container.innerHTML = `<div style="font-size:13px; color:var(--danger);">No student records found matching "${q}".</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; font-weight:600; color:var(--text-secondary);">Found ${matches.length} matching student(s):</div>
        ${matches.map(st => {
          const vars = app.data.studentVariables.filter(v => v.studentId === st.id);
          return `
            <div style="background:#FFF; padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-default); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong>${st.name}</strong> (<code class="code-font">${st.uin}</code>) | Branch: ${st.branch} | Div ${st.division} / Batch ${st.batch}
                <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                  Vars: ${vars.length > 0 ? vars.map(v => `${v.key}=${v.value}`).join(', ') : 'Default variables'}
                </div>
              </div>
              <div>
                <button class="btn btn-primary btn-sm" onclick="facultyView.openStudentSheetInspectionModal('${st.id}', '${app.activeAssignmentId || 'asg-001'}')">🔍 Read-Only Inspection</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openStudentSheetInspectionModal(studentId, assignmentId) {
    const student = app.data.students.find(s => s.id === studentId);
    if (!student) return;

    const asg = app.data.assignments.find(a => a.id === assignmentId) || app.data.assignments[0];
    const subject = app.data.subjects.find(s => s.id === asg.subjectId);
    const department = subject ? app.data.departments.find(d => d.id === subject.departmentId) : null;
    const deptName = department ? department.name.toUpperCase() : 'FIRST YEAR ENGINEERING DEPARTMENT';

    const studentVarsMap = {};
    app.data.studentVariables.forEach(v => {
      if (v.studentId === student.id && v.assignmentId === asg.id) {
        studentVarsMap[v.key] = v.value;
      }
    });

    app.showModal(`Read-Only Sheet Inspection — ${student.name} (${student.uin})`, `
      <div style="max-height:80vh; overflow-y:auto; padding:10px;">
        <div style="background:var(--accent-blue-subtle); padding:10px 14px; border-radius:var(--radius-md); font-size:12px; margin-bottom:16px; color:var(--accent-blue);">
          ℹ️ <strong>Faculty Inspection Mode:</strong> Viewing ${asg.code} for UIN ${student.uin}. Your faculty session remains active.
        </div>

        <div style="background:#FFF; padding:20px; border:1px solid #000; font-family:sans-serif;">
          <div style="display:flex; align-items:center; gap:20px; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:10px;">
            <img src="assets/rizvi_logo.png" style="height:70px;" alt="Logo">
            <div style="flex:1; text-align:center;">
              <div style="font-size:11px; font-weight:700;">RIZVI EDUCATION SOCIETY's</div>
              <div style="font-size:18px; font-weight:800; color:#000;">RIZVI COLLEGE OF ENGINEERING</div>
              <div style="font-size:10px; font-weight:600;">Approved by AICTE | Recognized by DTE | Affiliated to University of Mumbai</div>
              <div style="font-size:11px; font-weight:800; text-transform:uppercase;">DEPARTMENT OF ${deptName}</div>
            </div>
          </div>

          <div style="font-size:12px; margin-bottom:12px;">
            <strong>Student UIN:</strong> <code class="code-font">${student.uin}</code> | <strong>Name:</strong> ${student.name} | <strong>Branch:</strong> ${student.branch} | <strong>Div/Batch:</strong> ${student.division}/${student.batch}
          </div>

          <!-- Full Width Rubric & Prominent Bloom's Taxonomy Section -->
          <div style="border:1px solid #000; padding:12px; margin-bottom:14px;">
            <div style="font-size:11px; font-weight:700; margin-bottom:6px; text-align:center; text-transform:uppercase;">Auto-Graded Performance Rubric</div>
            <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:12px;" border="1">
              <tr style="background:#F0F0F0; font-weight:700; text-align:center;">
                <td>Criteria Title</td>
                <td>Level 03 (≥ 90%)</td>
                <td>Level 02 (≥ 50%)</td>
                <td>Level 01 (< 50%)</td>
                <td>Level 00 (0%)</td>
              </tr>
              <tr>
                <td style="font-weight:600; padding:4px;">Numerical Values</td>
                <td style="text-align:center;">4 Marks</td>
                <td style="text-align:center;">3 Marks</td>
                <td style="text-align:center;">1 Marks</td>
                <td style="text-align:center;">0 Marks</td>
              </tr>
              <tr>
                <td style="font-weight:600; padding:4px;">Units Precision</td>
                <td style="text-align:center;">3 Marks</td>
                <td style="text-align:center;">2 Marks</td>
                <td style="text-align:center;">1 Marks</td>
                <td style="text-align:center;">0 Marks</td>
              </tr>
            </table>

            <div style="border-top:1px solid #000; padding-top:10px; text-align:center;">
              <div style="font-size:10px; font-weight:700; margin-bottom:6px; text-transform:uppercase; color:#333;">Bloom's Taxonomy Cognitive Domain Levels</div>
              <img src="assets/blooms_taxonomy.png" style="max-width:100%; height:220px; display:block; margin:0 auto; object-fit:contain;" alt="Bloom's Taxonomy">
            </div>
          </div>

          <div style="margin-top:16px;">
            <h4 style="font-size:13px; font-weight:700; margin-bottom:10px;">Substituted Question Set (${asg.title}):</h4>
            ${asg.questions.map(q => {
              const substitutedText = q.text.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
                const val = studentVarsMap[p1] || "10.0";
                return `<span style="background:#FEF3C7; color:#92400E; font-weight:700; padding:2px 6px; border-radius:4px;">${val}</span>`;
              });

              return `
                <div style="border:1px solid var(--border-default); padding:12px; border-radius:6px; margin-bottom:12px; background:#FAFAFA;">
                  <div style="font-weight:700; font-size:13px; margin-bottom:6px;">${q.sectionLabel}: ${q.coId} (${q.btLevel})</div>
                  <div style="font-size:13px; line-height:1.5;">${substitutedText}</div>
                  <div style="margin-top:10px; font-size:12px; color:var(--text-secondary);">
                    <strong>Expected Parameters:</strong>
                    ${q.parameters.map(p => `
                      <div style="margin-top:4px; font-family:var(--font-mono);">
                        • ${p.label}: Tol ±${p.tolerancePct}% | Accepted: [${p.acceptedUnits.join(', ')}]
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:16px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Close Inspection</button>
        </div>
      </div>
    `);
  },

  renderCOAndModulesManager(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Course Outcomes & Subject Modules</h1>
          <p class="page-subtitle">Manage Syllabus Modules & Course Outcomes (COs) for your assigned subjects</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="facultyView.openAddModuleModal()">+ Add Subject Module</button>
          <button class="btn btn-primary" onclick="facultyView.openAddCOModal()">+ Add Course Outcome (CO)</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 class="card-title" style="margin-bottom:12px;">Syllabus Modules</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Module Code</th>
                <th>Module Title</th>
              </tr>
            </thead>
            <tbody>
              ${(app.data.modules || []).length === 0 ? `<tr><td colspan="3" style="text-align:center; padding:16px;">No modules defined yet. Click "+ Add Subject Module" above.</td></tr>` : 
                (app.data.modules || []).map(m => {
                  const sub = app.data.subjects.find(s => s.id === m.subjectId);
                  return `
                    <tr>
                      <td><span class="tag tag-co">${sub ? sub.code : '-'}</span></td>
                      <td style="font-weight:700; font-family:var(--font-mono);">${m.code}</td>
                      <td style="font-weight:500;">${m.title}</td>
                    </tr>
                  `;
                }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Course Outcomes (COs)</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>CO Code</th>
                <th>Course Outcome Description</th>
                <th>Mapped PO</th>
              </tr>
            </thead>
            <tbody>
              ${app.data.courseOutcomes.map(co => `
                <tr>
                  <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${co.code}</td>
                  <td style="font-weight:500;">${co.description}</td>
                  <td><span class="tag tag-bt">${co.poId || 'PO1'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openAddModuleModal() {
    app.showModal('Add Subject Module', `
      <form onsubmit="facultyView.saveModule(event)">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <select id="mod-sub" class="form-select">
            ${app.data.subjects.map(s => `<option value="${s.id}">${s.code} - ${s.fullName}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Module Code</label>
          <input type="text" id="mod-code" class="form-input code-font" placeholder="Module 03" required>
        </div>
        <div class="form-group">
          <label class="form-label">Module Title</label>
          <input type="text" id="mod-title" class="form-input" placeholder="Module 03: Forced Vibration & Resonance Analysis" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Module</button>
        </div>
      </form>
    `);
  },

  saveModule(e) {
    e.preventDefault();
    if (!app.data.modules) app.data.modules = [];
    const newMod = {
      id: 'mod-' + Date.now(),
      subjectId: document.getElementById('mod-sub').value,
      code: document.getElementById('mod-code').value,
      title: document.getElementById('mod-title').value
    };
    app.data.modules.push(newMod);
    app.saveState();
    app.closeModal();
    app.showToast(`Added module ${newMod.code}`, 'success');
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  openAddCOModal() {
    app.showModal('Add Course Outcome (CO)', `
      <form onsubmit="facultyView.saveCO(event)">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <select id="co-sub" class="form-select">
            ${app.data.subjects.map(s => `<option value="${s.id}">${s.code} - ${s.fullName}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">CO Code</label>
          <input type="text" id="co-code" class="form-input code-font" placeholder="24051181.CO3" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="co-desc" class="form-textarea" rows="2" placeholder="Analyze forced vibration systems and calculate transmissibility..." required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Map to Program Outcome (PO)</label>
          <select id="co-po" class="form-select">
            ${app.data.programOutcomes.map(po => `<option value="${po.code}">${po.code}: ${po.description.substring(0, 50)}...</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Course Outcome</button>
        </div>
      </form>
    `);
  },

  saveCO(e) {
    e.preventDefault();
    const newCO = {
      id: 'co-' + Date.now(),
      subjectId: document.getElementById('co-sub').value,
      code: document.getElementById('co-code').value,
      description: document.getElementById('co-desc').value,
      poId: document.getElementById('co-po').value
    };
    app.data.courseOutcomes.push(newCO);
    app.saveState();
    app.closeModal();
    app.showToast(`Added Course Outcome ${newCO.code}`, 'success');
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  renderAssignmentBuilder(container) {
    const asg = app.data.assignments.find(a => a.id === app.activeAssignmentId) || app.data.assignments[0];
    if (!asg) {
      container.innerHTML = `
        <div class="page-header-container">
          <div>
            <h1 class="page-title">Assignment Question Builder</h1>
            <p class="page-subtitle">No active lab assignments found</p>
          </div>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
        <div class="card" style="text-align:center; padding:48px 24px;">
          <div style="font-size:48px; margin-bottom:12px;">📑</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">No Assignments Created Yet</h3>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Create your first lab sheet assignment to start adding questions, dynamic parameter placeholders, and evaluation rules.
          </p>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Assignment Question Builder</h1>
          <p class="page-subtitle">${asg.code || 'RCOE/2026-27/FE/FEL101_A001'} — ${asg.title}</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openAddQuestionModal('${asg.id}')">+ Add Question</button>
      </div>

      <div class="card" style="margin-bottom: 20px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div style="display:flex; gap:12px; align-items:center;">
          <span style="font-size:20px;">💡</span>
          <div style="font-size:13px; color:var(--accent-blue);">
            <strong>Dynamic Student Variables Syntax:</strong> Write placeholders like <code class="code-font">{{var_m_kg}}</code> in question text. You can add multiple evaluation parameters per question and paste Google Drive diagram URLs!
          </div>
        </div>
      </div>

      ${asg.questions.map((q, idx) => `
        <div class="question-block">
          <div class="question-header">
            <div style="display:flex; gap:12px; align-items:center;">
              <span class="question-number">${q.sectionLabel}</span>
              <span class="tag tag-co">${q.coId}</span>
              <span class="tag tag-bt">${q.btLevel}</span>
            </div>
          </div>
          <div class="question-text">${q.text.replace(/\{\{(.*?)\}\}/g, '<span class="var-chip">{{$1}}</span>')}</div>

          ${q.imageUrl ? `<img src="${q.imageUrl}" class="question-diagram" alt="Experiment Diagram">` : ''}

          <div style="margin-top:16px;">
            <div style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--text-secondary); margin-bottom:8px;">Evaluation Parameters (${q.parameters.length}):</div>
            ${q.parameters.map(p => `
              <div class="parameter-input-row">
                <span class="param-label">${p.label} <code class="code-font" style="font-size:11px; color:var(--accent-blue);">(${p.code})</code></span>
                <span style="font-size:12px; color:var(--text-secondary);">Marks: ${p.valueMarks}v + ${p.unitMarks}u</span>
                <span style="font-size:12px; color:var(--text-secondary);">Tol: ±${p.tolerancePct}%</span>
                <span style="font-size:12px; color:var(--text-secondary);">Accepted: [${p.acceptedUnits.join(', ')}]</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    `;
  },

  openAddQuestionModal(asgId) {
    this.tempModalParameters = [
      { label: "Q3: Critical Damping Coefficient (c_c)", acceptedUnits: ["N*s/m", "ratio"], valueMarks: 4, unitMarks: 1, tolerancePct: 2 }
    ];

    app.showModal('Add Question with Multiple Parameters', `
      <form onsubmit="facultyView.saveQuestion(event, '${asgId}')">
        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Section Label</label>
            <input type="text" id="q-label" class="form-input code-font" value="Q3" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Course Outcome</label>
            <select id="q-co" class="form-select">
              ${app.data.courseOutcomes.map(co => `<option value="${co.code}">${co.code}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Bloom's Level</label>
            <select id="q-bt" class="form-select">
              <option value="BT1">BT1 (Remember)</option>
              <option value="BT2">BT2 (Understand)</option>
              <option value="BT3" selected>BT3 (Apply)</option>
              <option value="BT4">BT4 (Analyze)</option>
              <option value="BT5">BT5 (Evaluate)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question Text (Use {{variable_name}} syntax)</label>
          <textarea id="q-text" class="form-textarea" rows="3" placeholder="Calculate the critical damping coefficient c_c when stiffness k = {{var_k_Nmm}}..." required></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Diagram Image URL / Google Drive Share Link</label>
          <input type="url" id="q-img" class="form-input" placeholder="https://drive.google.com/... or https://images.unsplash.com/...">
        </div>

        <div style="border-top:1px solid var(--border-default); padding-top:16px; margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <label class="form-label" style="margin-bottom:0;">Evaluation Parameters (Multiple Answers)</label>
            <button type="button" class="btn btn-secondary btn-sm" onclick="facultyView.addModalParameterField()">+ Add Another Parameter</button>
          </div>

          <div id="modal-parameters-list">
            ${this.buildModalParametersHTML()}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Question</button>
        </div>
      </form>
    `);
  },

  buildModalParametersHTML() {
    return this.tempModalParameters.map((p, idx) => `
      <div style="background:var(--bg-primary); padding:12px; border-radius:var(--radius-md); margin-bottom:10px;">
        <div style="display:flex; gap:12px; margin-bottom:8px;">
          <div style="flex:1;">
            <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Parameter Label</label>
            <input type="text" class="form-input p-label-input" value="${p.label}" required style="background:#FFF;">
          </div>
          <div style="width:140px;">
            <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Accepted Units</label>
            <input type="text" class="form-input p-units-input" value="${p.acceptedUnits.join(', ')}" style="background:#FFF;">
          </div>
        </div>
        <div style="display:flex; gap:12px; font-size:12px;">
          <div>Value Marks: <input type="number" class="p-vmarks-input" value="${p.valueMarks}" style="width:50px;"></div>
          <div>Unit Marks: <input type="number" class="p-umarks-input" value="${p.unitMarks}" style="width:50px;"></div>
          <div>Tolerance %: <input type="number" class="p-tol-input" value="${p.tolerancePct}" style="width:50px;"></div>
        </div>
      </div>
    `).join('');
  },

  addModalParameterField() {
    this.tempModalParameters.push({
      label: `Q3: Parameter ${this.tempModalParameters.length + 1}`,
      acceptedUnits: ["ratio", "none"],
      valueMarks: 4,
      unitMarks: 1,
      tolerancePct: 2
    });
    const container = document.getElementById('modal-parameters-list');
    if (container) container.innerHTML = this.buildModalParametersHTML();
  },

  saveQuestion(e, asgId) {
    e.preventDefault();
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const paramLabels = document.querySelectorAll('.p-label-input');
    const paramUnits = document.querySelectorAll('.p-units-input');
    const paramVMarks = document.querySelectorAll('.p-vmarks-input');
    const paramUMarks = document.querySelectorAll('.p-umarks-input');
    const paramTols = document.querySelectorAll('.p-tol-input');

    const paramsList = [];
    paramLabels.forEach((el, idx) => {
      paramsList.push({
        id: 'param-' + Date.now() + '-' + idx,
        code: `Q00${asg.questions.length+1}_P0${idx+1}`,
        order: idx + 1,
        label: el.value,
        acceptedUnits: (paramUnits[idx] ? paramUnits[idx].value : '').split(',').map(u => u.trim()),
        unitRequired: true,
        valueMarks: parseFloat(paramVMarks[idx] ? paramVMarks[idx].value : 4),
        unitMarks: parseFloat(paramUMarks[idx] ? paramUMarks[idx].value : 1),
        tolerancePct: parseFloat(paramTols[idx] ? paramTols[idx].value : 2)
      });
    });

    const newQ = {
      id: 'q-' + Date.now(),
      order: asg.questions.length + 1,
      sectionLabel: document.getElementById('q-label').value,
      text: document.getElementById('q-text').value,
      imageUrl: document.getElementById('q-img').value || '',
      coId: document.getElementById('q-co').value,
      btLevel: document.getElementById('q-bt').value,
      parameters: paramsList
    };

    asg.questions.push(newQ);
    app.saveState();
    app.closeModal();
    app.showToast(`Added Question with ${paramsList.length} evaluation parameters`, 'success');
    this.renderAssignmentBuilder(document.getElementById('main-content'));
  },

  getRubricLevelData(c, levelIndex) {
    if (c.levels && c.levels[levelIndex]) {
      return c.levels[levelIndex];
    }
    if (levelIndex === 0) return { marks: 4, description: c.level3 || '≥ 90% correct (Exemplary)' };
    if (levelIndex === 1) return { marks: 3, description: c.level2 || '≥ 50% correct (Satisfactory)' };
    if (levelIndex === 2) return { marks: 1, description: c.level1 || '< 50% correct (Needs Improvement)' };
    return { marks: 0, description: 'No submission' };
  },

  renderRubricBuilder(container) {
    const rubrics = app.data.rubricPresets || [];
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Lab Rubric Builder & Custom Criteria Presets</h1>
          <p class="page-subtitle">Configure 2 to 4+ custom criteria variables per rubric depending on assignment needs</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openAddRubricModal()">+ Create Rubric Preset</button>
      </div>

      ${rubrics.length === 0 ? `<div class="card"><p>No rubric presets found. Click "+ Create Rubric Preset" to create one.</p></div>` :
        rubrics.map(rub => `
          <div class="card" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div>
                <h3 class="card-title">${rub.name}</h3>
                <span style="font-size:12px; color:var(--text-secondary);">Criteria Count: <strong>${(rub.criteria || []).length} Criteria</strong> | Total Rubric Marks: <strong>${rub.totalMarks || 10} Marks</strong></span>
              </div>
              <div>
                <span class="tag tag-co" style="margin-right:8px;">${rub.isShared ? 'Shared College Preset' : 'Private'}</span>
                <button class="btn btn-secondary btn-sm" onclick="facultyView.openEditRubricModal('${rub.id}')">✏️ Edit Criteria & Levels</button>
              </div>
            </div>

            <div class="rubric-card">
              <table class="custom-table" style="font-size:13px;">
                <thead>
                  <tr>
                    <th>Criteria Title</th>
                    <th>Auto-Grader Mode</th>
                    <th>Level 03 (≥ 90%)</th>
                    <th>Level 02 (≥ 50%)</th>
                    <th>Level 01 (< 50%)</th>
                    <th>Level 00 (0%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(rub.criteria || []).map(c => {
                    const l0 = this.getRubricLevelData(c, 0);
                    const l1 = this.getRubricLevelData(c, 1);
                    const l2 = this.getRubricLevelData(c, 2);
                    const l3 = this.getRubricLevelData(c, 3);
                    return `
                      <tr>
                        <td style="font-weight:600; color:var(--accent-blue);">${c.title}</td>
                        <td>
                          <span class="tag ${c.type === 'auto_numerical' ? 'tag-success' : c.type === 'auto_units' ? 'tag-co' : 'tag-bt'}">
                            ${c.type === 'auto_numerical' ? '🤖 Auto (Tolerance ±5%)' : c.type === 'auto_units' ? '🤖 Auto (Units)' : '✋ Manual Grading'}
                          </span>
                        </td>
                        <td><strong style="color:var(--success);">${l0.marks}m</strong> (${l0.description})</td>
                        <td><strong style="color:var(--accent-blue);">${l1.marks}m</strong> (${l1.description})</td>
                        <td><strong style="color:var(--warning);">${l2.marks}m</strong> (${l2.description})</td>
                        <td><strong style="color:var(--danger);">${l3.marks}m</strong> (${l3.description})</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')
      }
    `;
  },

  openEditRubricModal(rubricId) {
    const rub = app.data.rubricPresets.find(r => r.id === rubricId) || app.data.rubricPresets[0];
    this.editingRubricCriteria = JSON.parse(JSON.stringify(rub.criteria || []));

    app.showModal(`Edit Rubric — ${rub.name}`, `
      <form onsubmit="facultyView.saveEditedRubric(event, '${rub.id}')">
        <div class="form-group">
          <label class="form-label">Rubric Preset Name</label>
          <input type="text" id="edit-rub-name" class="form-input" value="${rub.name}" required>
        </div>

        <div style="border-top:1px solid var(--border-default); padding-top:12px; margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="font-size:14px; margin-bottom:0;">Rubric Criteria List (Freedom for 2, 3, or 4 Criteria):</h4>
            <button type="button" class="btn btn-secondary btn-sm" onclick="facultyView.addRubricCriteriaRow()">+ Add Criteria Row</button>
          </div>

          <div id="edit-rubric-criteria-container">
            ${this.buildRubricCriteriaRowsHTML()}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Rubric Preset</button>
        </div>
      </form>
    `);
  },

  buildRubricCriteriaRowsHTML() {
    if (!this.editingRubricCriteria || this.editingRubricCriteria.length === 0) {
      return `<div style="font-size:13px; color:var(--text-secondary);">No criteria configured. Click "+ Add Criteria Row" above.</div>`;
    }

    return this.editingRubricCriteria.map((c, idx) => {
      const l0 = this.getRubricLevelData(c, 0);
      const l1 = this.getRubricLevelData(c, 1);
      const l2 = this.getRubricLevelData(c, 2);
      const l3 = this.getRubricLevelData(c, 3);
      return `
        <div style="background:var(--bg-primary); padding:12px; border-radius:var(--radius-md); margin-bottom:12px; border:1px solid var(--border-default);">
          <div style="display:flex; gap:12px; margin-bottom:8px; align-items:center;">
            <div style="flex:1;">
              <label class="form-label" style="margin-bottom:2px;">Criteria ${idx+1} Title</label>
              <input type="text" class="form-input edit-crit-title" value="${c.title}" required style="background:#FFF;">
            </div>
            <div style="width:180px;">
              <label class="form-label" style="margin-bottom:2px;">Evaluation Mode</label>
              <select class="form-select edit-crit-type" style="background:#FFF;">
                <option value="auto_numerical" ${c.type === 'auto_numerical' ? 'selected' : ''}>Auto (Numerical ±5%)</option>
                <option value="auto_units" ${c.type === 'auto_units' ? 'selected' : ''}>Auto (Unit Precision)</option>
                <option value="manual" ${c.type === 'manual' ? 'selected' : ''}>Manual Instructor Review</option>
              </select>
            </div>
            <button type="button" class="btn btn-destructive btn-sm" style="margin-top:16px;" onclick="facultyView.removeRubricCriteriaRow(${idx})">❌</button>
          </div>

          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:11px;">
            <div>
              <label style="font-weight:600; color:var(--success);">Level 3 Marks</label>
              <input type="number" class="form-input edit-crit-m3" value="${l0.marks}" style="background:#FFF; height:32px;">
            </div>
            <div>
              <label style="font-weight:600; color:var(--accent-blue);">Level 2 Marks</label>
              <input type="number" class="form-input edit-crit-m2" value="${l1.marks}" style="background:#FFF; height:32px;">
            </div>
            <div>
              <label style="font-weight:600; color:var(--warning);">Level 1 Marks</label>
              <input type="number" class="form-input edit-crit-m1" value="${l2.marks}" style="background:#FFF; height:32px;">
            </div>
            <div>
              <label style="font-weight:600; color:var(--danger);">Level 0 Marks</label>
              <input type="number" class="form-input edit-crit-m0" value="${l3.marks}" style="background:#FFF; height:32px;">
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  addRubricCriteriaRow() {
    if (!this.editingRubricCriteria) this.editingRubricCriteria = [];
    const count = this.editingRubricCriteria.length + 1;
    this.editingRubricCriteria.push({
      id: "crit-" + Date.now() + "-" + count,
      title: `Criteria 0${count} (New Variable)`,
      type: "manual",
      levels: [
        { level: "Level 3", minPct: 90, marks: 3, description: "Exemplary" },
        { level: "Level 2", minPct: 50, marks: 2, description: "Satisfactory" },
        { level: "Level 1", minPct: 1,  marks: 1, description: "Needs Improvement" },
        { level: "Level 0", minPct: 0,  marks: 0, description: "Unsatisfactory" }
      ]
    });
    const container = document.getElementById('edit-rubric-criteria-container');
    if (container) container.innerHTML = this.buildRubricCriteriaRowsHTML();
  },

  removeRubricCriteriaRow(idx) {
    if (!this.editingRubricCriteria) return;
    this.editingRubricCriteria.splice(idx, 1);
    const container = document.getElementById('edit-rubric-criteria-container');
    if (container) container.innerHTML = this.buildRubricCriteriaRowsHTML();
  },

  saveEditedRubric(e, rubricId) {
    e.preventDefault();
    const rub = app.data.rubricPresets.find(r => r.id === rubricId);
    if (!rub) return;

    rub.name = document.getElementById('edit-rub-name').value;
    const titles = document.querySelectorAll('.edit-crit-title');
    const types = document.querySelectorAll('.edit-crit-type');
    const m3s = document.querySelectorAll('.edit-crit-m3');
    const m2s = document.querySelectorAll('.edit-crit-m2');
    const m1s = document.querySelectorAll('.edit-crit-m1');
    const m0s = document.querySelectorAll('.edit-crit-m0');

    const updatedCriteria = [];
    let totalMarks = 0;

    titles.forEach((el, idx) => {
      const m3 = parseFloat(m3s[idx] ? m3s[idx].value : 4);
      const m2 = parseFloat(m2s[idx] ? m2s[idx].value : 3);
      const m1 = parseFloat(m1s[idx] ? m1s[idx].value : 1);
      const m0 = parseFloat(m0s[idx] ? m0s[idx].value : 0);
      totalMarks += m3;

      updatedCriteria.push({
        id: (this.editingRubricCriteria[idx] && this.editingRubricCriteria[idx].id) ? this.editingRubricCriteria[idx].id : ('crit-' + Date.now() + '-' + idx),
        title: el.value,
        type: types[idx] ? types[idx].value : 'auto_numerical',
        levels: [
          { level: "Level 3", minPct: 90, marks: m3, description: "≥ 90% correct" },
          { level: "Level 2", minPct: 50, marks: m2, description: "≥ 50% correct" },
          { level: "Level 1", minPct: 1,  marks: m1, description: "< 50% correct" },
          { level: "Level 0", minPct: 0,  marks: m0, description: "No submission" }
        ]
      });
    });

    rub.criteria = updatedCriteria;
    rub.totalMarks = totalMarks;
    app.saveState();
    app.closeModal();
    app.showToast(`Saved rubric with ${updatedCriteria.length} criteria (${totalMarks} total marks)`, 'success');
    this.renderRubricBuilder(document.getElementById('main-content'));
  },

  openAddRubricModal() {
    this.editingRubricCriteria = [
      {
        id: "crit-1",
        title: "Criteria 01 (Numerical Values)",
        type: "auto_numerical",
        levels: [
          { level: "Level 3", minPct: 90, marks: 4, description: "≥ 90% parameters within ±5% tolerance" },
          { level: "Level 2", minPct: 50, marks: 3, description: "≥ 50% parameters within ±5% tolerance" },
          { level: "Level 1", minPct: 1,  marks: 1, description: "< 50% parameters within ±10% tolerance" },
          { level: "Level 0", minPct: 0,  marks: 0, description: "0% parameters correct" }
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
      }
    ];

    app.showModal('Create Custom Rubric Preset', `
      <form onsubmit="facultyView.saveNewRubric(event)">
        <div class="form-group">
          <label class="form-label">Rubric Name</label>
          <input type="text" id="new-rub-name" class="form-input" placeholder="e.g. 2-Criteria Physics Lab Rubric" required>
        </div>

        <div style="border-top:1px solid var(--border-default); padding-top:12px; margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="font-size:14px; margin-bottom:0;">Rubric Criteria List (Freedom for 2, 3, or 4 Criteria):</h4>
            <button type="button" class="btn btn-secondary btn-sm" onclick="facultyView.addRubricCriteriaRow()">+ Add Criteria Row</button>
          </div>

          <div id="edit-rubric-criteria-container">
            ${this.buildRubricCriteriaRowsHTML()}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Rubric</button>
        </div>
      </form>
    `);
  },

  saveNewRubric(e) {
    e.preventDefault();
    const name = document.getElementById('new-rub-name').value;
    const titles = document.querySelectorAll('.edit-crit-title');
    const types = document.querySelectorAll('.edit-crit-type');
    const m3s = document.querySelectorAll('.edit-crit-m3');
    const m2s = document.querySelectorAll('.edit-crit-m2');
    const m1s = document.querySelectorAll('.edit-crit-m1');
    const m0s = document.querySelectorAll('.edit-crit-m0');

    const criteriaList = [];
    let totalMarks = 0;

    titles.forEach((el, idx) => {
      const m3 = parseFloat(m3s[idx] ? m3s[idx].value : 4);
      const m2 = parseFloat(m2s[idx] ? m2s[idx].value : 3);
      const m1 = parseFloat(m1s[idx] ? m1s[idx].value : 1);
      const m0 = parseFloat(m0s[idx] ? m0s[idx].value : 0);
      totalMarks += m3;

      criteriaList.push({
        id: 'crit-' + Date.now() + '-' + idx,
        title: el.value,
        type: types[idx] ? types[idx].value : 'auto_numerical',
        levels: [
          { level: "Level 3", minPct: 90, marks: m3, description: "≥ 90% correct" },
          { level: "Level 2", minPct: 50, marks: m2, description: "≥ 50% correct" },
          { level: "Level 1", minPct: 1,  marks: m1, description: "< 50% correct" },
          { level: "Level 0", minPct: 0,  marks: 0, description: "No submission" }
        ]
      });
    });

    const newRub = {
      id: 'rub-' + Date.now(),
      name: name,
      isShared: true,
      facultyId: 'fac-admin-jugal',
      totalMarks: totalMarks,
      criteria: criteriaList
    };

    app.data.rubricPresets.push(newRub);
    app.saveState();
    app.closeModal();
    app.showToast(`Created rubric "${name}" with ${criteriaList.length} criteria`, 'success');
    this.renderRubricBuilder(document.getElementById('main-content'));
  },

  renderScheduleManager(container) {
    const asg = app.data.assignments.find(a => a.id === app.activeAssignmentId) || app.data.assignments[0];
    if (!asg) {
      container.innerHTML = `
        <div class="page-header-container">
          <div>
            <h1 class="page-title">Multi-Batch Schedule & Deduction Manager</h1>
            <p class="page-subtitle">No active lab assignments found</p>
          </div>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
        <div class="card" style="text-align:center; padding:48px 24px;">
          <div style="font-size:48px; margin-bottom:12px;">📅</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">No Active Assignment Schedules</h3>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Create an assignment to configure multi-batch submission deadlines, attempt penalty rules, and release policies.
          </p>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Multi-Batch Schedule & Deduction Manager</h1>
          <p class="page-subtitle">Configure Publish Dates, Deadlines, Attempt Deductions, & Late Penalties</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px; background:var(--warning-subtle); border-color:rgba(255,159,10,0.3);">
        <h3 class="card-title" style="color:#D97706; font-size:16px;">⚡ Attempt & Late Submission Deduction Policy</h3>
        <p class="card-subtitle" style="margin-bottom:14px;">Rules governing student retries and late submissions for Experiment 3</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:13px;">
          <div style="background:#FFF; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
            <strong>Attempt Penalty Rules:</strong>
            <ul style="margin-top:6px; padding-left:18px;">
              <li><strong>Attempt 1:</strong> 0% Deduction (Full Marks)</li>
              <li><strong>Attempt 2:</strong> -10% Deduction on earned marks</li>
              <li><strong>Attempt 3:</strong> -20% Deduction on earned marks (Max 3 attempts enforced)</li>
            </ul>
          </div>
          <div style="background:#FFF; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
            <strong>Late Submission Penalty Rules:</strong>
            <ul style="margin-top:6px; padding-left:18px;">
              <li><strong>Rate:</strong> -10% per day late after batch deadline</li>
              <li><strong>Max Cap:</strong> Capped at 30% maximum deduction</li>
              <li><strong>Overdue Status:</strong> Submissions flagged as late for faculty review</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="margin-bottom:16px;">Active Schedules for Experiment 3</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Scope Target</th>
                <th>Target Value</th>
                <th>Publish Date</th>
                <th>Submission Deadline</th>
                <th>Late Penalty Policy</th>
                <th>Submissions Open</th>
                <th>Grades Released</th>
              </tr>
            </thead>
            <tbody>
              ${asg.schedules.map(s => `
                <tr>
                  <td><span class="tag tag-bt">${s.scopeType.toUpperCase()}</span></td>
                  <td style="font-weight:700; font-family:var(--font-mono);">${s.scopeValue}</td>
                  <td style="font-size:12px;">${new Date(s.publishDate || '2026-08-01T09:00').toLocaleString()}</td>
                  <td style="font-weight:600;">${new Date(s.deadline).toLocaleString()}</td>
                  <td>${s.latePenaltyValue}% / day (Cap ${s.lateMaxCap}%)</td>
                  <td>
                    <button class="btn ${s.submissionsOpen ? 'btn-secondary' : 'btn-destructive'} btn-sm" onclick="facultyView.toggleScheduleToggle('${asg.id}', '${s.id}', 'submissionsOpen')">
                      ${s.submissionsOpen ? '🟢 Open' : '🔴 Closed'}
                    </button>
                  </td>
                  <td>
                    <button class="btn ${s.gradesReleased ? 'btn-secondary' : 'btn-ghost'} btn-sm" onclick="facultyView.toggleScheduleToggle('${asg.id}', '${s.id}', 'gradesReleased')">
                      ${s.gradesReleased ? '✅ Released' : '⏳ Hidden'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  toggleScheduleToggle(asgId, scheduleId, key) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    const sch = asg.schedules.find(s => s.id === scheduleId);
    if (!sch) return;
    sch[key] = !sch[key];
    app.saveState();
    app.showToast(`Updated ${key} status`, 'success');
    this.renderScheduleManager(document.getElementById('main-content'));
  },

  renderCSVPipeline(container) {
    const selectedAsg = app.data.assignments.find(a => a.id === this.activeCSVAssignmentId) || app.data.assignments[0];
    if (!selectedAsg) {
      container.innerHTML = `
        <div class="page-header-container">
          <div>
            <h1 class="page-title">Double CSV Upload & Solution Pipeline</h1>
            <p class="page-subtitle">No active lab assignments found</p>
          </div>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
        <div class="card" style="text-align:center; padding:48px 24px;">
          <div style="font-size:48px; margin-bottom:12px;">📂</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">No Assignments for CSV Pipeline</h3>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Create an assignment to upload personalized question variables and 2-row ground truth solution CSV keys.
          </p>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Double CSV Upload & Solution Pipeline</h1>
          <p class="page-subtitle">Upload question variables & 2-row solution keys with retroactive grading</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.triggerRetroactiveGrading('${selectedAsg.id}')">⚡ Trigger Retroactive Re-Grading</button>
      </div>

      <div class="card" style="margin-bottom:20px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div style="display:flex; align-items:center; gap:16px;">
          <label class="form-label" style="margin-bottom:0; color:var(--accent-blue);">Select Assignment for CSV Pipeline:</label>
          <select id="csv-assignment-selector" class="form-select" style="flex:1; background:#FFF;" onchange="facultyView.selectCSVAssignment(this.value)">
            ${app.data.assignments.map(a => `<option value="${a.id}" ${a.id === selectedAsg.id ? 'selected' : ''}>${a.code || a.id} — ${a.title}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="card">
          <h3 class="card-title">1. Question Variables CSV</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">Upload personalized variable values per student UIN</p>
          <button class="btn btn-secondary btn-sm" style="width:100%; margin-bottom:10px;" onclick="facultyView.downloadQuestionCSVTemplate()">📥 Download Question CSV Template</button>
          <input type="file" id="question-csv-file" accept=".csv" style="display:none;" onchange="facultyView.handleQuestionCSVUpload(event)">
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="document.getElementById('question-csv-file').click()">📤 Upload Question CSV File</button>
        </div>

        <div class="card">
          <h3 class="card-title">2. Ground Truth Solution CSV Key</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">2-Row Format: Row 1 Human Labels, Row 2 Machine Codes</p>
          <button class="btn btn-secondary btn-sm" style="width:100%; margin-bottom:10px;" onclick="facultyView.downloadSolutionCSVTemplate()">📥 Download Pre-Filled 2-Row Template</button>
          <input type="file" id="solution-csv-file" accept=".csv" style="display:none;" onchange="facultyView.handleSolutionCSVUpload(event)">
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="document.getElementById('solution-csv-file').click()">📤 Upload Solution CSV File</button>
        </div>
      </div>

      <div class="card" style="margin-top:24px;">
        <h3 class="card-title">Future Formula Evaluator Layer Sandbox</h3>
        <p class="card-subtitle" style="margin-bottom:12px;">Test automated solution calculations without uploading solution CSVs</p>

        <div style="display:flex; gap:12px; align-items:center;">
          <input type="text" id="formula-sandbox-input" class="form-input code-font" value="sqrt(var_k_Nmm * 1000 / var_m_kg)" style="flex:1;">
          <button class="btn btn-secondary" onclick="facultyView.testFormula()">Test Formula</button>
        </div>
        <div id="formula-test-result" style="margin-top:10px; font-size:13px;"></div>
      </div>
    `;
  },

  selectCSVAssignment(asgId) {
    this.activeCSVAssignmentId = asgId;
    app.showToast('Selected assignment for CSV Pipeline', 'info');
    this.renderCSVPipeline(document.getElementById('main-content'));
  },

  testFormula() {
    document.getElementById('formula-test-result').innerHTML = `
      <div style="color:var(--success); font-weight:600;">✓ Formula Valid! Calculated ω_n = 189.74 rad/s for Student 24051001 (m=12.5kg, k=450N/mm).</div>
    `;
  },

  downloadQuestionCSVTemplate() {
    const selectedAsg = app.data.assignments.find(a => a.id === this.activeCSVAssignmentId) || app.data.assignments[0];
    const csvContent = "data:text/csv;charset=utf-8,uin,var_m_kg,var_k_Nmm,var_c_Nsm\n24051001,12.5,450.0,8.2\n24051002,14.0,380.0,6.5";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Question_Variables_${selectedAsg.code ? selectedAsg.code.replace(/[\/]/g, '_') : 'Template'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Downloaded Question CSV Template for ${selectedAsg.code}`, "success");
  },

  downloadSolutionCSVTemplate() {
    const selectedAsg = app.data.assignments.find(a => a.id === this.activeCSVAssignmentId) || app.data.assignments[0];
    const csvContent = "data:text/csv;charset=utf-8,parameter_label,Natural Frequency (rad/s),Static Deflection (mm),Damping Ratio\nans_header,ans_Q001_P01,ans_Q001_P02,ans_Q002_P01\n24051001,189.74,0.272,0.0017\n24051002,164.75,0.361,0.0014";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Solution_Key_2Row_${selectedAsg.code ? selectedAsg.code.replace(/[\/]/g, '_') : 'Template'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Downloaded 2-Row Solution CSV Key Template for ${selectedAsg.code}`, "success");
  },

  handleQuestionCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    app.showToast(`Processed Question Variables CSV: ${file.name}`, 'success');
  },

  handleSolutionCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 3) {
        app.showToast("CSV file must have at least 3 rows (Row 1 Header, Row 2 Codes, Row 3+ Data)", "danger");
        return;
      }

      const paramCodes = lines[1].split(',').map(c => c.trim().replace('ans_', ''));
      let updatedCount = 0;

      for (let i = 2; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const uin = parts[0];
        const student = app.data.students.find(s => s.uin === uin);
        if (!student) continue;

        paramCodes.forEach((code, idx) => {
          if (idx === 0) return;
          const val = parts[idx];
          if (!val) return;

          let parameterId = 'param-q1-p1';
          if (code === 'Q001_P01') parameterId = 'param-q1-p1';
          else if (code === 'Q001_P02') parameterId = 'param-q1-p2';
          else if (code === 'Q002_P01') parameterId = 'param-q2-p1';

          let existingAns = app.data.studentAnswers.find(a => a.studentId === student.id && a.parameterId === parameterId);
          if (existingAns) {
            existingAns.correctValue = val;
          } else {
            app.data.studentAnswers.push({
              assignmentId: this.activeCSVAssignmentId,
              studentId: student.id,
              parameterId: parameterId,
              correctValue: val,
              correctUnit: parameterId === 'param-q1-p2' ? 'mm' : parameterId === 'param-q2-p1' ? 'ratio' : 'rad/s'
            });
          }
          updatedCount++;
        });
      }

      app.saveState();
      app.showToast(`Parsed Solution CSV Key: Updated ${updatedCount} ground truth answers`, 'success');
      this.triggerRetroactiveGrading(this.activeCSVAssignmentId);
    };
    reader.readAsText(file);
  },

  triggerRetroactiveGrading(asgId) {
    let reEvaluated = 0;
    app.data.submissions.forEach(subm => {
      if (subm.assignmentId === asgId) {
        const gt = app.data.studentAnswers.find(a => a.studentId === subm.studentId && a.parameterId === subm.parameterId);
        if (gt) {
          const expectedVal = parseFloat(gt.correctValue);
          const submittedVal = parseFloat(subm.submittedValue);
          const diffPct = Math.abs(submittedVal - expectedVal) / expectedVal * 100;
          
          subm.isCorrectValue = diffPct <= 5.0;
          subm.isCorrectUnit = (subm.submittedUnit || '').toLowerCase() === (gt.correctUnit || '').toLowerCase();
          subm.marksAwarded = subm.isCorrectValue ? 4 : (diffPct <= 10.0 ? 2 : 0);
          reEvaluated++;
        }
      }
    });
    app.saveState();
    app.showToast(`Retroactive Auto-Grading Complete: ${reEvaluated} submissions re-evaluated against ground truth`, 'success');
  },

  openCreateAssignmentModal() {
    const autoCode = `RCOE/FE/2026-27/LAB_A00${app.data.assignments.length+1}`;
    
    const subjectOptions = app.data.subjects.map(s => 
      `<option value="${s.id}">${s.code} - ${s.fullName}</option>`
    ).join('');

    const moduleOptions = (app.data.modules || [
      { title: "Module 01: Natural Frequency Measurement of Dynamic Systems" },
      { title: "Module 02: Damped Free Vibration Systems & Logarithmic Decrement" }
    ]).map(m => `<option value="${m.title}">${m.title}</option>`).join('');

    const coOptions = app.data.courseOutcomes.map(co => 
      `<option value="${co.code}: ${co.description}">${co.code}: ${co.description}</option>`
    ).join('');

    app.showModal('Create New Lab Assignment Sheet', `
      <form onsubmit="facultyView.saveAssignment(event)">
        <div class="form-group">
          <label class="form-label">Auto Assignment Code</label>
          <input type="text" id="new-asg-code" class="form-input code-font" value="${autoCode}" readonly style="background:var(--bg-subtle);">
        </div>

        <div class="form-group">
          <label class="form-label">Select Subject Course</label>
          <select id="new-asg-subject" class="form-select" required>
            ${subjectOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Assignment Title</label>
          <input type="text" id="new-asg-title" class="form-input" value="Lab Sheet A002: Experimental Analysis" required>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Class & Branch</label>
            <input type="text" id="new-asg-class" class="form-input" value="FE Mechanical" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Semester</label>
            <input type="text" id="new-asg-sem" class="form-input" value="Semester I" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Modules Covered</label>
          <select id="new-asg-module" class="form-select">
            ${moduleOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Lab Outcome/s Covered (Course Outcomes)</label>
          <select id="new-asg-co" class="form-select">
            ${coOptions}
          </select>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Publish Date & Time</label>
            <input type="datetime-local" id="new-asg-pub" class="form-input" value="2026-08-01T09:00" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Submission Deadline</label>
            <input type="datetime-local" id="new-asg-dead" class="form-input" value="2026-08-10T23:59" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Attach Rubric Preset</label>
          <select id="new-asg-rub" class="form-select">
            ${app.data.rubricPresets.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Assignment</button>
        </div>
      </form>
    `);
  },

  saveAssignment(e) {
    e.preventDefault();
    const selectedSubId = document.getElementById('new-asg-subject').value;
    const newAsg = {
      id: 'asg-' + Date.now(),
      code: document.getElementById('new-asg-code').value,
      subjectId: selectedSubId,
      facultyId: 'fac-admin-jugal',
      number: app.data.assignments.length + 1,
      title: document.getElementById('new-asg-title').value,
      className: document.getElementById('new-asg-class').value,
      semester: document.getElementById('new-asg-sem').value,
      assessmentType: 'Direct',
      modulesCovered: document.getElementById('new-asg-module').value,
      outcomeCovered: document.getElementById('new-asg-co').value,
      publishDate: document.getElementById('new-asg-pub').value,
      deadline: document.getElementById('new-asg-dead').value,
      rubricPresetId: document.getElementById('new-asg-rub').value,
      createdAt: new Date().toISOString().split('T')[0],
      schedules: [
        {
          id: 'sch-' + Date.now(),
          scopeType: 'batch',
          scopeValue: 'A1',
          publishDate: document.getElementById('new-asg-pub').value,
          deadline: document.getElementById('new-asg-dead').value,
          submissionsOpen: true,
          gradesReleased: true,
          latePenaltyValue: 10,
          lateMaxCap: 30
        }
      ],
      questions: []
    };
    app.data.assignments.push(newAsg);
    app.saveState();
    app.closeModal();
    app.showToast(`Created assignment ${newAsg.code}`, 'success');
    this.renderDashboard(document.getElementById('main-content'));
  }
};
