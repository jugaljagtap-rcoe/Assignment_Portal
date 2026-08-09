/* ==========================================================================
   Supabase Cloud & Google OAuth Configuration
   ========================================================================== */
const SUPABASE_URL = 'https://xnwfnheyrivufthstdff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud2ZuaGV5cml2dWZ0aHN0ZGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzY3NDYsImV4cCI6MjEwMTUxMjc0Nn0.1uym3rtdMJmOM6LvOHdfyl3LdVJvueherHkkBf1Wulk';

let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Supabase client initialization notice:', e);
  }
}

const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '46812612247-sm9usgtn5e55a5mtk4o8lap3jqhr1vu1.apps.googleusercontent.com';

function parseJwtToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode Google ID Token:', e);
    return null;
  }
}

class AppEngine {
  constructor() {
    this.data = this.loadState();
    this.currentUser = this.loadUserSession();
    this.currentRole = this.currentUser ? this.currentUser.role : 'faculty'; // 'admin', 'faculty', 'student'
    this.activeStudentId = this.currentUser && this.currentUser.studentId ? this.currentUser.studentId : (this.data.students.length > 0 ? this.data.students[0].id : null); 
    this.activeNav = 'dashboard';
    const savedAsgId = localStorage.getItem('rizvi_fe_active_asg_id');
    const firstAsgId = this.data.assignments.length > 0 ? this.data.assignments[0].id : null;
    this.activeAssignmentId = savedAsgId || firstAsgId || null;
    this.reconcileUserSession();
  }

  init() {
    this.setupEventListeners();
    this.syncWithSupabase();
    if (!this.currentUser) {
      // Prompt Google Auth Sign-In Modal on startup if not logged in
      this.showLoginModal(false);
    }
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
  }

  async syncWithSupabase() {
    if (!supabaseClient) {
      this.showToast('Running in offline mode — Supabase not connected. Data saved locally only.', 'warning');
      return;
    }
    try {
      // Fetch students from Supabase
      const { data: stData, error: stErr } = await supabaseClient.from('students').select('*');
      if (!stErr && stData && Array.isArray(stData) && stData.length > 0) {
        stData.forEach(st => {
          const existingIdx = this.data.students.findIndex(x => x.id === st.id);
          const formatted = {
            id: st.id,
            uin: st.uin,
            name: st.name,
            email: st.email,
            academicYear: st.academic_year,
            yearOfStudy: st.year_of_study || (existingIdx >= 0 ? this.data.students[existingIdx].yearOfStudy : 'FE'),
            branch: st.branch,
            division: st.division,
            batch: st.batch
          };
          if (existingIdx >= 0) {
            this.data.students[existingIdx] = formatted;
          } else {
            this.data.students.push(formatted);
          }
        });
      }

      // Fetch faculty from Supabase
      const { data: fcData, error: fcErr } = await supabaseClient.from('faculty').select('*');
      if (!fcErr && fcData && Array.isArray(fcData) && fcData.length > 0) {
        fcData.forEach(fc => {
          const existingIdx = this.data.faculty.findIndex(x => x.id === fc.id);
          const formatted = {
            id: fc.id,
            name: fc.name,
            email: fc.email,
            departmentId: fc.department_id,
            role: fc.role,
            assignedSubjects: fc.assigned_subjects || [],
            isDualRole: fc.is_dual_role || false
          };
          if (existingIdx >= 0) {
            this.data.faculty[existingIdx] = formatted;
          } else {
            this.data.faculty.push(formatted);
          }
        });
      }

      // Fetch assignments from Supabase
      const { data: asgData, error: asgErr } = await supabaseClient.from('assignments').select('*');
      if (!asgErr && asgData && Array.isArray(asgData) && asgData.length > 0) {
        asgData.forEach(asg => {
          const existingIdx = this.data.assignments.findIndex(x => x.id === asg.id);
          const formatted = {
            id: asg.id,
            code: asg.code,
            subjectId: asg.subject_id,
            facultyId: asg.faculty_id,
            number: asg.number,
            title: asg.title,
            className: asg.class_name,
            semester: asg.semester,
            assessmentType: asg.assessment_type,
            modulesCovered: asg.modules_covered,
            outcomeCovered: asg.outcome_covered,
            publishDate: asg.publish_date,
            deadline: asg.deadline,
            rubricPresetId: asg.rubric_preset_id,
            createdAt: asg.created_at,
            schedules: asg.schedules || [],
            questions: asg.questions || []
          };
          if (existingIdx >= 0) {
            this.data.assignments[existingIdx] = formatted;
          } else {
            this.data.assignments.push(formatted);
          }
        });
      }

      // Fetch submissions from Supabase
      const { data: submData, error: submErr } = await supabaseClient.from('submissions').select('*');
      if (!submErr && submData && Array.isArray(submData) && submData.length > 0) {
        submData.forEach(s => {
          const existingIdx = this.data.submissions.findIndex(x => x.id === s.id);
          const formatted = {
            id: s.id,
            assignmentId: s.assignment_id,
            studentId: s.student_id,
            parameterId: s.parameter_id,
            attemptNumber: s.attempt_number,
            submittedValue: s.submitted_value,
            submittedUnit: s.submitted_unit,
            isCorrectValue: s.is_correct_value,
            isCorrectUnit: s.is_correct_unit,
            marksAwarded: s.marks_awarded,
            attemptDeductionPct: s.attempt_deduction_pct || s.deduction_pct || 0,
            latePenaltyPct: s.late_penalty_pct || 0,
            deductionPct: s.deduction_pct || 0,
            isLate: s.is_late || false,
            submittedAt: s.submitted_at
          };
          if (existingIdx >= 0) {
            this.data.submissions[existingIdx] = formatted;
          } else {
            this.data.submissions.push(formatted);
          }
        });
      }

      // Fetch student_variables from Supabase
      const { data: svarData, error: svarErr } = await supabaseClient.from('student_variables').select('*');
      if (!svarErr && svarData && Array.isArray(svarData) && svarData.length > 0) {
        svarData.forEach(v => {
          const existingIdx = this.data.studentVariables.findIndex(x => x.id === v.id);
          const formatted = {
            id: v.id,
            studentId: v.student_id,
            assignmentId: v.assignment_id,
            key: v.key,
            value: v.value
          };
          if (existingIdx >= 0) {
            this.data.studentVariables[existingIdx] = formatted;
          } else {
            this.data.studentVariables.push(formatted);
          }
        });
      }

      // Fetch student_answers from Supabase
      const { data: ansData, error: ansErr } = await supabaseClient.from('student_answers').select('*');
      if (!ansErr && ansData && Array.isArray(ansData) && ansData.length > 0) {
        ansData.forEach(a => {
          const idKey = a.id || `ans-${a.student_id}-${a.parameter_id}`;
          const existingIdx = this.data.studentAnswers.findIndex(x => x.id === idKey || (x.studentId === a.student_id && x.parameterId === a.parameter_id));
          const formatted = {
            id: idKey,
            assignmentId: a.assignment_id,
            studentId: a.student_id,
            parameterId: a.parameter_id,
            correctValue: a.correct_value,
            correctUnit: a.correct_unit
          };
          if (existingIdx >= 0) {
            this.data.studentAnswers[existingIdx] = formatted;
          } else {
            this.data.studentAnswers.push(formatted);
          }
        });
      }

      this.saveState();
      this.reconcileUserSession();
      this.renderCurrentView();
    } catch (e) {
      console.warn('Supabase cloud sync background notice:', e);
      this.showToast('Cloud sync failed — working in offline mode. Changes saved locally.', 'warning');
    }
  }

