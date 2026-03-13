// ── Grade point lookup ──────────────────────────────────────────────────────
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};

function gradeClass(grade) {
  if (!grade || grade === 'IP') return grade === 'IP' ? 'grade-IP' : 'grade-none';
  if (grade === 'P')  return 'grade-P';
  if (grade === 'NP') return 'grade-NP';
  if (grade === 'W')  return 'grade-W';
  const letter = grade[0];
  if ('ABCDF'.includes(letter)) return `grade-${letter}`;
  return 'grade-none';
}

// ── Data layer ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'semesterplan_v1';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  // Default starter data
  return {
    semesters: [
      {
        id: uid(), name: 'Fall 2024', collapsed: false,
        courses: [
          { id: uid(), name: 'Introduction to Computer Science', code: 'CS 101', credits: 3, grade: 'A', done: true, notes: '' },
          { id: uid(), name: 'Calculus I', code: 'MATH 151', credits: 4, grade: 'B+', done: true, notes: '' },
          { id: uid(), name: 'English Composition', code: 'ENG 101', credits: 3, grade: 'A-', done: true, notes: '' }
        ]
      },
      {
        id: uid(), name: 'Spring 2025', collapsed: false,
        courses: [
          { id: uid(), name: 'Data Structures', code: 'CS 201', credits: 3, grade: 'IP', done: false, notes: 'Midterm on Apr 2' },
          { id: uid(), name: 'Calculus II', code: 'MATH 152', credits: 4, grade: '', done: false, notes: '' }
        ]
      },
      {
        id: uid(), name: 'Fall 2025', collapsed: false,
        courses: [
          { id: uid(), name: 'Algorithms', code: 'CS 301', credits: 3, grade: '', done: false, notes: '' }
        ]
      }
    ]
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── State ────────────────────────────────────────────────────────────────────
let state = loadData();
let editTarget = null; // { semesterId, courseId } — null means "add new"

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  const container = document.getElementById('semesters-container');
  container.innerHTML = '';

  state.semesters.forEach(sem => {
    container.appendChild(buildSemesterEl(sem));
  });

  updateSummary();
}

function buildSemesterEl(sem) {
  const credits = sem.courses.reduce((s, c) => s + Number(c.credits), 0);
  const doneCredits = sem.courses.filter(c => c.done).reduce((s, c) => s + Number(c.credits), 0);

  const el = document.createElement('div');
  el.className = 'semester' + (sem.collapsed ? ' collapsed' : '');
  el.dataset.semId = sem.id;

  el.innerHTML = `
    <div class="semester-header">
      <div class="semester-title">
        <span class="chevron">▼</span>
        <span>${escHtml(sem.name)}</span>
      </div>
      <div class="semester-meta">
        <span class="badge">${credits} credits</span>
        ${doneCredits > 0 ? `<span class="badge green">${doneCredits} done</span>` : ''}
        <span>${sem.courses.length} course${sem.courses.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="semester-actions">
        <button class="btn-delete-semester" data-sem-id="${sem.id}" title="Delete semester">✕ Remove</button>
      </div>
    </div>
    <div class="semester-body">
      ${buildCoursesTable(sem)}
      <div class="add-course-row">
        <button class="btn-primary btn-sm add-course-btn" data-sem-id="${sem.id}">+ Add Course</button>
      </div>
    </div>`;

  // Collapse toggle
  el.querySelector('.semester-header').addEventListener('click', e => {
    if (e.target.closest('.semester-actions')) return;
    sem.collapsed = !sem.collapsed;
    saveData(state);
    render();
  });

  // Delete semester
  el.querySelector('.btn-delete-semester').addEventListener('click', e => {
    e.stopPropagation();
    if (confirm(`Remove semester "${sem.name}" and all its courses?`)) {
      state.semesters = state.semesters.filter(s => s.id !== sem.id);
      saveData(state);
      render();
    }
  });

  // Add course
  el.querySelector('.add-course-btn').addEventListener('click', e => {
    e.stopPropagation();
    openCourseModal(sem.id, null);
  });

  // Edit / delete course buttons
  el.querySelectorAll('.edit-course-btn').forEach(btn => {
    btn.addEventListener('click', () => openCourseModal(sem.id, btn.dataset.courseId));
  });
  el.querySelectorAll('.delete-course-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCourse(sem.id, btn.dataset.courseId));
  });

  // Done checkboxes
  el.querySelectorAll('.checkbox-done').forEach(cb => {
    cb.addEventListener('change', () => {
      const course = findCourse(sem.id, cb.dataset.courseId);
      if (course) { course.done = cb.checked; saveData(state); render(); }
    });
  });

  return el;
}

