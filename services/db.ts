
import { User, Report, ReportData, Branch, Area, ReportType, ReportStage, ReportStatus } from '../types';
import { INITIAL_USERS, INITIAL_BRANCHES, INITIAL_AREAS } from './initialData';

const DB_NAME = 'FieldReportDB_V4';
const DB_VERSION = 5; // Upgraded to 5 for Drafts
const STORE_USERS = 'users';
const STORE_REPORTS = 'reports';
const STORE_BRANCHES = 'branches';
const STORE_AREAS = 'areas';
const STORE_DRAFTS = 'drafts'; // New Store
const SEED_FLAG_KEY = 'FIELD_REPORT_DB_SEEDED_V4';

// --- INDEXEDDB HELPERS ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_USERS)) {
        database.createObjectStore(STORE_USERS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_REPORTS)) {
        database.createObjectStore(STORE_REPORTS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_BRANCHES)) {
        database.createObjectStore(STORE_BRANCHES, { keyPath: 'code' });
      }
      if (!database.objectStoreNames.contains(STORE_AREAS)) {
        database.createObjectStore(STORE_AREAS, { keyPath: 'code' });
      }
      // New Drafts Store
      if (!database.objectStoreNames.contains(STORE_DRAFTS)) {
        database.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const getOne = async <T>(storeName: string, key: string): Promise<T | undefined> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const putItem = async (storeName: string, item: any): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

const deleteItem = async (storeName: string, key: string): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Improved Seeding Logic
const seedData = async () => {
  const isSeeded = localStorage.getItem(SEED_FLAG_KEY);
  if (isSeeded) return;

  try {
    // Seed Users
    const users = await getAll<User>(STORE_USERS);
    if (users.length === 0) {
      for (const user of INITIAL_USERS) {
        await putItem(STORE_USERS, user);
      }
    }

    // Seed Branches
    const branches = await getAll<Branch>(STORE_BRANCHES);
    if (branches.length === 0) {
      for (const code of INITIAL_BRANCHES) {
        await putItem(STORE_BRANCHES, { code });
      }
    }

    // Seed Areas
    const areas = await getAll<Area>(STORE_AREAS);
    if (areas.length === 0) {
      for (const code of INITIAL_AREAS) {
        await putItem(STORE_AREAS, { code });
      }
    }

    localStorage.setItem(SEED_FLAG_KEY, 'true');
  } catch (e) {
    console.error("Error seeding data:", e);
  }
}

// REMOVED ARTIFICIAL DELAYS FOR PERFORMANCE

// --- USER SERVICES ---
export const db = {
  // Login with Password Validation
  login: async (username: string, password: string): Promise<User | null> => {
    await seedData();
    const users = await getAll<User>(STORE_USERS);
    const foundUser = users.find((u) => u.username === username && u.password === password);
    return foundUser || null;
  },

  getUsers: async (): Promise<User[]> => {
    await seedData();
    return getAll<User>(STORE_USERS);
  },

  // NEW: Fetch AKs by Area
  getAdminsByArea: async (areaCode: string): Promise<User[]> => {
    await seedData();
    const users = await getAll<User>(STORE_USERS);
    return users.filter(u => u.role === 'AK' && u.areaCode === areaCode);
  },

  createUser: async (user: User) => {
    await putItem(STORE_USERS, user);
  },

  updateUser: async (user: User) => {
    await putItem(STORE_USERS, user);
  },

  // --- MASTER DATA SERVICES ---

  getBranches: async (): Promise<string[]> => {
    await seedData();
    const res = await getAll<Branch>(STORE_BRANCHES);
    return res.map(b => b.code);
  },

  addBranch: async (code: string) => {
    await putItem(STORE_BRANCHES, { code });
  },

  deleteBranch: async (code: string) => {
    await deleteItem(STORE_BRANCHES, code);
  },

  getAreas: async (): Promise<string[]> => {
    await seedData();
    const res = await getAll<Area>(STORE_AREAS);
    return res.map(a => a.code);
  },

  addArea: async (code: string) => {
    await putItem(STORE_AREAS, { code });
  },

  deleteArea: async (code: string) => {
    await deleteItem(STORE_AREAS, code);
  },

  // --- REPORT SERVICES ---

  getReports: async (user: User): Promise<Report[]> => {
    const reports = await getAll<Report>(STORE_REPORTS);

    // Add default reportType for old records compatibility
    const reportsWithDefaults = reports.map(r => ({ ...r, reportType: r.reportType || 'KC' }));

    if (user.role === 'ADMIN' || user.role === 'GM' || user.role === 'IT_SUPPORT') {
      return reportsWithDefaults;
    } else {
      // For AM, AK, AO: Return ALL reports that are NOT DRAFT (for Ranking) 
      // AND also include their own DRAFTS if applicable.
      // Privacy for the Table will be handled in frontend filters.

      const allApproved = reportsWithDefaults.filter(r => r.status !== 'DRAFT');

      // AKA Filter: ReportType AREA/KP and (Stage is AKA, AKP or APPROVED)
      // They should see reports that have been forwarded to them or past them.
      if (user.role === 'AKA') {
        return allApproved.filter(r =>
          (r.reportType === 'AREA' || r.reportType === 'KP') &&
          r.areaCode === user.areaCode &&
          (r.currentStage === 'AKA' || r.currentStage === 'AKP' || r.status === 'APPROVED')
        );
      }

      // AKP Filter: ReportType AREA/KP and (Stage is AKP or APPROVED)
      if (user.role === 'AKP') {
        return allApproved.filter(r =>
          (r.reportType === 'AREA' || r.reportType === 'KP') &&
          (r.currentStage === 'AKP' || r.status === 'APPROVED')
        );
      }

      // If user is AO, add their DRAFTS
      if (user.role === 'AO') {
        const myDrafts = reportsWithDefaults.filter(r => r.aoId === user.id && r.status === 'DRAFT');
        return [...allApproved, ...myDrafts];
      }

      return allApproved;
    }
  },

  createReport: async (user: User, data: ReportData, reportType: ReportType = 'KC', assignedTo?: { id: string, name: string }): Promise<Report> => {

    const newReport: Report = {
      id: Date.now().toString(),
      aoId: user.id,
      aoName: user.name,
      branch: user.branchCode,
      areaCode: user.areaCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: assignedTo ? 'SUBMITTED' : 'DRAFT', // Fix: If no assignee (Simpan Dulu), default to DRAFT
      reportType: reportType,
      currentStage: 'AK', // Default stage
      assignedToId: assignedTo?.id,
      assignedToName: assignedTo?.name,
      data: data
    };

    await putItem(STORE_REPORTS, newReport);
    return newReport;
  },

  updateReportData: async (reportId: string, data: ReportData, status?: ReportStatus): Promise<void> => {
    const report = await getOne<Report>(STORE_REPORTS, reportId);
    if (report) {
      report.data = data;
      // If status provided, use it. Else default to SUBMITTED (legacy behavior)
      if (status) {
        report.status = status;
      } else {
        report.status = 'SUBMITTED';
      }
      // If resubmitting (status SUBMITTED), mark as revision and reset viewedByAK
      if (report.status === 'SUBMITTED') {
        report.isRevision = true;
        report.viewedByAK = false;
      }
      report.updatedAt = new Date().toISOString();
      await putItem(STORE_REPORTS, report);
    }
  },

  processReport: async (reportId: string, status: 'APPROVED' | 'RETURNED', notes?: string, nextStage?: ReportStage): Promise<void> => {
    const report = await getOne<Report>(STORE_REPORTS, reportId);
    if (report) {
      report.status = status;
      if (notes) report.correctionNotes = notes;
      if (nextStage) report.currentStage = nextStage;
      // Reset viewedByAK when returning to AO so the cycle restarts
      if (status === 'RETURNED') {
        report.viewedByAK = false;
      }
      report.updatedAt = new Date().toISOString();
      await putItem(STORE_REPORTS, report);
    }
  },

  deleteReport: async (reportId: string): Promise<void> => {
    await deleteItem(STORE_REPORTS, reportId);
  },

  cancelSubmission: async (reportId: string): Promise<void> => {
    const report = await getOne<Report>(STORE_REPORTS, reportId);
    // Only allow cancel if SUBMITTED and NOT viewed by AK
    if (report && report.status === 'SUBMITTED' && !report.viewedByAK) {
      report.status = 'DRAFT';
      report.updatedAt = new Date().toISOString();
      await putItem(STORE_REPORTS, report);
    }
  },

  markAsViewedByAK: async (reportId: string): Promise<void> => {
    const report = await getOne<Report>(STORE_REPORTS, reportId);
    if (report && report.status === 'SUBMITTED' && !report.viewedByAK) {
      report.viewedByAK = true;
      report.isRevision = false; // Clear revision flag once AK views it
      await putItem(STORE_REPORTS, report);
    }
  },

  // TEST UTILITY: Clear all reports
  clearAllReports: async (): Promise<void> => {
    const database = await openDB();
    const tx = database.transaction(STORE_REPORTS, 'readwrite');
    const store = tx.objectStore(STORE_REPORTS);
    const req = store.clear();
    req.onsuccess = () => {

    };
    req.onerror = (event) => console.error('Error clearing reports:', (event.target as IDBRequest).error);
  },

  // Delete a user by ID
  deleteUser: async (userId: string): Promise<void> => {
    await deleteItem(STORE_USERS, userId);
  },

  // --- DRAFT SERVICES (AUTOSAVE) ---
  // Uses both IndexedDB (primary) and localStorage (backup) for reliability
  // Drafts are now USER-SPECIFIC to prevent data leakage between users
  saveDraft: async (userId: string, data: ReportData): Promise<void> => {
    const key = `draft_${userId}`;


    // BACKUP: Also save to localStorage for instant recovery
    try {
      localStorage.setItem(key, JSON.stringify(data));

    } catch (e) {
      console.warn('[AUTOSAVE] localStorage backup failed (likely size limit):', e);
    }

    await putItem(STORE_DRAFTS, { id: key, data, timestamp: Date.now() });

  },

  getDraft: async (userId: string): Promise<ReportData | null> => {
    const key = `draft_${userId}`;


    // First try IndexedDB (primary)
    const draft = await getOne<{ id: string, data: ReportData, timestamp: number }>(STORE_DRAFTS, key);
    if (draft) {

      return draft.data;
    }

    // Fallback: Try localStorage backup
    const localBackup = localStorage.getItem(key);
    if (localBackup) {

      try {
        return JSON.parse(localBackup) as ReportData;
      } catch (e) {
        console.error('[AUTOSAVE] Failed to parse localStorage backup:', e);
      }
    }


    return null;
  },

  clearDraft: async (userId: string): Promise<void> => {
    const key = `draft_${userId}`;

    localStorage.removeItem(key);
    await deleteItem(STORE_DRAFTS, key);
  },
};