  async syncAssignmentToSupabase(asg) {
    if (!supabaseClient || !asg) return;
    try {
      const { error } = await supabaseClient.from('assignments').upsert({
        id: asg.id,
        code: asg.code,
        subject_id: asg.subjectId,
        faculty_id: asg.facultyId,
        number: asg.number,
        title: asg.title,
        class_name: asg.className,
        semester: asg.semester,
        assessment_type: asg.assessmentType,
        modules_covered: asg.modulesCovered,
        outcome_covered: asg.outcomeCovered,
        publish_date: asg.publishDate,
        deadline: asg.deadline,
        rubric_preset_id: asg.rubricPresetId,
        created_at: asg.createdAt,
        schedules: asg.schedules,
        questions: asg.questions
      });
      if (error) console.warn('Supabase assignment sync notice:', error);
    } catch(e) {
      console.warn('Supabase assignment sync error:', e);
    }
  }

  async deleteAssignmentFromSupabase(asgId) {
    if (!supabaseClient || !asgId) return;
    try {
      // Delete the assignment record
      const { error: asgErr } = await supabaseClient
        .from('assignments')
        .delete()
        .eq('id', asgId);
      if (asgErr) console.warn('Supabase delete assignment notice:', asgErr);

      // Also delete all submissions for this assignment
      const { error: submErr } = await supabaseClient
        .from('submissions')
        .delete()
        .eq('assignment_id', asgId);
      if (submErr) console.warn('Supabase delete submissions notice:', submErr);

      // Also delete all student variables for this assignment
      const { error: svarErr } = await supabaseClient
        .from('student_variables')
        .delete()
        .eq('assignment_id', asgId);
      if (svarErr) console.warn('Supabase delete student_variables notice:', svarErr);

      // Also delete all student answers for this assignment
      const { error: ansErr } = await supabaseClient
        .from('student_answers')
        .delete()
        .eq('assignment_id', asgId);
      if (ansErr) console.warn('Supabase delete student_answers notice:', ansErr);

    } catch(e) {
      console.warn('Supabase delete assignment error:', e);
    }
  }

  async syncSubmissionToSupabase(submission) {
    if (!supabaseClient || !submission) return;
    try {
      const { error } = await supabaseClient.from('submissions').upsert({
        id: submission.id,
        assignment_id: submission.assignmentId,
        student_id: submission.studentId,
        parameter_id: submission.parameterId,
        attempt_number: submission.attemptNumber,
        submitted_value: submission.submittedValue,
        submitted_unit: submission.submittedUnit,
        is_correct_value: submission.isCorrectValue,
        is_correct_unit: submission.isCorrectUnit,
        marks_awarded: submission.marksAwarded,
        deduction_pct: submission.deductionPct || 0,
        attempt_deduction_pct: submission.attemptDeductionPct || submission.deductionPct || 0,
        late_penalty_pct: submission.latePenaltyPct || 0,
        is_late: submission.isLate || false,
        submitted_at: submission.submittedAt
      });
      if (error) console.warn('Supabase submission sync notice:', error);
    } catch(e) {
      console.warn('Supabase submission sync error:', e);
    }
  }