function buildCoursesTable(sem) {
  if (sem.courses.length === 0) {
    return `<p class="empty-state">No courses yet — add one below.</p>`;
  }
  const rows = sem.courses.map(c => `
    <tr class="${c.done ? 'row-done' : ''}">
      <td><input type="checkbox" class="checkbox-done" data-course-id="${c.id}" ${c.done ? 'checked' : ''} /></td>
      <td>
        <div class="course-name">${escHtml(c.name)}</div>
        <div class="course-code">${escHtml(c.code)}</div>
      </td>
      <td>${c.credits}</td>
      <td class="course-notes-cell">${escHtml(c.notes)}</td>
      <td><span class="grade-chip ${gradeClass(c.grade)}">${escHtml(c.grade || '—')}</span></td>
      <td>
        <button class="icon-btn edit-course-btn" data-course-id="${c.id}" title="Edit">✏️</button>
        <button class="icon-btn danger delete-course-btn" data-course-id="${c.id}" title="Delete">🗑️</button>
      </td>
    </tr>`).join('');

  return `
    <table class="courses-table">
      <thead>
        <tr>
          <th>Done</th>
          <th>Course</th>
          <th>Credits</th>
          <th>Notes</th>
          <th>Grade</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function updateSummary() {
  let total = 0, done = 0, gradePoints = 0, gradeCredits = 0;
  state.semesters.forEach(sem => {
    sem.courses.forEach(c => {
      total += Number(c.credits);
      if (c.done) done += Number(c.credits);
      if (c.grade && GRADE_POINTS[c.grade] !== undefined) {
        gradePoints += GRADE_POINTS[c.grade] * Number(c.credits);
        gradeCredits += Number(c.credits);
      }
    });
  });
  document.getElementById('total-credits').textContent = `${total} credits planned`;
  document.getElementById('completed-credits').textContent = `${done} credits completed`;
  const gpa = gradeCredits > 0 ? (gradePoints / gradeCredits).toFixed(2) : '—';
  document.getElementById('gpa-display').textContent = `GPA: ${gpa}`;
}

// ── Modal ────────────────────────────────────────────────────────────────────
function openCourseModal(semesterId, courseId) {
  editTarget = { semesterId, courseId };
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  overlay.classList.remove('hidden');
  if (courseId) {
    const course = findCourse(semesterId, courseId);
    titleEl.textContent = 'Edit Course';
    document.getElementById('course-name').value    = course.name;
    document.getElementById('course-code').value    = course.code;
    document.getElementById('course-credits').value = course.credits;
    document.getElementById('course-grade').value   = course.grade;
    document.getElementById('course-notes').value   = course.notes;
  } else {
    titleEl.textContent = 'Add Course';
    document.getElementById('course-name').value    = '';
    document.getElementById('course-code').value    = '';
    document.getElementById('course-credits').value = '3';
    document.getElementById('course-grade').value   = '';
    document.getElementById('course-notes').value   = '';
  }
  document.getElementById('course-name').focus();
}

function closeCourseModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editTarget = null;
}

function saveCourseModal() {
  const name    = document.getElementById('course-name').value.trim();
  const code    = document.getElementById('course-code').value.trim();
  const credits = parseFloat(document.getElementById('course-credits').value) || 0;
  const grade   = document.getElementById('course-grade').value;
  const notes   = document.getElementById('course-notes').value.trim();

  if (!name) { alert('Please enter a course name.'); return; }

  const { semesterId, courseId } = editTarget;
  const sem = state.semesters.find(s => s.id === semesterId);
  if (!sem) return;

  if (courseId) {
    const course = sem.courses.find(c => c.id === courseId);
    if (course) Object.assign(course, { name, code, credits, grade, notes });
  } else {
    sem.courses.push({ id: uid(), name, code, credits, grade, done: false, notes });
  }

  saveData(state);
  closeCourseModal();
  render();
}

// ── Add Semester modal ────────────────────────────────────────────────────────
function openSemesterModal() {
  document.getElementById('semester-name').value = '';
  document.getElementById('semester-modal-overlay').classList.remove('hidden');
  document.getElementById('semester-name').focus();
}
function closeSemesterModal() {
  document.getElementById('semester-modal-overlay').classList.add('hidden');
}
function saveSemesterModal() {
  const name = document.getElementById('semester-name').value.trim();
  if (!name) { alert('Please enter a semester name.'); return; }
  state.semesters.push({ id: uid(), name, collapsed: false, courses: [] });
  saveData(state);
  closeSemesterModal();
  render();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function findCourse(semId, courseId) {
  const sem = state.semesters.find(s => s.id === semId);
  return sem ? sem.courses.find(c => c.id === courseId) : null;
}

function deleteCourse(semId, courseId) {
  const sem = state.semesters.find(s => s.id === semId);
  if (!sem) return;
  const course = sem.courses.find(c => c.id === courseId);
  if (!course) return;
  if (confirm(`Remove "${course.name}"?`)) {
    sem.courses = sem.courses.filter(c => c.id !== courseId);
    saveData(state);
    render();
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event wiring ─────────────────────────────────────────────────────────────
document.getElementById('modal-cancel').addEventListener('click', closeCourseModal);
document.getElementById('modal-save').addEventListener('click', saveCourseModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeCourseModal();
});

document.getElementById('add-semester-btn').addEventListener('click', openSemesterModal);
document.getElementById('semester-modal-cancel').addEventListener('click', closeSemesterModal);
document.getElementById('semester-modal-save').addEventListener('click', saveSemesterModal);
document.getElementById('semester-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('semester-modal-overlay')) closeSemesterModal();
});

// Enter key in modals
document.getElementById('course-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveCourseModal(); });
document.getElementById('semester-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveSemesterModal(); });

// ── Boot ─────────────────────────────────────────────────────────────────────
render();
