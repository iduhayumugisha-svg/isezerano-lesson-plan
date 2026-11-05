/**
 * Comprehensive Security and Functionality Audit Test Suite for ISEZERANO ONLINE
 * 
 * Verifies all security requirements:
 * 1. Strict single administrator: ONLY twizerefelix90@gmail.com with verified Google auth.
 *    Any other user with admin: true claim is STRICTLY REJECTED.
 * 2. User profile field protection:
 *    - Teacher profile creation & updates restricted to 8 permitted fields.
 *    - Injection of admin, isAdmin, permissions, or role elevation is STRICTLY REJECTED.
 *    - Role and status are immutable by teachers.
 *    - Admin retains full management capability.
 * 3. Public comments privacy & moderation:
 *    - Public visitors can ONLY read comments whose status is 'approved' AND which do not contain private emails/phones.
 *    - Comments with status 'pending' or 'rejected' are strictly denied to public visitors and visible to Admin only.
 *    - Comments with private email addresses are hidden from public reads and visible to Admin only.
 *    - Public submissions with email/phone attached are blocked by isValidPublicComment.
 *    - Public submission with valid fields (name, content, postId, status: 'pending', createdAt) succeeds.
 *    - Public visitors cannot update or delete comments; Admin can moderate/update and delete.
 * 4. Post view counter:
 *    - Exact +1 increment (or initialization to 1) succeeds.
 *    - Attempting +2 or higher jump fails.
 *    - Attempting to decrease fails.
 *    - Explains and demonstrates that rules enforce +1 per request, but cannot perform stateful rate-limiting.
 * 5. Legacy general school settings: nursery_school_settings/general without ownerUid
 *    can be managed by twizerefelix90@gmail.com, but is completely denied to teachers.
 * 6. Lesson plans: ownerUid is authoritative; conflicting userId and ownerless records
 *    are blocked for teachers and restricted to administrator oversight.
 * 7. Multi-teacher isolation: Nursery students and assessments are completely private per teacher.
 * 8. Assessment attachment: cannot attach assessment to another teacher's student.
 * 9. Default deny for unauthenticated, anonymous, and non-Google providers.
 */

interface AuthContext {
  uid?: string;
  token?: {
    email?: string;
    email_verified?: boolean;
    admin?: boolean;
    firebase?: {
      sign_in_provider?: string;
    };
  };
}

interface FirestoreState {
  documents: Map<string, Record<string, any>>;
}

class FirestoreRulesEngine {
  private state: FirestoreState;

  constructor(initialDocs?: Record<string, any>) {
    this.state = {
      documents: new Map()
    };
    if (initialDocs) {
      for (const [path, data] of Object.entries(initialDocs)) {
        this.state.documents.set(path, JSON.parse(JSON.stringify(data)));
      }
    }
  }

  public getDoc(path: string): Record<string, any> | null {
    return this.state.documents.get(path) || null;
  }

  public setDoc(path: string, data: Record<string, any>): void {
    this.state.documents.set(path, JSON.parse(JSON.stringify(data)));
  }

  public deleteDoc(path: string): void {
    this.state.documents.delete(path);
  }

  // --- Rule evaluation helpers mirroring firestore.rules exactly ---

  private isAuthenticated(auth: AuthContext | null): boolean {
    return auth !== null && auth.uid !== undefined;
  }

  private isGoogleAuth(auth: AuthContext | null): boolean {
    return (
      this.isAuthenticated(auth) &&
      auth?.token?.firebase?.sign_in_provider === 'google.com' &&
      auth?.token?.email_verified === true
    );
  }

  private isAdmin(auth: AuthContext | null): boolean {
    if (!this.isGoogleAuth(auth)) return false;
    const email = auth?.token?.email;
    if (!email) return false;
    return /^twizerefelix90@gmail\.com$/i.test(email);
  }

  private isOwner(auth: AuthContext | null, uid: string): boolean {
    return this.isGoogleAuth(auth) && auth?.uid === uid;
  }

  // Permitted UserProfile fields
  private isAllowedUserKeys(keys: string[]): boolean {
    const allowed = new Set([
      'uid', 'email', 'displayName', 'role', 'status', 'schoolName', 'createdAt', 'updatedAt'
    ]);
    return keys.every(k => allowed.has(k));
  }

  private isSafeTeacherProfile(data: any, targetUid: string): boolean {
    if (!data || typeof data !== 'object') return false;
    const keys = Object.keys(data);
    if (!this.isAllowedUserKeys(keys)) return false;
    if (data.uid !== targetUid) return false;
    if (data.role !== 'teacher') return false;
    if ('admin' in data || 'isAdmin' in data || 'permissions' in data || 'isSuperAdmin' in data) {
      return false;
    }
    return true;
  }