  async syncStudentVariablesToSupabase(studentId, assignmentId) {
    if (!supabaseClient) return;
    try {
      const vars = this.data.studentVariables.filter(
        v => v.studentId === studentId && v.assignmentId === assignmentId
      );
      for (const v of vars) {
        const { error } = await supabaseClient.from('student_variables').upsert({
          id: v.id,
          student_id: v.studentId,
          assignment_id: v.assignmentId,
          key: v.key,
          value: v.value
        });
        if (error) console.warn('Supabase student_variables sync notice:', error);
      }
    } catch(e) {
      console.warn('Supabase student_variables sync error:', e);
    }
  }

  async syncStudentAnswersToSupabase(studentId, assignmentId) {
    if (!supabaseClient) return;
    try {
      const answers = this.data.studentAnswers.filter(
        a => a.studentId === studentId && a.assignmentId === assignmentId
      );
      for (const a of answers) {
        const payload = {
          assignment_id: a.assignmentId,
          student_id: a.studentId,
          parameter_id: a.parameterId,
          correct_value: a.correctValue,
          correct_unit: a.correctUnit
        };
        if (a.id) payload.id = a.id;
        const { error } = await supabaseClient.from('student_answers').upsert(payload);
        if (error) console.warn('Supabase student_answers sync notice:', error);
      }
    } catch(e) {
      console.warn('Supabase student_answers sync error:', e);
    }
  }

