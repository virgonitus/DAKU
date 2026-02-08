import { supabase } from './supabase';
import { User, Report, ReportData, Branch, Area, ReportType, ReportStage, ReportStatus } from '../types';

const DB_NAME = 'FieldReportDB_V4';
const DB_VERSION = 5;
const STORE_DRAFTS = 'drafts';

// --- INDEXEDDB HELPERS (ONLY FOR DRAFTS) ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_DRAFTS)) {
        database.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
      }
      // Clean up old stores if they exist? Maybe keep them for backup?
      // For now, valid to leave them or ignore them.
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

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

// --- USER SERVICES (Now via Supabase) ---
export const db = {
  // Login is handled by authService (Supabase Auth)
  // But we kept this method signature in legacy code? 
  // App.tsx uses authService now. 
  // We can remove logic or keep dummy?
  // Let's keep it but it shouldn't be used.
  login: async (username: string, password: string): Promise<User | null> => {
    console.warn("db.login is deprecated. Use authService.signIn instead.");
    return null;
  },

  getUsers: async (): Promise<User[]> => {
    const { data: usersData, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error("Fetch users error:", error);
      return [];
    }
    return usersData.map((p: any) => ({
      id: p.id,
      name: p.full_name,
      role: p.role,
      branchCode: p.branch_code,
      areaCode: p.area_code,
      username: p.username
    }));
  },

  // NEW: Fetch AKs by Area
  getAdminsByArea: async (areaCode: string): Promise<User[]> => {
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'AK')
      .eq('area_code', areaCode);

    return (usersData || []).map((p: any) => ({
      id: p.id,
      name: p.full_name,
      role: p.role,
      branchCode: p.branch_code,
      areaCode: p.area_code,
      username: p.username
    }));
  },

  createUser: async (user: User) => {
    // Handled by UserManagement
  },

  updateUser: async (user: User) => {
    // Handled by UserManagement
  },

  // --- MASTER DATA SERVICES ---

  getBranches: async (): Promise<string[]> => {
    const { data } = await supabase.from('branches').select('code').order('code');
    return (data || []).map(b => b.code);
  },

  addBranch: async (code: string) => {
    await supabase.from('branches').insert({ code });
  },

  deleteBranch: async (code: string) => {
    await supabase.from('branches').delete().eq('code', code);
  },

  getAreas: async (): Promise<string[]> => {
    const { data } = await supabase.from('areas').select('code').order('code');
    return (data || []).map(a => a.code);
  },

  addArea: async (code: string) => {
    await supabase.from('areas').insert({ code });
  },

  deleteArea: async (code: string) => {
    await supabase.from('areas').delete().eq('code', code);
  },

  // --- REPORT SERVICES ---

  getReports: async (user: User): Promise<Report[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select('*, profiles:user_id(full_name, username)')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      aoId: r.user_id,
      aoName: r.profiles?.full_name || r.profiles?.username || 'Unknown',
      branch: r.branch_code,
      areaCode: r.area_code,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      status: r.status as ReportStatus,
      reportType: r.type as ReportType,
      currentStage: r.stage as ReportStage,
      assignedToId: r.data?.assignedToId,
      assignedToName: r.data?.assignedToName,
      correctionNotes: r.data?.correctionNotes,
      data: r.data,
      isRevision: r.is_revision,
      viewedByAK: r.data?.viewedByAK || false
    }));
  },

  createReport: async (user: User, data: ReportData, reportType: ReportType = 'KC', assignedTo?: { id: string, name: string }): Promise<Report> => {
    const dbData = {
      ...data,
      assignedToId: assignedTo?.id,
      assignedToName: assignedTo?.name,
    };

    const { data: inserted, error } = await supabase.from('reports').insert({
      user_id: user.id,
      branch_code: user.branchCode,
      area_code: user.areaCode,
      type: reportType,
      status: assignedTo ? 'SUBMITTED' : 'DRAFT',
      stage: 'AK',
      data: dbData,
      is_revision: false
    }).select().single();

    if (error) throw error;

    return {
      id: inserted.id,
      aoId: inserted.user_id,
      aoName: user.name,
      branch: inserted.branch_code,
      areaCode: inserted.area_code,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
      status: inserted.status as ReportStatus,
      reportType: inserted.type,
      currentStage: inserted.stage,
      assignedToId: assignedTo?.id,
      assignedToName: assignedTo?.name,
      data: inserted.data,
      isRevision: inserted.is_revision,
      viewedByAK: false
    };
  },

  updateReportData: async (reportId: string, data: ReportData, status?: ReportStatus): Promise<void> => {
    const updates: any = {
      data: data,
      updated_at: new Date().toISOString()
    };

    if (status) {
      updates.status = status;
      if (status === 'SUBMITTED') {
        updates.is_revision = true;
      }
    } else {
      updates.status = 'SUBMITTED';
    }

    await supabase.from('reports').update(updates).eq('id', reportId);
  },

  processReport: async (reportId: string, status: 'APPROVED' | 'RETURNED', notes?: string, nextStage?: ReportStage): Promise<void> => {
    const updates: any = {
      status: status,
      updated_at: new Date().toISOString()
    };
    if (nextStage) updates.stage = nextStage;

    // Notes usually go into data or separate column? 
    // Supabase report table does not have 'correction_notes'.
    // We must fetch current data to merge notes?
    // Or we should update schema to have 'correction_notes'.
    // Optimally, we fetch current data, update notes, save back.
    // Or just create a column. 
    // BUT for now, let's update data jsonb.

    const { data: current } = await supabase.from('reports').select('data').eq('id', reportId).single();
    if (current) {
      const newData = { ...current.data };
      if (notes) newData.correctionNotes = notes;
      if (status === 'RETURNED') newData.viewedByAK = false;

      updates.data = newData;
    }

    await supabase.from('reports').update(updates).eq('id', reportId);
  },

  deleteReport: async (reportId: string): Promise<void> => {
    await supabase.from('reports').delete().eq('id', reportId);
  },

  cancelSubmission: async (reportId: string): Promise<void> => {
    await supabase.from('reports').update({ status: 'DRAFT', updated_at: new Date().toISOString() }).eq('id', reportId);
  },

  markAsViewedByAK: async (reportId: string): Promise<void> => {
    const { data: current } = await supabase.from('reports').select('data').eq('id', reportId).single();
    if (current) {
      const newData = { ...current.data, viewedByAK: true };
      await supabase.from('reports').update({ data: newData, is_revision: false }).eq('id', reportId);
    }
  },

  // TEST UTILITY: Clear all reports
  clearAllReports: async (): Promise<void> => {
    // Admin only?
  },

  // Delete a user by ID
  deleteUser: async (userId: string): Promise<void> => {
    // Handled by UserManagement
  },

  // --- DRAFT SERVICES (AUTOSAVE) ---
  // Uses IndexedDB (primary) and localStorage (backup) for reliability.
  // Drafts are NOT synced to Supabase until "Saved" as Report.
  saveDraft: async (userId: string, data: ReportData): Promise<void> => {
    const key = `draft_${userId}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[AUTOSAVE] localStorage backup failed (likely size limit):', e);
    }
    await putItem(STORE_DRAFTS, { id: key, data, timestamp: Date.now() });
  },

  getDraft: async (userId: string): Promise<ReportData | null> => {
    const key = `draft_${userId}`;
    const draft = await getOne<{ id: string, data: ReportData, timestamp: number }>(STORE_DRAFTS, key);
    if (draft) return draft.data;

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