  private isValidNurseryStudent(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.fullName !== 'string' || data.fullName.length < 2 || data.fullName.length > 120) return false;
    if (typeof data.classGrade !== 'string' || data.classGrade.length < 1 || data.classGrade.length > 20) return false;
    if (typeof data.ownerUid !== 'string' || data.ownerUid.length === 0) return false;
    const validGenders = ['Boy', 'Girl', 'Gabo', 'Gore'];
    if (!validGenders.includes(data.gender)) return false;
    if ('registrationNumber' in data && (typeof data.registrationNumber !== 'string' || data.registrationNumber.length > 60)) return false;
    if ('parentContact' in data && (typeof data.parentContact !== 'string' || data.parentContact.length > 60)) return false;
    if ('academicYear' in data && (typeof data.academicYear !== 'string' || data.academicYear.length > 20)) return false;
    if ('photoUrl' in data && (typeof data.photoUrl !== 'string' || data.photoUrl.length > 2000)) return false;
    return true;
  }

  private isValidLegacyGeneralSettings(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if ('schoolName' in data && (typeof data.schoolName !== 'string' || data.schoolName.length > 120)) return false;
    if ('district' in data && (typeof data.district !== 'string' || data.district.length > 80)) return false;
    if ('sector' in data && (typeof data.sector !== 'string' || data.sector.length > 80)) return false;
    if ('cell' in data && (typeof data.cell !== 'string' || data.cell.length > 80)) return false;
    if ('village' in data && (typeof data.village !== 'string' || data.village.length > 80)) return false;
    if ('academicYear' in data && (typeof data.academicYear !== 'string' || data.academicYear.length > 20)) return false;
    return true;
  }

  private isValidTeacherSchoolSettings(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.ownerUid !== 'string' || data.ownerUid.length === 0) return false;
    return this.isValidLegacyGeneralSettings(data);
  }

  private isValidNurseryAssessment(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.studentId !== 'string' || data.studentId.length === 0 || data.studentId.length > 120) return false;
    if (typeof data.ownerUid !== 'string' || data.ownerUid.length === 0) return false;
    if ('academicYear' in data && (typeof data.academicYear !== 'string' || data.academicYear.length > 20)) return false;
    return true;
  }

  private studentBelongsToTeacher(studentId: string, teacherUid: string): boolean {
    const studentPath = `nursery_students/${studentId}`;
    const student = this.getDoc(studentPath);
    return student !== null && student.ownerUid === teacherUid;
  }

  private isLessonPlanCleanOwner(auth: AuthContext | null, data: any): boolean {
    if (!this.isGoogleAuth(auth) || !auth?.uid) return false;
    if (!('ownerUid' in data) || typeof data.ownerUid !== 'string') return false;
    if (data.ownerUid !== auth.uid) return false;
    if ('userId' in data && data.userId !== auth.uid) return false;
    return true;
  }

  private isValidPublicComment(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    const allowed = new Set(['name', 'content', 'postId', 'createdAt', 'status']);
    const keys = Object.keys(data);
    if (!keys.every(k => allowed.has(k))) return false;
    if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 80) return false;
    if (typeof data.content !== 'string' || data.content.length < 2 || data.content.length > 2000) return false;
    if (typeof data.postId !== 'string' || data.postId.length === 0 || data.postId.length > 120) return false;
    if ('status' in data && data.status !== 'pending') return false;
    return true;
  }

  // --- Operations evaluation ---

  // 1. Users collection
  public canReadUser(auth: AuthContext | null, targetUserId: string): boolean {
    return this.isOwner(auth, targetUserId) || this.isAdmin(auth);
  }

  public canCreateUser(auth: AuthContext | null, targetUserId: string, newUserData: any): boolean {
    if (this.isAdmin(auth)) return true;
    if (!this.isOwner(auth, targetUserId)) return false;
    return (
      this.isSafeTeacherProfile(newUserData, targetUserId) &&
      newUserData.status === 'active' &&
      newUserData.email === auth?.token?.email
    );
  }

  public canUpdateUser(auth: AuthContext | null, targetUserId: string, existingData: any, updatedData: any): boolean {
    if (this.isAdmin(auth)) return true;
    if (!this.isOwner(auth, targetUserId)) return false;
    return (
      this.isSafeTeacherProfile(updatedData, targetUidOrSelf(targetUserId)) &&
      updatedData.email === existingData.email &&
      existingData.role === 'teacher' &&
      updatedData.status === existingData.status
    );
  }

  public canDeleteUser(auth: AuthContext | null, targetUserId: string): boolean {
    return this.isAdmin(auth);
  }

  // 2. Nursery Students collection
  public canReadNurseryStudent(auth: AuthContext | null, studentId: string): boolean {
    const existing = this.getDoc(`nursery_students/${studentId}`);
    if (!existing) return false;
    return this.isOwner(auth, existing.ownerUid) || this.isAdmin(auth);
  }

  public canCreateNurseryStudent(auth: AuthContext | null, studentId: string, data: any): boolean {
    const isValid = this.isValidNurseryStudent(data);
    if (!isValid) return false;
    return this.isOwner(auth, data.ownerUid) || this.isAdmin(auth);
  }

  public canUpdateNurseryStudent(auth: AuthContext | null, studentId: string, existing: any, updated: any): boolean {
    const isValid = this.isValidNurseryStudent(updated);
    if (!isValid) return false;
    if (this.isAdmin(auth)) return true;
    return (
      this.isOwner(auth, existing.ownerUid) &&
      updated.ownerUid === existing.ownerUid
    );
  }

  public canDeleteNurseryStudent(auth: AuthContext | null, studentId: string): boolean {
    const existing = this.getDoc(`nursery_students/${studentId}`);
    if (!existing) return false;
    return this.isOwner(auth, existing.ownerUid) || this.isAdmin(auth);
  }

  // 3. Nursery School Settings
  public canReadSchoolSettings(auth: AuthContext | null, settingId: string): boolean {
    const existing = this.getDoc(`nursery_school_settings/${settingId}`);
    if (!existing) return false;
    if (settingId === 'general') {
      return this.isAdmin(auth);
    }
    return this.isOwner(auth, existing.ownerUid) || this.isAdmin(auth);
  }

  public canCreateSchoolSettings(auth: AuthContext | null, settingId: string, data: any): boolean {
    if (settingId === 'general') {
      return this.isAdmin(auth) && this.isValidLegacyGeneralSettings(data);
    }
    if (!this.isValidTeacherSchoolSettings(data)) return false;
    return this.isOwner(auth, data.ownerUid) || this.isAdmin(auth);
  }

  public canUpdateSchoolSettings(auth: AuthContext | null, settingId: string, existing: any, updated: any): boolean {
    if (settingId === 'general') {
      return this.isAdmin(auth) && this.isValidLegacyGeneralSettings(updated);
    }
    if (!this.isValidTeacherSchoolSettings(updated)) return false;
    if (this.isAdmin(auth)) return true;
    return (
      this.isOwner(auth, existing.ownerUid) &&
      updated.ownerUid === existing.ownerUid
    );
  }

  public canDeleteSchoolSettings(auth: AuthContext | null, settingId: string): boolean {
    const existing = this.getDoc(`nursery_school_settings/${settingId}`);
    if (!existing) return false;
    if (settingId === 'general') {
      return this.isAdmin(auth);
    }
    return this.isOwner(auth, existing.ownerUid) || this.isAdmin(auth);
  }

  // 4. Nursery Assessments
  public canReadNurseryAssessment(auth: AuthContext | null, assessmentId: string): boolean {
    const existing = this.getDoc(`nursery_assessments/${assessmentId}`);
    if (!existing) return false;
    return this.isOwner(auth, existing.ownerUid) || this.isAdmin(auth);
  }

  public canCreateNurseryAssessment(auth: AuthContext | null, assessmentId: string, data: any): boolean {
    if (!this.isGoogleAuth(auth)) return false;
    if (!this.isValidNurseryAssessment(data)) return false;
    if (this.isAdmin(auth)) {
      return this.getDoc(`nursery_students/${data.studentId}`) !== null;
    }
    return (
      this.isOwner(auth, data.ownerUid) &&
      this.studentBelongsToTeacher(data.studentId, auth!.uid!)
    );
  }

  public canUpdateNurseryAssessment(auth: AuthContext | null, assessmentId: string, existing: any, updated: any): boolean {
    if (!this.isGoogleAuth(auth)) return false;
    if (!this.isValidNurseryAssessment(updated)) return false;
    if (this.isAdmin(auth)) {
      return this.getDoc(`nursery_students/${updated.studentId}`) !== null;
    }
    return (
      this.isOwner(auth, existing.ownerUid) &&
      updated.ownerUid === existing.ownerUid &&
      updated.studentId === existing.studentId &&
      this.studentBelongsToTeacher(existing.studentId, auth!.uid!)
    );
  }

  public canDeleteNurseryAssessment(auth: AuthContext | null, assessmentId: string): boolean {
    const existing = this.getDoc(`nursery_assessments/${assessmentId}`);
    if (!existing) return false;
    return this.isOwner(auth, existing.ownerUid) || this.isAdmin(auth);
  }

  // 5. Lesson Plans
  public canReadLessonPlan(auth: AuthContext | null, planId: string): boolean {
    const existing = this.getDoc(`lesson_plans/${planId}`);
    if (!existing) return false;
    return this.isLessonPlanCleanOwner(auth, existing) || this.isAdmin(auth);
  }

  public canCreateLessonPlan(auth: AuthContext | null, planId: string, data: any): boolean {
    if (this.isAdmin(auth)) return true;
    if (!this.isGoogleAuth(auth) || !auth?.uid) return false;
    if (typeof data.ownerUid !== 'string' || data.ownerUid !== auth.uid) return false;
    if ('userId' in data && data.userId !== auth.uid) return false;
    return true;
  }

  public canUpdateLessonPlan(auth: AuthContext | null, planId: string, existing: any, updated: any): boolean {
    if (this.isAdmin(auth)) return true;
    if (!this.isLessonPlanCleanOwner(auth, existing)) return false;
    if (updated.ownerUid !== existing.ownerUid) return false;
    if ('userId' in updated && updated.userId !== auth!.uid) return false;
    return true;
  }

  public canDeleteLessonPlan(auth: AuthContext | null, planId: string): boolean {
    const existing = this.getDoc(`lesson_plans/${planId}`);
    if (!existing) return false;
    return this.isLessonPlanCleanOwner(auth, existing) || this.isAdmin(auth);
  }

  // 6. Posts (News) and View-Counter Increment
  public canReadPost(auth: AuthContext | null, postId: string): boolean {
    return true;
  }

  public canUpdatePost(auth: AuthContext | null, postId: string, existing: any, updated: any): boolean {
    if (this.isAdmin(auth)) return true;
    // Check diff affectedKeys hasOnly(['views'])
    const updatedKeys = Object.keys(updated);
    const changedKeys = updatedKeys.filter(k => updated[k] !== existing[k]);
    if (changedKeys.length !== 1 || changedKeys[0] !== 'views') {
      return false;
    }
    if (typeof updated.views !== 'number' || !Number.isInteger(updated.views)) {
      return false;
    }
    // Condition: (!('views' in existing) && updated.views == 1) || (updated.views == existing.views + 1)
    if (!('views' in existing)) {
      return updated.views === 1;
    }
    return updated.views === existing.views + 1;
  }

  // 7. Comments
  public canReadComment(auth: AuthContext | null, commentId: string): boolean {
    const existing = this.getDoc(`comments/${commentId}`);
    if (!existing) return false;
    if (this.isAdmin(auth)) return true;
    // Public read requires: status == 'approved' && !('email' in existing) && !('phone' in existing)
    return (
      existing.status === 'approved' &&
      !('email' in existing) &&
      !('phone' in existing)
    );
  }

  public canCreateComment(auth: AuthContext | null, commentId: string, data: any): boolean {
    if (this.isAdmin(auth)) return true;
    return this.isValidPublicComment(data);
  }

  public canUpdateComment(auth: AuthContext | null, commentId: string): boolean {
    return this.isAdmin(auth);
  }

  public canDeleteComment(auth: AuthContext | null, commentId: string): boolean {
    return this.isAdmin(auth);
  }
}