  loadUserSession() {
    const saved = localStorage.getItem('rizvi_fe_portal_user');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { console.error('Failed to parse user session:', e); }
    }
    return null; // Default to null (logged out)
  }

  saveUserSession(user) {
    if (user) {
      localStorage.setItem('rizvi_fe_portal_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rizvi_fe_portal_user');
    }
    this.currentUser = user;
  }

  login(emailInput, googlePayload = null) {
    const email = (emailInput || '').trim().toLowerCase();
    if (!email) return false;

    let matchedUser = null;
    let role = null;
    let studentId = null;

    if (HARDCODED_ADMIN_EMAILS.some(e => e.trim().toLowerCase() === email)) {
      const foundFac = (this.data.faculty || []).find(f => (f.email || '').trim().toLowerCase() === email);
      role = 'admin';
      matchedUser = foundFac || { name: googlePayload ? googlePayload.name : 'Prof. Jugal Jagtap', email: email, department: 'First Year Engineering' };
    } else {
      const fac = (this.data.faculty || []).find(f => (f.email || '').trim().toLowerCase() === email);
      if (fac) {
        role = fac.role || 'faculty';
        matchedUser = fac;
      } else {
        const st = (this.data.students || []).find(s => {
          const sEmail = (s.email || '').trim().toLowerCase();
          const sUin = (s.uin || '').trim().toLowerCase();
          return (sEmail && sEmail === email) || (sEmail && email.startsWith(sEmail)) || (sUin && (email === sUin || email.startsWith(sUin)));
        });
        if (st) {
          role = 'student';
          matchedUser = st;
          studentId = st.id;
        }
      }
    }

    if (matchedUser && role) {
      const sessionUser = {
        name: (googlePayload && googlePayload.name) || matchedUser.name || 'User',
        email: matchedUser.email || email,
        role: role,
        studentId: studentId,
        uin: matchedUser.uin || null,
        branch: matchedUser.branch || null,
        batch: matchedUser.batch || null,
        picture: googlePayload ? googlePayload.picture : null,
        loggedInAt: new Date().toISOString()
      };
      this.saveUserSession(sessionUser);
      this.currentRole = role;
      if (studentId) this.activeStudentId = studentId;
      this.reconcileUserSession();
      this.closeModal();
      this.showToast(`Welcome back, ${sessionUser.name}! (${sessionUser.email})`, 'success');
      this.renderRoleSwitcher();
      this.renderSidebar();
      this.renderCurrentView();
      return true;
    } else {
      return false;
    }
  }

  handleGoogleCredentialResponse(response) {
    const feedback = document.getElementById('modal-login-feedback');
    if (!response || !response.credential) {
      if (feedback) feedback.innerHTML = `<div style="color:var(--danger); font-size:12px; font-weight:600;">⚠️ Google Sign-In failed. Please try again.</div>`;
      return;
    }

    const payload = parseJwtToken(response.credential);
    if (!payload || !payload.email) {
      if (feedback) feedback.innerHTML = `<div style="color:var(--danger); font-size:12px; font-weight:600;">⚠️ Failed to process Google account data.</div>`;
      return;
    }

    const email = payload.email.toLowerCase();
    const domain = email.split('@')[1];

    // Enforce Institutional Domain Restriction
    if (domain !== 'eng.rizvi.edu.in' && payload.hd !== 'eng.rizvi.edu.in') {
      if (feedback) {
        feedback.innerHTML = `
          <div style="background:#FEF2F2; border:1px solid #DC2626; padding:12px; border-radius:var(--radius-md); font-size:12px; color:#991B1B; margin-top:8px;">
            <strong>⛔ INSTITUTIONAL ACCESS ONLY!</strong><br>
            Signed in as <code>${email}</code>.<br>
            Only official <strong>@eng.rizvi.edu.in</strong> Google Workspace accounts are permitted.
          </div>
        `;
      }
      return;
    }

    const success = this.login(email, payload);
    if (!success && feedback) {
      feedback.innerHTML = `
        <div style="background:#FEF2F2; border:1px solid #DC2626; padding:12px; border-radius:var(--radius-md); font-size:12px; color:#991B1B; margin-top:8px;">
          <strong>⛔ UNLISTED ACCOUNT!</strong><br>
          • Authenticated via Google Workspace as <code>${email}</code>.<br>
          • Account is not currently whitelisted in Student Master or Faculty Roster.<br>
          • Contact System Administrator (<code style="color:#DC2626;">jugaljagtap@eng.rizvi.edu.in</code>).
        </div>
      `;
    }
  }

  logout() {
    this.saveUserSession(null);
    this.showToast('Logged out of Rizvi FE Portal', 'info');
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
    this.showLoginModal(false);
  }

  showLoginModal(canClose = false) {
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const facultyOptions = this.data.faculty.map(f => `<option value="${f.email}">${f.name} (${f.email})</option>`).join('');
    const studentOptions = this.data.students.map(s => `<option value="${s.email}">${s.uin} - ${s.name} (${s.branch} - ${s.batch})</option>`).join('');

    const isPlaceholderClientId = GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID');

    overlay.innerHTML = `
      <div class="modal-card" style="max-width:540px; border-radius:var(--radius-xl); border:1px solid var(--border-strong); box-shadow:var(--shadow-level-4);">
        <div class="modal-header" style="background:var(--bg-subtle); border-bottom:1px solid var(--border-default); padding:16px 20px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; background:var(--accent-blue); color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">R</div>
            <div>
              <h3 class="modal-title" style="font-size:16px; font-weight:700;">Google Workspace Sign-In</h3>
              <div style="font-size:12px; color:var(--text-secondary);">Restricted to <code style="color:var(--accent-blue); font-weight:600;">@eng.rizvi.edu.in</code></div>
            </div>
          </div>
          ${canClose ? '<button class="close-btn" aria-label="Close modal" onclick="app.closeModal()">✕</button>' : ''}
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="background:var(--accent-blue-subtle); border:1px solid rgba(0,102,204,0.2); padding:12px 14px; border-radius:var(--radius-md); font-size:12px; color:var(--accent-blue); margin-bottom:18px;">
            <strong>🔒 Whitelist Policy Enforced:</strong> Official Google Workspace accounts with <code class="code-font">@eng.rizvi.edu.in</code> domain are authenticated automatically.
          </div>

          <!-- Official Google Identity Services OAuth Container -->
          <div style="margin-bottom:20px; text-align:center;">
            <label style="display:block; font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px;">Official Google Authentication</label>
            <div id="google-signin-btn-container" style="display:flex; justify-content:center; min-height:44px; align-items:center;"></div>
            ${isPlaceholderClientId ? `
              <div style="margin-top:8px; font-size:11px; color:#D97706; background:#FEF3C7; padding:8px; border-radius:6px;">
                💡 <strong>Developer Tip:</strong> Update <code>GOOGLE_CLIENT_ID</code> in <code>js/app.js</code> with your Google Cloud Console Client ID to activate live Google Sign-In.
              </div>
            ` : ''}
          </div>

          <!-- Collapsible Roster Test Bypass -->
          <details style="border-top:1px solid var(--border-default); padding-top:14px; margin-top:14px;">
            <summary style="font-size:12px; font-weight:600; color:var(--text-secondary); cursor:pointer; user-select:none;">
              ⚙️ Local Testing / Roster Quick-Select (Dev Bypass)
            </summary>
            <div style="margin-top:12px; padding-top:8px;">
              <div style="display:flex; gap:8px; margin-bottom:10px;">
                <button class="btn btn-primary" onclick="app.login('jugaljagtap@eng.rizvi.edu.in')" style="flex:1; justify-content:center; padding:9px; font-weight:600; font-size:12px;">
                  ⚡ Sign In as Admin & Faculty
                </button>
                <button class="btn btn-secondary" onclick="app.login('test_student')" style="flex:1; justify-content:center; padding:9px; font-weight:600; font-size:12px; border-color:var(--accent-blue); color:var(--accent-blue);">
                  🎓 Sign In as Test Student
                </button>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
                <div>
                  <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">👨‍🏫 Faculty Roster:</label>
                  <select id="quick-faculty-select" class="form-control" style="font-size:12px;" onchange="if(this.value) app.login(this.value)">
                    <option value="">-- Select Faculty --</option>
                    ${facultyOptions}
                  </select>
                </div>

                <div>
                  <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">🎓 Student Master (${this.data.students.length}):</label>
                  <select id="quick-student-select" class="form-control" style="font-size:12px;" onchange="if(this.value) app.login(this.value)">
                    <option value="">-- Select Student --</option>
                    ${studentOptions}
                  </select>
                </div>
              </div>

              <div>
                <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Enter Institutional Email:</label>
                <div style="display:flex; gap:8px;">
                  <input type="email" id="modal-login-email" class="form-control" placeholder="user@eng.rizvi.edu.in" style="flex:1; font-size:12px;" value="jugaljagtap@eng.rizvi.edu.in">
                  <button class="btn btn-secondary" onclick="app.handleCustomLogin()" style="font-size:12px; font-weight:600; white-space:nowrap;">
                    🔑 Test Login
                  </button>
                </div>
              </div>
            </div>
          </details>

          <div id="modal-login-feedback" style="margin-top:10px;"></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      overlay.classList.add('active');
      this.initGoogleAuth();
    }, 10);
  }

  initGoogleAuth() {
    if (window.google && window.google.accounts) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => this.handleGoogleCredentialResponse(response),
          auto_select: false,
          hd: 'eng.rizvi.edu.in'
        });

        const container = document.getElementById('google-signin-btn-container');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: 300
          });
        }

        // Trigger Google One-Tap popup prompt
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('Google Identity Services initialization failed or missing Client ID:', e);
      }
    }
  }

  handleCustomLogin() {
    const input = document.getElementById('modal-login-email');
    const feedback = document.getElementById('modal-login-feedback');
    if (!input || !feedback) return;

    const email = input.value.trim();
    if (!email) {
      feedback.innerHTML = `<div style="color:var(--danger); font-size:12px; font-weight:600;">⚠️ Please enter your @eng.rizvi.edu.in email address.</div>`;
      return;
    }

    const success = this.login(email);
    if (!success) {
      feedback.innerHTML = `
        <div style="background:#FEF2F2; border:1px solid #DC2626; padding:12px; border-radius:var(--radius-md); font-size:12px; color:#991B1B; margin-top:8px;">
          <strong>⛔ LOGIN DENIED: UNLISTED ACCOUNT!</strong><br>
          • <strong>Status:</strong> Authenticated as <code>${email}</code> via Google Workspace.<br>
          • <strong>Whitelist Status:</strong> NOT listed in Student Master, Faculty Roster, or Admin list.<br>
          • <strong>Access Result:</strong> Access is strictly blocked. Contact System Admin (<code style="color:#DC2626;">jugaljagtap@eng.rizvi.edu.in</code>).
        </div>
      `;
    }
  }

  loadState() {
    let state = null;
    const saved = localStorage.getItem('rizvi_fe_portal_data');
    if (saved) {
      try { state = JSON.parse(saved); } catch(e) { console.error('Failed to parse state:', e); }
    }

    if (!state) {
      state = JSON.parse(JSON.stringify(INITIAL_DATA));
    }

    if (!state.students) state.students = [];
    if (!state.faculty) state.faculty = JSON.parse(JSON.stringify(INITIAL_DATA.faculty));
    if (!state.courseOutcomes) state.courseOutcomes = [];
    if (!state.programSpecificOutcomes) state.programSpecificOutcomes = JSON.parse(JSON.stringify(INITIAL_DATA.programSpecificOutcomes));
    state.academicClasses = JSON.parse(JSON.stringify(INITIAL_DATA.academicClasses));
    state.rubricPresets = JSON.parse(JSON.stringify(INITIAL_DATA.rubricPresets));
    if (!state.assignments) state.assignments = [];
    if (!state.submissions) state.submissions = [];
    if (!state.studentVariables) state.studentVariables = [];
    if (!state.studentAnswers) state.studentAnswers = [];
    if (!state.modules) state.modules = [];

    // Clean and deduplicate subjects by subject code
    const initialSubs = JSON.parse(JSON.stringify(INITIAL_DATA.subjects));
    if (!state.subjects || state.subjects.length === 0 || state.subjects.filter(s => s.code === '24051181').length > 1) {
      state.subjects = initialSubs;
    } else {
      const uniqueSubMap = new Map();
      state.subjects.forEach(s => {
        if (s && s.code && !uniqueSubMap.has(s.code)) {
          uniqueSubMap.set(s.code, s);
        }
      });
      state.subjects = Array.from(uniqueSubMap.values());
    }

    // Force strict 6 Hardcoded Departments
    state.departments = JSON.parse(JSON.stringify(HARDCODED_DEPARTMENTS));

    // Ensure backwards compatibility for COs/LOs
    state.courseOutcomes.forEach(co => {
      if (!co.type) co.type = (co.code && co.code.includes('.LO')) ? 'LO' : 'CO';
      if (!co.poIds) co.poIds = co.poId ? [co.poId] : ['PO1'];
      if (!co.psoIds) co.psoIds = [];
      if (!co.moduleIds) co.moduleIds = [];
      if (!co.experimentIds) co.experimentIds = [];
    });

    // Backwards compatibility for submission records saved before late penalty fields were added
    (state.submissions || []).forEach(s => {
      if (s.attemptDeductionPct === undefined) s.attemptDeductionPct = s.deductionPct || 0;
      if (s.latePenaltyPct === undefined) s.latePenaltyPct = 0;
      if (s.isLate === undefined) s.isLate = false;
    });

    return state;
  }

  getDepartmentShortName(deptId) {
    const dept = (this.data.departments || []).find(d => d.id === deptId);
    if (!dept) return 'FE';
    if (dept.shortName) return dept.shortName;
    if (dept.id === 'dept-fe') return 'FE';
    if (dept.id === 'dept-aids') return 'AI&DS';
    if (dept.id === 'dept-civil') return 'Civil';
    if (dept.id === 'dept-comp') return 'Comp';
    if (dept.id === 'dept-ecs') return 'ECS';
    if (dept.id === 'dept-mech') return 'Mech';
    return 'FE';
  }

  saveState() {
    localStorage.setItem('rizvi_fe_portal_data', JSON.stringify(this.data));
  }

  resetState() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveState();
    this.reconcileUserSession();
    this.showToast('Database reset to default seed state', 'success');
    this.renderCurrentView();
  }

  reconcileUserSession() {
    if (!this.currentUser) return;

    const email = (this.currentUser.email || '').trim().toLowerCase();
    const uin = (this.currentUser.uin || '').trim().toLowerCase();
    const studentId = this.currentUser.studentId;

    if (email || uin || studentId) {
      const matchedStudent = (this.data.students || []).find(s =>
        (email && s.email && s.email.trim().toLowerCase() === email) ||
        (uin && s.uin && s.uin.trim().toLowerCase() === uin) ||
        (studentId && s.id === studentId)
      );

      if (matchedStudent) {
        this.currentUser.role = 'student';
        this.currentUser.studentId = matchedStudent.id;
        this.currentUser.branch = matchedStudent.branch;
        this.currentUser.batch = matchedStudent.batch;
        this.currentUser.uin = matchedStudent.uin;
        if (!this.currentUser.name || this.currentUser.name === 'User') {
          this.currentUser.name = matchedStudent.name;
        }
        this.currentRole = 'student';
        this.activeStudentId = matchedStudent.id;
        this.saveUserSession(this.currentUser);
      }
    }
  }

  getAssignmentSchedule(asgId, batchName) {
    const asg = this.data.assignments.find(a => a.id === asgId) || this.data.assignments[0];
    if (asg && asg.schedules && asg.schedules.length > 0) {
      const match = asg.schedules.find(s => s.scopeValue === batchName);
      if (match) return match;
      return asg.schedules[0];
    }
    return {
      publishDate: asg ? asg.publishDate : "2026-08-01T09:00",
      deadline: asg ? asg.deadline : "2026-08-10T23:59",
      submissionsOpen: true,
      gradesReleased: true,
      latePenaltyValue: 10,
      lateMaxCap: 30
    };
  }

  switchRole(role) {
    this.currentRole = role;
    this.activeNav = 'dashboard';
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
    this.showToast(`Switched view to ${role.toUpperCase()} mode`, 'info');
  }

  switchNav(navId) {
    // Guard: student trying to open solver with no assignments
    if (navId === 'solver' && this.currentRole === 'student' && this.data.assignments.length === 0) {
      this.showToast('No lab assignments are currently published. Check back with your faculty.', 'warning');
      return;
    }

    // Guard: student trying to open grades with no assignments
    if (navId === 'grades' && this.currentRole === 'student' && this.data.assignments.length === 0) {
      this.showToast('No assignments found. Grades will appear once lab assignments are published.', 'warning');
      return;
    }

    this.activeNav = navId;
    if (this.activeAssignmentId) {
      localStorage.setItem('rizvi_fe_active_asg_id', this.activeAssignmentId);
    }
    this.renderSidebar();
    this.renderCurrentView();
  }

  ensureActiveAssignment() {
    if (!this.activeAssignmentId || !this.data.assignments.find(a => a.id === this.activeAssignmentId)) {
      this.activeAssignmentId = this.data.assignments.length > 0 ? this.data.assignments[0].id : null;
      if (this.activeAssignmentId) {
        localStorage.setItem('rizvi_fe_active_asg_id', this.activeAssignmentId);
      }
    }
  }

  renderRoleSwitcher() {
    const switcher = document.getElementById('role-switcher-container');
    if (!switcher) return;

    if (!this.currentUser) {
      switcher.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="app.showLoginModal(false)" style="font-size:12px; font-weight:600;">
          Sign In with Google
        </button>
      `;
    } else if (this.currentUser.email === 'jugaljagtap@eng.rizvi.edu.in' || HARDCODED_ADMIN_EMAILS.includes(this.currentUser.email)) {
      // jugaljagtap@eng.rizvi.edu.in Dual-Role Profile Switcher Toggle
      switcher.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; gap:6px; background:var(--accent-blue-subtle); padding:4px 10px; border-radius:var(--radius-md); border:1px solid rgba(0,102,204,0.2);">
            <span style="font-size:11px; font-weight:700; color:var(--accent-blue);">PROFILER TOGGLE:</span>
            <button class="btn ${this.currentRole === 'admin' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('admin')" style="padding:2px 8px; font-size:11px;">Admin View</button>
            <button class="btn ${this.currentRole === 'faculty' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('faculty')" style="padding:2px 8px; font-size:11px;">Faculty View</button>
            <button class="btn ${this.currentRole === 'student' ? 'btn-secondary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('student')" style="padding:2px 8px; font-size:11px;">Student Preview</button>
          </div>
        </div>
      `;
    } else {
      switcher.innerHTML = `
        <span class="tag ${this.currentRole === 'faculty' ? 'tag-co' : 'tag-success'}" style="font-size:12px; padding:4px 10px;">
          ${this.currentRole.toUpperCase()} SESSION
        </span>
      `;
    }

    const userBadge = document.getElementById('active-user-badge');
    if (userBadge) {
      if (!this.currentUser) {
        userBadge.innerHTML = `<span style="font-size:12px; color:var(--text-tertiary);">Not Logged In</span>`;
      } else if (this.currentRole === 'student') {
        const student = this.data.students.find(s => s.id === this.activeStudentId) || this.currentUser;
        userBadge.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="avatar-dot"></span>
            <span style="font-size:13px; font-weight:600; color:var(--text-primary);">${student ? `${student.name} ${student.uin ? '(' + student.uin + ')' : ''}` : 'Student (No Profile)'}</span>
            <button class="btn btn-ghost btn-sm" onclick="app.logout()" style="color:var(--danger); font-weight:600; padding:3px 8px; font-size:11px; margin-left:6px; border:1px solid rgba(255,59,48,0.2); background:var(--danger-subtle);">
              Log Out
            </button>
          </div>
        `;
      } else {
        userBadge.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="avatar-dot"></span>
            <span style="font-size:13px; font-weight:600; color:var(--text-primary);">${this.currentUser.name} (${this.currentUser.role.toUpperCase()})</span>
            <button class="btn btn-ghost btn-sm" onclick="app.logout()" style="color:var(--danger); font-weight:600; padding:3px 8px; font-size:11px; margin-left:6px; border:1px solid rgba(255,59,48,0.2); background:var(--danger-subtle);">
              Log Out
            </button>
          </div>
        `;
      }
    }
  }

  setActiveStudent(studentId) {
    this.activeStudentId = studentId;
    this.renderCurrentView();
    this.showToast(`Switched active student perspective`, 'info');
  }

  renderSidebar() {
    const sidebar = document.getElementById('sidebar-nav');
    if (!sidebar) return;

    const iconMap = {
      'dashboard': 'layout-dashboard',
      'students': 'users',
      'faculty': 'graduation-cap',
      'departments': 'building-2',
      'google-auth': 'shield-check',
      'pos': 'target',
      'analytics': 'bar-chart-2',
      'course': 'book-open',
      'assignments': 'file-text',
      'schedules': 'calendar',
      'csv-pipeline': 'zap',
      'reports': 'bar-chart-2',
      'solver': 'pencil',
      'grades': 'trophy',
    };

    let items = [];
    if (this.currentRole === 'admin') {
      items = [
        { id: 'dashboard', label: 'Overview' },
        { id: 'students', label: 'Students' },
        { id: 'faculty', label: 'Faculty' },
        { id: 'departments', label: 'Institution' },
        { id: 'google-auth', label: 'Access Control' },
        { id: 'pos', label: 'Program Outcomes' },
        { id: 'analytics', label: 'Reports' }
      ];
    } else if (this.currentRole === 'faculty') {
      items = [
        { id: 'dashboard', label: 'Overview' },
        { id: 'course', label: 'My Course' },
        { id: 'assignments', label: 'Assignments' },
        { id: 'schedules', label: 'Schedule & Access' },
        { id: 'csv-pipeline', label: 'Grade & Evaluate' },
        { id: 'reports', label: 'Reports' }
      ];
    } else {
      items = [
        { id: 'dashboard', label: 'Home' },
        { id: 'solver', label: 'Solve Assignment' },
        { id: 'grades', label: 'My Results' }
      ];
    }

    sidebar.innerHTML = items.map(item => {
      const icon = iconMap[item.id] || 'circle';
      const isActive = this.activeNav === item.id;
      return `
        <div class="nav-item ${isActive ? 'active' : ''}"
          onclick="app.switchNav('${item.id}')"
          role="button"
          tabindex="0"
          aria-label="${item.label}">
          <i data-lucide="${icon}"></i>
          <span>${item.label}</span>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  renderCurrentView() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Always ensure activeAssignmentId points to a valid assignment
    this.ensureActiveAssignment();

    if (!this.currentUser) {
      main.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; text-align:center;">
          <div style="width:64px; height:64px; background:var(--accent-blue-subtle); color:var(--accent-blue); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:16px;">🔑</div>
          <h2 style="font-size:20px; font-weight:700; margin-bottom:8px;">Authentication Required</h2>
          <p style="color:var(--text-secondary); max-width:420px; font-size:13px; margin-bottom:20px;">Please sign in using your institutional <code class="code-font">@eng.rizvi.edu.in</code> Google account to access your assignment portal.</p>
          <button class="btn btn-primary" onclick="app.showLoginModal(false)" style="padding:10px 20px; font-weight:600;">
            🔑 Sign In with Google Workspace
          </button>
        </div>
      `;
      return;
    }

    if (this.currentRole === 'admin') {
      adminView.render(main, this.activeNav);
    } else if (this.currentRole === 'faculty') {
      facultyView.render(main, this.activeNav);
    } else {
      studentView.render(main, this.activeNav);
    }
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentUser) this.closeModal();
    });
  }

  showModal(title, contentHtml) {
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="close-btn" aria-label="Close modal" onclick="app.closeModal()">✕</button>
        </div>
        <div class="modal-body">${contentHtml}</div>
      </div>
    `;

    setTimeout(() => overlay.classList.add('active'), 10);
  }

  closeModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    }
  }

  getEmbeddableImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();
    if (!url) return '';

    // Data URIs or blob URLs
    if (url.startsWith('data:image/') || url.startsWith('blob:')) return url;

    // Convert Google Drive view/share URLs to direct image URLs
    // e.g. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // e.g. https://drive.google.com/open?id=FILE_ID
    // e.g. https://drive.google.com/uc?id=FILE_ID
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                       url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // Convert Dropbox sharing URLs to raw direct images
    if (url.includes('dropbox.com')) {
      return url.replace('dl=0', 'raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }

    return url;
  }

  handleImageError(imgEl, originalUrl) {
    if (!imgEl || !imgEl.parentElement) return;
    const parent = imgEl.parentElement;
    const safeUrl = originalUrl ? String(originalUrl).replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
    parent.innerHTML = `
      <div class="diagram-fallback-card" style="padding:12px; border:1px dashed var(--border-warning, #e6a23c); background:var(--warning-subtle, #fdf6ec); border-radius:6px; font-size:13px; display:flex; align-items:center; gap:10px; color:var(--text-secondary, #606266); margin:10px 0;">
        <span style="font-size:20px;">🖼️</span>
        <div>
          <strong>Diagram Image Failed to Load:</strong> Make sure link is set to <em>"Anyone with link can view"</em> on Google Drive, or 
          <a href="${safeUrl}" target="_blank" rel="noopener" style="color:var(--accent-blue, #0066cc); text-decoration:underline;">click here to view diagram image directly</a>.
        </div>
      </div>
    `;
  }

  formatNaturalMath(str) {
    if (!str || typeof str !== 'string') return str || '';

    let res = str;

    // 1. LaTeX fractions \frac{num}{den} if not rendered by KaTeX
    res = res.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (match, num, den) => {
      return `<span class="math-frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
    });

    // 2. Complex ASCII fractions (num)/(den) where num or den contain operations/spaces
    res = res.replace(/\(([^)]+[\+\-\*\/][^)]*)\)\s*\/\s*\(([^)]+)\)/g, (match, num, den) => {
      return `<span class="math-frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
    });

    // 3. Simple denominator parentheses around single terms/units e.g. N/(m^2) -> N/m^2, kg/(m^3) -> kg/m^3
    res = res.replace(/\/\s*\(([a-zA-Z0-9\^\+\-\.\s]+)\)/g, '/$1');

    // 4. Powers / Superscripts: e.g. ^2, ^3, ^-1, ^{x}, ^(1/2)
    res = res.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    res = res.replace(/\^\(([^)]+)\)/g, '<sup>$1</sup>');
    res = res.replace(/\^([\-+]?[0-9a-zA-Z.]+)/g, '<sup>$1</sup>');

    // 5. Subscripts: e.g. _1, _n, _{max}, _(min)
    res = res.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    res = res.replace(/_\(([^)]+)\)/g, '<sub>$1</sub>');
    res = res.replace(/_([0-9a-zA-Z]+)/g, '<sub>$1</sub>');

    return res;
  }

  formatQuestionText(text, variablesMap = null) {
    if (!text || typeof text !== 'string') return '';

    let formatted = text;

    // Step 1: Variable substitution (if variablesMap provided)
    if (variablesMap) {
      formatted = formatted.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
        const varKey = p1.trim();
        const val = variablesMap[varKey];
        if (val !== undefined && val !== null) {
          // Plain natural text — no separate background, border, font-family, or badge
          return val;
        } else {
          // Missing variable fallback: subtle inline placeholder
          return `<span class="var-missing">{{${varKey}}}</span>`;
        }
      });
    } else {
      // If no variablesMap passed (e.g. Faculty preview mode before substitution),
      // render {{varKey}} smoothly without heavy chip box
      formatted = formatted.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
        return `<span class="var-placeholder">{{${p1.trim()}}}</span>`;
      });
    }

    // Step 2: Render LaTeX math if KaTeX is present and text contains $...$ or \(...\)
    if (window.katex && (formatted.includes('$') || formatted.includes('\\('))) {
      formatted = formatted.replace(/\$(.*?)\$/g, (m, math) => {
        try { return window.katex.renderToString(math, { throwOnError: false }); } catch(e) { return m; }
      });
      formatted = formatted.replace(/\\\((.*?)\\\)/g, (m, math) => {
        try { return window.katex.renderToString(math, { throwOnError: false }); } catch(e) { return m; }
      });
    }

    // Step 3: Natural ASCII Math Formatting (Powers, Ratios, Numerators/Denominators)
    formatted = this.formatNaturalMath(formatted);

    return formatted;
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'danger' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 200);
    }, 3500);
  }
}

const app = new AppEngine();
document.addEventListener('DOMContentLoaded', () => app.init());