function targetUidOrSelf(targetUserId: string): string {
  return targetUserId;
}

// =========================================================================
// RUN ALL TESTS AGAINST THE RULES ENGINE
// =========================================================================

export function runSecurityAuditTests() {
  console.log('===========================================================');
  console.log('STARTING FIRESTORE SECURITY RULES COMPREHENSIVE AUDIT TEST');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, reason?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${reason ? ` - ${reason}` : ''}`);
      failed++;
    }
  }

  // Define Principals
  const teacherA: AuthContext = {
    uid: 'teacher-a-uid',
    token: {
      email: 'teacher.a@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' }
    }
  };

  const teacherB: AuthContext = {
    uid: 'teacher-b-uid',
    token: {
      email: 'teacher.b@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' }
    }
  };

  const admin: AuthContext = {
    uid: 'admin-felix-uid',
    token: {
      email: 'twizerefelix90@gmail.com',
      email_verified: true,
      admin: true,
      firebase: { sign_in_provider: 'google.com' }
    }
  };

  const maliciousAdminClaim: AuthContext = {
    uid: 'fake-admin-uid',
    token: {
      email: 'fake.admin@gmail.com',
      email_verified: true,
      admin: true,
      firebase: { sign_in_provider: 'google.com' }
    }
  };

  const anonymousUser: AuthContext = {
    uid: 'anon-user-123',
    token: {
      email_verified: false,
      firebase: { sign_in_provider: 'anonymous' }
    }
  };

  const unauthenticated: AuthContext | null = null;

  // Initialize engine with seed records
  const engine = new FirestoreRulesEngine({
    // Student belonging to Teacher B
    'nursery_students/student-b-1': {
      fullName: 'Keza Marie',
      classGrade: 'N1',
      gender: 'Girl',
      ownerUid: 'teacher-b-uid',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    // Student belonging to Teacher A
    'nursery_students/student-a-1': {
      fullName: 'Mugisha Eric',
      classGrade: 'N2',
      gender: 'Boy',
      ownerUid: 'teacher-a-uid',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    // Assessment belonging to Teacher B
    'nursery_assessments/assessment_student-b-1': {
      studentId: 'student-b-1',
      ownerUid: 'teacher-b-uid',
      term1Scores: { c1: 'EE' },
      updatedAt: '2026-01-01T00:00:00Z'
    },
    // School Settings for Teacher B
    'nursery_school_settings/teacher-b-uid': {
      ownerUid: 'teacher-b-uid',
      schoolName: 'GS Gitumba Nursery',
      district: 'Rulindo'
    },
    // School Settings for Teacher A
    'nursery_school_settings/teacher-a-uid': {
      ownerUid: 'teacher-a-uid',
      schoolName: 'GS Rulindo Primary',
      district: 'Rulindo'
    },
    // Legacy 'general' school settings (WITHOUT ownerUid)
    'nursery_school_settings/general': {
      schoolName: 'ISEZERANO Academy Legacy Main',
      district: 'Gasabo',
      sector: 'Remera'
    },
    // Clean lesson plan for Teacher B
    'lesson_plans/plan-b-1': {
      title: 'Kinyarwanda Reading',
      ownerUid: 'teacher-b-uid',
      userId: 'teacher-b-uid',
      subject: 'Kinyarwanda'
    },
    // Conflicting lesson plan (ownerUid != userId)
    'lesson_plans/plan-conflicting': {
      title: 'Mathematics Counting',
      ownerUid: 'teacher-a-uid',
      userId: 'teacher-b-uid',
      subject: 'Math'
    },
    // Legacy ownerless lesson plan (NO ownerUid)
    'lesson_plans/plan-ownerless': {
      title: 'Science Exploration',
      userId: 'teacher-a-uid',
      subject: 'Science'
    },
    // Post with views
    'posts/post-1': {
      title: 'Rwanda Education Board Updates',
      content: '<p>Update content</p>',
      views: 42
    },
    // Post with no views field yet
    'posts/post-2': {
      title: 'New Term Announcements',
      content: '<p>Term content</p>'
    },
    // Comments of various statuses
    'comments/comment-approved-clean': {
      name: 'John Doe',
      content: 'Very helpful article!',
      postId: 'post-1',
      status: 'approved'
    },
    'comments/comment-approved-with-email': {
      name: 'Jane Smith',
      content: 'Nice news!',
      postId: 'post-1',
      email: 'jane@example.com',
      status: 'approved'
    },
    'comments/comment-pending': {
      name: 'Pending Commenter',
      content: 'Awaiting moderation',
      postId: 'post-1',
      status: 'pending'
    },
    'comments/comment-rejected': {
      name: 'Spam Author',
      content: 'Rejected content',
      postId: 'post-1',
      status: 'rejected'
    },
    // Teacher B profile
    'users/teacher-b-uid': {
      uid: 'teacher-b-uid',
      email: 'teacher.b@gmail.com',
      displayName: 'Teacher B',
      role: 'teacher',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  });

  // -----------------------------------------------------------------------
  // TEST SUITE 1: STRICT SINGLE ADMINISTRATOR AUTHORIZATION
  // -----------------------------------------------------------------------
  console.log('\n--- 1. STRICT SINGLE ADMINISTRATOR TESTS ---');
  assert('Admin twizerefelix90@gmail.com CAN read any user profile', engine.canReadUser(admin, 'teacher-b-uid'));
  assert('Admin twizerefelix90@gmail.com CAN delete user profile', engine.canDeleteUser(admin, 'teacher-b-uid'));
  assert(
    'Attacker with token.admin == true but wrong email CANNOT read user profile',
    !engine.canReadUser(maliciousAdminClaim, 'teacher-b-uid'),
    'Token admin claim was ignored as required'
  );
  assert(
    'Attacker with token.admin == true but wrong email CANNOT delete user profile',
    !engine.canDeleteUser(maliciousAdminClaim, 'teacher-b-uid'),
    'Token admin claim was ignored as required'
  );
  assert(
    'Attacker with token.admin == true CANNOT read Teacher B student',
    !engine.canReadNurseryStudent(maliciousAdminClaim, 'student-b-1')
  );
  assert(
    'Attacker with token.admin == true CANNOT read Teacher B assessment',
    !engine.canReadNurseryAssessment(maliciousAdminClaim, 'assessment_student-b-1')
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 2: USER PROFILE FIELD PROTECTION & PRIVILEGE ESCALATION
  // -----------------------------------------------------------------------
  console.log('\n--- 2. USER PROFILE FIELD PROTECTION TESTS ---');
  assert(
    'Teacher A CAN create clean profile with permitted fields',
    engine.canCreateUser(teacherA, 'teacher-a-uid', {
      uid: 'teacher-a-uid',
      email: 'teacher.a@gmail.com',
      displayName: 'Teacher A',
      role: 'teacher',
      status: 'active',
      schoolName: 'GS Gitumba',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    })
  );
  assert(
    'Teacher A CANNOT create profile with admin: true',
    !engine.canCreateUser(teacherA, 'teacher-a-uid', {
      uid: 'teacher-a-uid',
      email: 'teacher.a@gmail.com',
      displayName: 'Teacher A',
      role: 'teacher',
      status: 'active',
      admin: true
    })
  );
  assert(
    'Teacher A CANNOT create profile with isAdmin: true',
    !engine.canCreateUser(teacherA, 'teacher-a-uid', {
      uid: 'teacher-a-uid',
      email: 'teacher.a@gmail.com',
      displayName: 'Teacher A',
      role: 'teacher',
      status: 'active',
      isAdmin: true
    })
  );
  assert(
    'Teacher A CANNOT create profile with permissions: ["all"]',
    !engine.canCreateUser(teacherA, 'teacher-a-uid', {
      uid: 'teacher-a-uid',
      email: 'teacher.a@gmail.com',
      displayName: 'Teacher A',
      role: 'teacher',
      status: 'active',
      permissions: ['all']
    })
  );
  assert(
    'Teacher A CANNOT create profile with unexpected field "customSuper"',
    !engine.canCreateUser(teacherA, 'teacher-a-uid', {
      uid: 'teacher-a-uid',
      email: 'teacher.a@gmail.com',
      displayName: 'Teacher A',
      role: 'teacher',
      status: 'active',
      customSuper: true
    })
  );
  assert(
    'Teacher B CANNOT update profile to inject admin: true',
    !engine.canUpdateUser(teacherB, 'teacher-b-uid', engine.getDoc('users/teacher-b-uid'), {
      ...engine.getDoc('users/teacher-b-uid'),
      admin: true
    })
  );
  assert(
    'Teacher B CANNOT update role to admin',
    !engine.canUpdateUser(teacherB, 'teacher-b-uid', engine.getDoc('users/teacher-b-uid'), {
      ...engine.getDoc('users/teacher-b-uid'),
      role: 'admin'
    })
  );
  assert(
    'Teacher B CANNOT change own status from active to inactive',
    !engine.canUpdateUser(teacherB, 'teacher-b-uid', engine.getDoc('users/teacher-b-uid'), {
      ...engine.getDoc('users/teacher-b-uid'),
      status: 'inactive'
    })
  );
  assert(
    'Admin CAN update any user role, status, or fields',
    engine.canUpdateUser(admin, 'teacher-b-uid', engine.getDoc('users/teacher-b-uid'), {
      ...engine.getDoc('users/teacher-b-uid'),
      role: 'admin',
      status: 'inactive'
    })
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 3: PUBLIC COMMENTS PRIVACY & MODERATION
  // -----------------------------------------------------------------------
  console.log('\n--- 3. PUBLIC COMMENTS PRIVACY & MODERATION TESTS ---');
  assert(
    'Public visitor CAN read approved clean comment',
    engine.canReadComment(unauthenticated, 'comment-approved-clean')
  );
  assert(
    'Public visitor CANNOT read approved comment that contains private email',
    !engine.canReadComment(unauthenticated, 'comment-approved-with-email'),
    'Commenter email is shielded from public reads'
  );
  assert(
    'Public visitor CANNOT read pending comment',
    !engine.canReadComment(unauthenticated, 'comment-pending')
  );
  assert(
    'Public visitor CANNOT read rejected comment',
    !engine.canReadComment(unauthenticated, 'comment-rejected')
  );
  assert(
    'Admin CAN read approved comment with email',
    engine.canReadComment(admin, 'comment-approved-with-email')
  );
  assert(
    'Admin CAN read pending comment for moderation',
    engine.canReadComment(admin, 'comment-pending')
  );
  assert(
    'Admin CAN read rejected comment',
    engine.canReadComment(admin, 'comment-rejected')
  );
  assert(
    'Public visitor CAN create valid comment with status pending',
    engine.canCreateComment(unauthenticated, 'comment-new', {
      name: 'Alice Mukamana',
      content: 'Very clear explanation, thank you.',
      postId: 'post-1',
      status: 'pending'
    })
  );
  assert(
    'Public visitor CANNOT submit comment with private email field (forbidden by schema)',
    !engine.canCreateComment(unauthenticated, 'comment-with-email', {
      name: 'Alice',
      content: 'Here is my email',
      postId: 'post-1',
      email: 'alice@example.com'
    }),
    'Email field disallowed on public comment creation'
  );
  assert(
    'Public visitor CANNOT submit comment with status "approved" (bypassing moderation)',
    !engine.canCreateComment(unauthenticated, 'comment-bypass', {
      name: 'Alice',
      content: 'Self-approved comment',
      postId: 'post-1',
      status: 'approved'
    })
  );
  assert(
    'Public visitor CANNOT update existing comment',
    !engine.canUpdateComment(unauthenticated, 'comment-approved-clean')
  );
  assert(
    'Public visitor CANNOT delete existing comment',
    !engine.canDeleteComment(unauthenticated, 'comment-approved-clean')
  );
  assert(
    'Admin CAN update/moderate existing comment',
    engine.canUpdateComment(admin, 'comment-pending')
  );
  assert(
    'Admin CAN delete any comment',
    engine.canDeleteComment(admin, 'comment-rejected')
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 4: POST VIEW COUNTER INCREMENT (+1 ONLY) & REPEATED CALLS
  // -----------------------------------------------------------------------
  console.log('\n--- 4. POST VIEW-COUNTER INCREMENT & REPETITION TESTS ---');
  let currentViews = 42;
  const initialPost = engine.getDoc('posts/post-1')!;

  assert(
    'Visitor single call CAN increment views from 42 to 43 (+1 exact)',
    engine.canUpdatePost(unauthenticated, 'post-1', initialPost, {
      ...initialPost,
      views: 43
    })
  );
  assert(
    'Visitor CAN initialize views from undefined to 1',
    engine.canUpdatePost(unauthenticated, 'post-2', engine.getDoc('posts/post-2')!, {
      ...engine.getDoc('posts/post-2')!,
      views: 1
    })
  );
  assert(
    'Visitor single call CANNOT inflate views from 42 to 44 (+2 in one request)',
    !engine.canUpdatePost(unauthenticated, 'post-1', initialPost, {
      ...initialPost,
      views: 44
    })
  );
  assert(
    'Visitor single call CANNOT inflate views from 42 to 5000',
    !engine.canUpdatePost(unauthenticated, 'post-1', initialPost, {
      ...initialPost,
      views: 5000
    })
  );
  assert(
    'Visitor CANNOT decrement views from 42 to 41',
    !engine.canUpdatePost(unauthenticated, 'post-1', initialPost, {
      ...initialPost,
      views: 41
    })
  );
  assert(
    'Visitor CANNOT modify title along with views',
    !engine.canUpdatePost(unauthenticated, 'post-1', initialPost, {
      ...initialPost,
      title: 'Hacked Title',
      views: 43
    })
  );

  // Demonstrate repeated sequential +1 requests:
  // Each individual request satisfies rules because each one is valid (+1).
  // This verifies why rules cannot stop bot loops without client-side or server rate-limiting.
  let simulatedDoc = { ...initialPost };
  let sequenceSuccess = true;
  for (let step = 1; step <= 5; step++) {
    const nextDoc = { ...simulatedDoc, views: simulatedDoc.views + 1 };
    const allowed = engine.canUpdatePost(unauthenticated, 'post-1', simulatedDoc, nextDoc);
    if (!allowed) {
      sequenceSuccess = false;
      break;
    }
    simulatedDoc = nextDoc;
  }
  assert(
    'Stateless rules evaluate each +1 individually; repeated sequential requests pass rules individually',
    sequenceSuccess,
    'Confirms rules enforce data delta (+1) but require client-side throttling to stop bot loops'
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 5: LEGACY GENERAL SCHOOL SETTINGS
  // -----------------------------------------------------------------------
  console.log('\n--- 5. LEGACY GENERAL SCHOOL SETTINGS TESTS ---');
  assert('Admin CAN read legacy general school settings without ownerUid', engine.canReadSchoolSettings(admin, 'general'));
  assert(
    'Admin CAN update legacy general school settings without ownerUid',
    engine.canUpdateSchoolSettings(admin, 'general', engine.getDoc('nursery_school_settings/general'), {
      schoolName: 'ISEZERANO Academy Updated Legacy Main',
      district: 'Gasabo'
    })
  );
  assert('Teacher A CANNOT read legacy general school settings', !engine.canReadSchoolSettings(teacherA, 'general'));
  assert('Teacher B CANNOT read legacy general school settings', !engine.canReadSchoolSettings(teacherB, 'general'));
  assert(
    'Teacher A CANNOT update legacy general school settings',
    !engine.canUpdateSchoolSettings(teacherA, 'general', engine.getDoc('nursery_school_settings/general'), {
      schoolName: 'Hacked school name'
    })
  );
  assert(
    'Teacher A CANNOT delete legacy general school settings',
    !engine.canDeleteSchoolSettings(teacherA, 'general')
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 6: PER-TEACHER SCHOOL SETTINGS
  // -----------------------------------------------------------------------
  console.log('\n--- 6. PER-TEACHER SCHOOL SETTINGS TESTS ---');
  assert('Teacher B CAN read own school settings', engine.canReadSchoolSettings(teacherB, 'teacher-b-uid'));
  assert('Teacher A CANNOT read Teacher B school settings', !engine.canReadSchoolSettings(teacherA, 'teacher-b-uid'));
  assert('Admin CAN read Teacher B school settings', engine.canReadSchoolSettings(admin, 'teacher-b-uid'));
  assert('Admin CAN read Teacher A school settings', engine.canReadSchoolSettings(admin, 'teacher-a-uid'));
  assert(
    'Teacher B CANNOT change ownerUid on school settings',
    !engine.canUpdateSchoolSettings(
      teacherB,
      'teacher-b-uid',
      engine.getDoc('nursery_school_settings/teacher-b-uid'),
      { ownerUid: 'teacher-a-uid', schoolName: 'Hijacked' }
    )
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 7: LESSON PLAN AUTHORITATIVE OWNERSHIP & CONFLICT RESOLUTION
  // -----------------------------------------------------------------------
  console.log('\n--- 7. LESSON PLAN AUTHORITATIVE OWNERSHIP TESTS ---');
  assert('Teacher B CAN read own clean lesson plan', engine.canReadLessonPlan(teacherB, 'plan-b-1'));
  assert('Teacher A CANNOT read Teacher B clean lesson plan', !engine.canReadLessonPlan(teacherA, 'plan-b-1'));
  assert('Admin CAN read Teacher B clean lesson plan', engine.canReadLessonPlan(admin, 'plan-b-1'));
  assert(
    'Teacher A CANNOT read conflicting lesson plan (ownerUid=A, userId=B)',
    !engine.canReadLessonPlan(teacherA, 'plan-conflicting')
  );
  assert(
    'Teacher B CANNOT read conflicting lesson plan (ownerUid=A, userId=B)',
    !engine.canReadLessonPlan(teacherB, 'plan-conflicting')
  );
  assert(
    'Admin CAN read conflicting lesson plan for oversight/recovery',
    engine.canReadLessonPlan(admin, 'plan-conflicting')
  );
  assert(
    'Teacher A CANNOT read legacy ownerless lesson plan',
    !engine.canReadLessonPlan(teacherA, 'plan-ownerless')
  );
  assert(
    'Admin CAN read legacy ownerless lesson plan',
    engine.canReadLessonPlan(admin, 'plan-ownerless')
  );
  assert(
    'Teacher A CANNOT create lesson plan with conflicting userId',
    !engine.canCreateLessonPlan(teacherA, 'plan-new', {
      title: 'New Plan',
      ownerUid: 'teacher-a-uid',
      userId: 'teacher-b-uid'
    })
  );
  assert(
    'Teacher A CAN create lesson plan with matching ownerUid and userId',
    engine.canCreateLessonPlan(teacherA, 'plan-new', {
      title: 'New Plan',
      ownerUid: 'teacher-a-uid',
      userId: 'teacher-a-uid'
    })
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 8: NURSERY STUDENTS ISOLATION & VALIDATION
  // -----------------------------------------------------------------------
  console.log('\n--- 8. NURSERY STUDENTS ISOLATION TESTS ---');
  assert('Teacher B CAN read own student Keza Marie', engine.canReadNurseryStudent(teacherB, 'student-b-1'));
  assert('Teacher A CANNOT read Teacher B student', !engine.canReadNurseryStudent(teacherA, 'student-b-1'));
  assert('Admin CAN read Teacher B student', engine.canReadNurseryStudent(admin, 'student-b-1'));
  assert('Teacher A CANNOT delete Teacher B student', !engine.canDeleteNurseryStudent(teacherA, 'student-b-1'));
  assert('Teacher B CAN delete own student', engine.canDeleteNurseryStudent(teacherB, 'student-b-1'));

  // Gender validation
  assert(
    'Valid gender Boy accepted',
    engine.canCreateNurseryStudent(teacherA, 'student-new-1', {
      fullName: 'Manzi David',
      classGrade: 'N1',
      gender: 'Boy',
      ownerUid: 'teacher-a-uid'
    })
  );
  assert(
    'Valid gender Gore accepted',
    engine.canCreateNurseryStudent(teacherA, 'student-new-2', {
      fullName: 'Uwase Aline',
      classGrade: 'N1',
      gender: 'Gore',
      ownerUid: 'teacher-a-uid'
    })
  );
  assert(
    'Invalid gender Alien REJECTED',
    !engine.canCreateNurseryStudent(teacherA, 'student-invalid', {
      fullName: 'Manzi David',
      classGrade: 'N1',
      gender: 'Alien',
      ownerUid: 'teacher-a-uid'
    })
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 9: NURSERY ASSESSMENTS ISOLATION & STUDENT ATTACHMENT
  // -----------------------------------------------------------------------
  console.log('\n--- 9. NURSERY ASSESSMENTS ISOLATION TESTS ---');
  assert('Teacher B CAN read own assessment', engine.canReadNurseryAssessment(teacherB, 'assessment_student-b-1'));
  assert('Teacher A CANNOT read Teacher B assessment', !engine.canReadNurseryAssessment(teacherA, 'assessment_student-b-1'));
  assert('Admin CAN read Teacher B assessment', engine.canReadNurseryAssessment(admin, 'assessment_student-b-1'));

  assert(
    'Teacher A CANNOT attach assessment to Teacher B student',
    !engine.canCreateNurseryAssessment(teacherA, 'new-assessment-x', {
      studentId: 'student-b-1',
      ownerUid: 'teacher-a-uid',
      term1Scores: { c1: 'EE' }
    })
  );

  assert(
    'Teacher A CAN attach assessment to own student',
    engine.canCreateNurseryAssessment(teacherA, 'new-assessment-a', {
      studentId: 'student-a-1',
      ownerUid: 'teacher-a-uid',
      term1Scores: { c1: 'EE' }
    })
  );

  // -----------------------------------------------------------------------
  // TEST SUITE 10: AUTHENTICATION PROVIDER GUARDS
  // -----------------------------------------------------------------------
  console.log('\n--- 10. AUTH PROVIDER SECURITY TESTS ---');
  assert('Anonymous user CANNOT read Teacher B student', !engine.canReadNurseryStudent(anonymousUser, 'student-b-1'));
  assert('Unauthenticated visitor CANNOT read Teacher B student', !engine.canReadNurseryStudent(unauthenticated, 'student-b-1'));
  assert('Anonymous user CANNOT read Teacher B assessment', !engine.canReadNurseryAssessment(anonymousUser, 'assessment_student-b-1'));
  assert('Unauthenticated visitor CANNOT read Teacher B school settings', !engine.canReadSchoolSettings(unauthenticated, 'teacher-b-uid'));

  // Summary
  console.log('===========================================================');
  console.log(`AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    throw new Error(`Security rules audit failed with ${failed} failed tests!`);
  }
}

// Execute tests
runSecurityAuditTests();
