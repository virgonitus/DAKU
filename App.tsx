
import React, { useState, useEffect, useRef } from 'react';
import { db } from './services/db';
import { User, Report, ReportData, initialData, ReportType, ReportStage } from './types';
import ReportForm from './components/ReportForm';
import UserManagement from './components/UserManagement';
import AreaRankingSidebar from './components/AreaRankingSidebar';
import FloatingSearchPopup from './components/FloatingSearchPopup';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LogOut, LayoutDashboard, FileText, CheckCircle, XCircle, RefreshCw, Download, Save, AlertCircle, Users, Lock, User as UserIcon, Building2, Edit, Trash2 } from 'lucide-react';
import { useModal } from './context/ModalContext';
import cupsLogo from './src/assets/logodoku.png';
import EmbedPDF from '@embedpdf/snippet';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD' | 'CREATE' | 'EDIT' | 'REVIEW' | 'USER_MGMT'>('LOGIN');
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true); // New: Session check state
  const { showModal, closeModal } = useModal();


  // Load user from sessionStorage on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('session_user');
    const savedView = sessionStorage.getItem('session_view');

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Restore view if saved
        if (savedView && (savedView === 'DASHBOARD' || savedView === 'CREATE' || savedView === 'EDIT' || savedView === 'REVIEW' || savedView === 'USER_MGMT')) {
          setView(savedView as any);
        } else {
          setView('DASHBOARD');
        }
      } catch (e) {
        console.error('Failed to restore session', e);
        sessionStorage.removeItem('session_user');
        sessionStorage.removeItem('session_view');
      }
    }

    // Add a small delay to ensure smooth transition and prevent flash
    setTimeout(() => {
      setIsCheckingSession(false);
    }, 800);
  }, []); // Run once on mount

  // Save view to sessionStorage whenever it changes
  useEffect(() => {
    if (user && view) {
      sessionStorage.setItem('session_view', view);
    }
  }, [view, user]);

  // ... existing code ...
  // Track report type for creation
  const [activeReportType, setActiveReportType] = useState<ReportType>(() => {
    const savedType = sessionStorage.getItem('session_activeReportType');
    return (savedType as ReportType) || 'KC';
  });

  // Save activeReportType whenever it changes
  useEffect(() => {
    sessionStorage.setItem('session_activeReportType', activeReportType);
  }, [activeReportType]);

  // Login Form States
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Correction Note State for Admin Kredit
  const [correctionNote, setCorrectionNote] = useState('');

  // Filter State
  const [filterDate, setFilterDate] = useState('');

  // GM Specific Filters
  const [gmSearch, setGmSearch] = useState('');
  const [gmAreaFilter, setGmAreaFilter] = useState('ALL');

  // IT Support Specific Filters
  const [itSearchId, setItSearchId] = useState('');

  // AM Specific Filters
  const [amBranchFilter, setAmBranchFilter] = useState('ALL');
  const [amUserSearch, setAmUserSearch] = useState('');
  const [amTypeFilter, setAmTypeFilter] = useState('ALL');
  const [amStatusFilter, setAmStatusFilter] = useState('ALL');

  // Admin Dashboard Filter
  const [adminAreaFilter, setAdminAreaFilter] = useState('ALL');

  // AK Dashboard Tab (Semua / Revisi Terbaru)
  const [akViewTab, setAkViewTab] = useState<'ALL' | 'REVISIONS'>('ALL');

  // EmbedPDF State
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfViewerRef = React.useRef<HTMLDivElement>(null);

  // PDF Export Function (Smart Paging) -> Now Opens EmbedPDF
  const handleExportPDF = async (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    setLoading(true);

    try {
      // Find all page elements rendered by PDFPreview
      const pageElements = ref.current.querySelectorAll('.pdf-page');
      if (pageElements.length === 0) {
        showModal({ title: 'Gagal Export', message: 'Tidak ada halaman yang ditemukan untuk diexport.', type: 'error' });
        setLoading(false);
        return;
      }

      // Initialize PDF (A4 Portrait, mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;

      // Iterate through each visual page and capture it
      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pageElements[i] as HTMLElement, {
          scale: 2, // High quality
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Add image to PDF filling the entire page
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      // Generate Blob URL instead of saving
      const pdfBlob = pdf.output('blob');

      // Cleanup previous blob URL to prevent memory leaks
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowPdfViewer(true);

    } catch (e) {
      console.error(e);
      showModal({ title: 'Gagal Export', message: 'Terjadi kesalahan saat generate PDF. Silakan coba lagi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const refreshReports = async () => {
    if (!user) return;
    setLoading(true);
    const data = await db.getReports(user);
    setReports(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setLoading(false);
  };

  useEffect(() => {
    if (user && view === 'DASHBOARD') {
      refreshReports();
    }
  }, [user, view]);

  // Cleanup Blob URL on unmount or when url changes
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Auto-refresh dashboard every 10 seconds
  useEffect(() => {
    if (!user || view !== 'DASHBOARD') return;

    const intervalId = setInterval(() => {
      // Silent refresh without loading indicator
      db.getReports(user).then(data => {
        setReports(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      });
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [user, view]);

  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardBranchFilter, setDashboardBranchFilter] = useState('ALL');
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState('ALL');

  // Filtered Reports
  const filteredReports = reports.filter(report => {
    // 0. Global Dashboard Search (Name/AO) & Branch Filter & Type Filter
    // Applied to ADMIN, AK, AKA, AKP, AO as requested
    if (['ADMIN', 'AK', 'AKA', 'AKP', 'AO'].includes(user?.role || '')) {
      // Name Search
      if (dashboardSearch) {
        const searchLower = dashboardSearch.toLowerCase();
        const matchName = report.aoName.toLowerCase().includes(searchLower) ||
          (report.assignedToName && report.assignedToName.toLowerCase().includes(searchLower)) ||
          (report.data.memberName && report.data.memberName.toLowerCase().includes(searchLower)) ||
          (report.branch && report.branch.toLowerCase().includes(searchLower));
        if (!matchName) return false;
      }
      // Branch Filter
      if (dashboardBranchFilter !== 'ALL') {
        if (report.branch !== dashboardBranchFilter) return false;
      }
      // Type Filter
      if (dashboardTypeFilter !== 'ALL') {
        if (report.reportType !== dashboardTypeFilter) return false;
      }
    }

    // 1. Date Filter
    if (filterDate) {
      const reportDate = new Date(report.updatedAt).toISOString().split('T')[0];
      if (reportDate !== filterDate) return false;
    }

    // 2. GM Search Filter (Name)
    if (user?.role === 'GM' && gmSearch) {
      const searchLower = gmSearch.toLowerCase();
      const matchName = report.aoName.toLowerCase().includes(searchLower) ||
        (report.assignedToName && report.assignedToName.toLowerCase().includes(searchLower)) ||
        (report.data.memberName && report.data.memberName.toLowerCase().includes(searchLower));
      if (!matchName) return false;
    }

    // 3. GM Area Filter
    if ((user?.role === 'GM' || user?.role === 'IT_SUPPORT') && gmAreaFilter !== 'ALL') {
      if (report.areaCode !== gmAreaFilter) return false;
    }

    // 4. IT Support ID Filter
    if (user?.role === 'IT_SUPPORT' && itSearchId) {
      if (!report.id.toLowerCase().includes(itSearchId.toLowerCase())) return false;
    }

    // 5. AM Branch Filter
    if (user?.role === 'AM' && amBranchFilter !== 'ALL') {
      if (report.branch !== amBranchFilter) return false;
    }

    // 6. AM User Search Filter
    if (user?.role === 'AM' && amUserSearch) {
      const searchLower = amUserSearch.toLowerCase();
      const matchName = report.aoName.toLowerCase().includes(searchLower) ||
        (report.assignedToName && report.assignedToName.toLowerCase().includes(searchLower)) ||
        (report.data.memberName && report.data.memberName.toLowerCase().includes(searchLower));
      if (!matchName) return false;
    }

    // 7. Admin Area Filter
    if (user?.role === 'ADMIN' && adminAreaFilter !== 'ALL') {
      if (report.areaCode !== adminAreaFilter) return false;
    }

    // 8. AM Type Filter
    if (user?.role === 'AM' && amTypeFilter !== 'ALL') {
      if (report.reportType !== amTypeFilter) return false;
    }

    // 9. AM Status Filter
    if (user?.role === 'AM' && amStatusFilter !== 'ALL') {
      if (report.status !== amStatusFilter) return false;
    }



    // 10. AM Safety Filter (Strictly enforce Area in Table)
    if (user?.role === 'AM') {
      if (report.areaCode !== user.areaCode) return false;
    }

    // 11. AO Privacy Filter (Strictly View Own Reports)
    // Since db.getReports now returns ALL approved (for ranking), we must filter the table.
    if (user?.role === 'AO') {
      if (report.aoId !== user.id) return false;
    }

    // 12. AK Privacy Filter (View Assigned or Area Reports)
    if (user?.role === 'AK') {
      // Must be assigned to AK OR (Unassigned AND in same Area)
      const isAssignedToMe = report.assignedToId === user.id;
      const isUnassignedInArea = !report.assignedToId && report.areaCode === user.areaCode;

      if (!isAssignedToMe && !isUnassignedInArea) return false;

      // Filter by AK View Tab (REVISIONS only shows isRevision reports)
      if (akViewTab === 'REVISIONS') {
        if (!report.isRevision || report.status !== 'SUBMITTED') return false;
      }
    }


    // 13. AKA Filter (ReportType AREA and Stage matches)
    if (user?.role === 'AKA') {
      // Handled in db.ts but double check here if needed
      return true;
    }

    // 14. AKP Filter (ReportType AREA and Stage matches)
    if (user?.role === 'AKP') {
      return true;
    }

    return true;
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const u = await db.login(loginUser, loginPass);
    setLoading(false);
    if (u) {
      setUser(u);
      sessionStorage.setItem('session_user', JSON.stringify(u)); // Persist session
      setView('DASHBOARD');
      setLoginUser('');
      setLoginPass('');
    } else {
      showModal({ title: 'Login Gagal', message: 'Username atau password salah. Silakan coba lagi.', type: 'error' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('LOGIN');
    sessionStorage.removeItem('session_user');
    setSelectedReport(null);
  };

  // --- ACTIONS ---

  const handleCreateReport = async (data: ReportData, assignedTo?: { id: string, name: string }) => {
    if (!user) return;
    setLoading(true);
    await db.createReport(user, data, activeReportType, assignedTo);
    setLoading(false);

    if (assignedTo) {
      showModal({
        title: 'Berhasil Dikirim',
        message: (
          <span>
            Mantap Data Pengajuan Sudah Terkirim ke Admin <strong>{assignedTo.name}</strong>
          </span>
        ),
        type: 'success'
      });
    } else {
      showModal({ title: 'Draft Disimpan', message: 'Laporan berhasil disimpan sebagai Draft!', type: 'success' });
    }
    setView('DASHBOARD');
  };

  // New: Save as Draft (Simpan Dulu)
  const handleSaveDraft = async (data: ReportData) => {
    if (!user) return;
    setLoading(true);

    if (selectedReport) {
      // Update existing draft - Keep current status (DRAFT or RETURNED)
      await db.updateReportData(selectedReport.id, data, selectedReport.status);
      showModal({ title: 'Draft Diperbarui', message: 'Progress pengisian laporan berhasil disimpan!', type: 'success' });
    } else {
      // Create new draft (no assignedTo = draft)
      await db.createReport(user, data, activeReportType);
      showModal({ title: 'Draft Disimpan', message: 'Laporan berhasil disimpan sebagai Draft. Anda dapat melanjutkan nanti.', type: 'success' });
    }

    setLoading(false);
    setView('DASHBOARD');
  };

  // Handler for creating new report - always starts fresh
  const handleCreateNewReport = async (type: ReportType) => {
    // Clear any existing autosave for this user before starting new
    if (user) {
      await db.clearDraft(user.id);
    }
    setSelectedReport(null);
    setActiveReportType(type);
    setView('CREATE');
  };

  // Ref to access current form data from ReportForm
  const formDataRef = useRef<ReportData | null>(null);

  // Helper to check if form data is essentially empty
  const isFormDataEmpty = (data: ReportData | null): boolean => {
    if (!data) return true;

    // Check if memberName is filled
    const hasMemberName = data.memberName && data.memberName.trim().length > 0;

    // Check if any photos exist in kcSections
    const hasKCPhotos = data.kcSections?.some(section =>
      section.photos.some(photo => photo.image)
    );

    // Check if any photos exist in documentSections
    const hasDocPhotos = data.documentSections?.some(section =>
      section.photos.some(photo => photo.image)
    );

    // Check if any dynamicPhotos exist
    const hasDynamicPhotos = data.dynamicPhotos?.some(photo => photo.image);

    // Form is empty if no meaningful data exists
    return !hasMemberName && !hasKCPhotos && !hasDocPhotos && !hasDynamicPhotos;
  };

  // Handler for back button - auto-saves as DRAFT (same as "Simpan Dulu")
  const handleBackButton = async () => {
    // Check if form data is empty
    if (isFormDataEmpty(formDataRef.current)) {
      // Data is empty, just go back without saving
      if (user) {
        await db.clearDraft(user.id);
      }
      setView('DASHBOARD');
      return;
    }

    // For AO in CREATE mode, auto-save as DRAFT to database
    if (view === 'CREATE' && user?.role === 'AO' && formDataRef.current) {
      setLoading(true);
      await db.createReport(user, formDataRef.current, activeReportType);
      // Clear autosave after saving to database
      await db.clearDraft(user.id);
      setLoading(false);
      showModal({
        title: 'Draft Tersimpan',
        message: 'Laporan berhasil disimpan sebagai Draft. Anda dapat melanjutkan nanti.',
        type: 'success'
      });
      setView('DASHBOARD');
    }
    // For AO in EDIT mode (editing existing draft), update the draft
    else if (view === 'EDIT' && user?.role === 'AO' && selectedReport && formDataRef.current) {
      setLoading(true);
      await db.updateReportData(selectedReport.id, formDataRef.current, selectedReport.status);
      await db.clearDraft(user.id);
      setLoading(false);
      showModal({
        title: 'Draft Diperbarui',
        message: 'Progress pengisian laporan berhasil disimpan!',
        type: 'success'
      });
      setView('DASHBOARD');
    }
    // For REVIEW mode or non-AO users, just go back
    else {
      setView('DASHBOARD');
    }
  };

  const handleUpdateReport = async (data: ReportData, assignedTo?: { id: string, name: string }) => {
    if (!selectedReport) return;
    setLoading(true);
    // Explicitly set to SUBMITTED for revisions
    await db.updateReportData(selectedReport.id, data, 'SUBMITTED');
    setLoading(false);

    const adminName = assignedTo?.name || 'Admin Kredit';

    showModal({
      title: user?.role === 'IT_SUPPORT' ? 'Data Diperbarui' : 'Revisi Terkirim',
      message: user?.role === 'IT_SUPPORT' ? 'Data laporan berhasil diperbarui.' : `Laporan Revisi Berhasil dikirim ulang ke ${adminName}`,
      type: 'success'
    });
    setView('DASHBOARD');
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user || user.role !== 'IT_SUPPORT') return;
    showModal({
      title: 'Hapus Laporan?',
      message: 'Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.',
      type: 'confirm',
      confirmLabel: 'Hapus Permanen',
      onConfirm: async () => {
        setLoading(true);
        await db.deleteReport(reportId);
        await refreshReports();
        setLoading(false);
        showModal({ title: 'Dihapus', message: 'Laporan berhasil dihapus permanen.', type: 'success' });
      }
    });
  };

  const handleCancelSubmission = async (reportId: string) => {
    if (!user || user.role !== 'AO') return;
    showModal({
      title: 'Batalkan Pengiriman?',
      message: 'Laporan akan ditarik kembali dari Admin Kredit dan dikembalikan ke status Draft. Anda dapat mengedit dan mengirim ulang.',
      type: 'confirm',
      confirmLabel: 'Ya, Batalkan',
      onConfirm: async () => {
        setLoading(true);
        await db.cancelSubmission(reportId);
        await refreshReports();
        setLoading(false);
        showModal({ title: 'Dibatalkan', message: 'Laporan berhasil ditarik kembali ke Draft.', type: 'success' });
      }
    });
  };

  // Handler for deleting draft reports
  const handleDeleteDraft = async (reportId: string) => {
    if (!user || user.role !== 'AO') return;
    showModal({
      title: 'Hapus Draft?',
      message: 'Draft laporan ini akan dihapus secara permanen dan tidak dapat dikembalikan. Apakah Anda yakin?',
      type: 'confirm',
      confirmLabel: 'Ya, Hapus',
      onConfirm: async () => {
        setLoading(true);
        await db.deleteReport(reportId);
        await refreshReports();
        setLoading(false);
        showModal({ title: 'Dihapus', message: 'Draft berhasil dihapus.', type: 'success' });
      }
    });
  };

  const handleAKAction = async (status: 'APPROVED' | 'RETURNED') => {
    if (!selectedReport) return;
    if (status === 'RETURNED' && !correctionNote) {
      showModal({ title: 'Catatan Wajib Diisi', message: 'Harap isi catatan koreksi sebelum mengembalikan laporan!', type: 'warning' });
      return;
    }
    setLoading(true);
    await db.processReport(selectedReport.id, status, correctionNote);
    setLoading(false);
    showModal({
      title: status === 'APPROVED' ? 'Laporan Disetujui' : 'Laporan Dikembalikan',
      message: status === 'APPROVED' ? 'Laporan berhasil disetujui dan berstatus Sukses.' : 'Laporan berhasil dikembalikan ke AO untuk perbaikan.',
      type: 'success'
    });
    setView('DASHBOARD');
    setCorrectionNote('');
  };

  const handleForwardReport = async (nextStage: ReportStage) => {
    if (!selectedReport) return;
    setLoading(true);
    // Forwarding implicitly approves for that stage
    await db.processReport(selectedReport.id, 'APPROVED', '', nextStage);
    setLoading(false);
    showModal({
      title: 'Berhasil Dikirim',
      message: `Laporan berhasil dikirim ke tahap selanjutnya (${nextStage}).`,
      type: 'success'
    });
    setView('DASHBOARD');
  };

  const handleReturnReport = async (prevStage: ReportStage) => {
    if (!selectedReport) return;
    if (!correctionNote) {
      showModal({ title: 'Catatan Wajib Diisi', message: 'Harap isi catatan koreksi sebelum mengembalikan laporan!', type: 'warning' });
      return;
    }
    setLoading(true);
    // Returned goes back to "RETURNED" status usually, but we keep stage flow
    // Actually if AKP returns to AKA, status is RETURNED, stage becomes AKA.
    await db.processReport(selectedReport.id, 'RETURNED', correctionNote, prevStage);
    setLoading(false);
    showModal({
      title: 'Laporan Dikembalikan',
      message: `Laporan dikembalikan ke tahap sebelumnya (${prevStage}).`,
      type: 'success'
    });
    setView('DASHBOARD');
    setCorrectionNote('');
  };

  // --- VIEWS ---

  if (view === 'LOGIN') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200">
          <div className="text-center mb-8">
            <img
              src={cupsLogo}
              alt="CUPS Logo"
              className="w-24 h-24 mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-800">DAKU</h1>
            <p className="text-gray-500 text-sm">"Datamu-Dataku"</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Masukkan username"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Masukkan password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-100">
            <p className="font-bold mb-1">Semangat</p>
            <p>Salam Prosocietas</p>
          </div>
        </div>
      </div>
    );
  }

  // Common Header
  const Header = () => (
    <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className={`p-2 rounded-lg text-white font-bold ${user?.role === 'ADMIN' ? 'bg-gray-800' : user?.role === 'AO' ? 'bg-blue-600' : user?.role === 'AM' ? 'bg-orange-600' : user?.role === 'GM' ? 'bg-yellow-600' : user?.role === 'IT_SUPPORT' ? 'bg-red-800' : 'bg-indigo-600'}`}>
          {user?.role === 'IT_SUPPORT' ? 'IT SUPPORT' : user?.role === 'AKA' ? 'Admin Area' : user?.role === 'AKP' ? 'Admin Pusat' : user?.role}
        </div>
        <div>
          <h2 className="font-bold text-gray-800">{user?.name || user?.username}</h2>
          <p className="text-xs text-gray-500">{user?.id} | {user?.branchCode} | Area: {user?.areaCode}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap justify-center md:justify-end w-full md:w-auto">
        {user?.role === 'ADMIN' && view !== 'USER_MGMT' && (
          <button onClick={() => setView('USER_MGMT')} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 font-semibold">
            <Users size={18} /> Manage Users
          </button>
        )}
        {view !== 'DASHBOARD' && (
          <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2">
            <LayoutDashboard size={18} /> Dashboard
          </button>
        )}

        <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:text-red-800 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </header>
  );

  const StatusBadge = ({ status, type, report }: { status: string, type: ReportType, report: Report }) => {
    let typeClass = type === 'AREA' ? 'bg-purple-100 text-purple-700' : type === 'KP' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700';
    let typeLabel = type === 'AREA' ? 'AREA' : type === 'KP' ? 'KP' : 'KC';

    let statusEl;
    switch (status) {
      case 'SUBMITTED': statusEl = <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">Menunggu Review</span>; break;
      case 'RETURNED': statusEl = <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">Perlu Revisi</span>; break;
      case 'APPROVED': statusEl = <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">Sukses</span>; break;
      default: statusEl = <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Draft</span>;
    }

    return (
      <div className="flex gap-2 items-center flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${typeClass}`}>
          {typeLabel}
        </span>
        {statusEl}
        {(type === 'AREA' || type === 'KP') && (
          <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-200 font-medium uppercase tracking-wider">
            {report.currentStage === 'AKP' ? 'KP' : (report.currentStage || 'AK')}
          </span>
        )}
      </div>
    )
  };

  // PREVENT FLASHING: Show loading or nothing while checking session
  if (isCheckingSession) {
    return <LoadingScreen />;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Logo Container */}
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 animate-pulse"></div>
            <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl border border-white/10 relative z-10 transform transition-transform duration-500 hover:scale-105">
              <img src={cupsLogo} alt="Loading..." className="w-20 h-20 object-contain drop-shadow-lg" />
            </div>
          </div>

          {/* Text & Loader */}
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 tracking-[0.2em] animate-pulse">
              MEMUAT SISTEM
            </h2>

            {/* Custom Progress Bar */}
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4 relative">
              <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-shimmer"></div>
            </div>

            <p className="text-blue-300/60 text-xs font-light tracking-wide mt-2">
              Menyiapkan data anda...
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 w-full text-center z-10">
          <p className="text-white/20 text-[10px] tracking-widest uppercase">
            Credit Union Pancur Solidaritas
          </p>
        </div>
      </div >
    );
  }

  // LOGIN VIEW
  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
          <div className="flex justify-center mb-8">
            <div className="bg-white p-4 rounded-full shadow-lg">
              <img src={cupsLogo} alt="CUPS Logo" className="w-20 h-20 object-contain" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center text-white mb-2">Sistem Laporan Kredit</h2>
          <p className="text-center text-blue-200 mb-8 text-sm">Credit Union Pancur Solidaritas</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-blue-100 text-sm font-semibold mb-2 ml-1">Username / ID</label>
              <div className="relative group">
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-blue-200/50 transition-all group-hover:bg-white/20"
                  placeholder="Masukan ID User..."
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                />
                <UserIcon className="absolute left-4 top-3.5 text-blue-300 w-5 h-5 group-hover:text-white transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-blue-100 text-sm font-semibold mb-2 ml-1">Password</label>
              <div className="relative group">
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-blue-200/50 transition-all group-hover:bg-white/20"
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
                <Lock className="absolute left-4 top-3.5 text-blue-300 w-5 h-5 group-hover:text-white transition-colors" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <RefreshCw className="animate-spin" /> : 'Masuk Sistem'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-blue-300/80">
              Versi 4.0.0 (Secure & IndexedDB) <br />
              &copy; 2026 Tim IT CU PANCUR SOLIDARITAS
            </p>
          </div>
        </div>
      </div>
    );
  }


  if (view === 'USER_MGMT') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <UserManagement onCancel={() => setView('DASHBOARD')} />
        </main>
      </div>
    )
  }

  // DASHBOARD VIEW
  if (view === 'DASHBOARD') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <FloatingSearchPopup
          user={user}
          search={dashboardSearch}
          onSearchChange={setDashboardSearch}
          branchFilter={dashboardBranchFilter}
          onBranchFilterChange={setDashboardBranchFilter}
          typeFilter={dashboardTypeFilter}
          onTypeFilterChange={setDashboardTypeFilter}
          branches={Array.from(new Set(reports.map(r => r.branch))).sort()}
        />
        <main className={`flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col lg:flex-row gap-6 items-start`}>
          <div className="flex-1 min-w-0 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {user?.role === 'ADMIN' ? 'Semua Laporan' :
                    user?.role === 'AO' ? 'Laporan Saya' :
                      user?.role === 'AKA' ? `Laporan Masuk (Area ${user.areaCode})` :
                        user?.role === 'AKP' ? 'Laporan Masuk Nasional (Pusat)' :
                          `Daftar Pengajuan Masuk (Area ${user?.areaCode})`}
                </h1>
                {(user?.role === 'AK' || user?.role === 'AKA' || user?.role === 'AKP') && (
                  <div className="flex flex-col gap-2 mt-2">
                    <p className={`text-sm inline-block px-2 py-1 rounded mt-1 font-medium border ${user.role === 'AK' ? 'text-purple-600 bg-purple-50 border-purple-200' :
                      user.role === 'AKA' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
                        'text-purple-600 bg-purple-50 border-purple-200'
                      }`}>
                      {user.role === 'AK' ? 'Menampilkan laporan yang ditugaskan kepada Anda.' :
                        user.role === 'AKA' ? 'Menampilkan laporan Area yang menunggu persetujuan Anda.' :
                          'Menampilkan laporan Nasional yang menunggu persetujuan Pusat.'}
                    </p>
                    {/* Tabs for AK */}
                    {user.role === 'AK' && (
                      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                          onClick={() => setAkViewTab('ALL')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${akViewTab === 'ALL' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          Semua
                        </button>
                        <button
                          onClick={() => setAkViewTab('REVISIONS')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${akViewTab === 'REVISIONS' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          Revisi Terbaru
                          {reports.filter(r => r.isRevision && r.status === 'SUBMITTED' && !r.viewedByAK).length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                              {reports.filter(r => r.isRevision && r.status === 'SUBMITTED' && !r.viewedByAK).length}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Cari AO, Anggota, Cabang..."
                        className={`text-sm border rounded px-2 py-1 w-48 focus:ring-2 outline-none ${user.role === 'AK' ? 'focus:ring-purple-500' :
                          user.role === 'AKA' ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'
                          }`}
                        value={dashboardSearch}
                        onChange={(e) => setDashboardSearch(e.target.value)}
                      />
                      <select
                        className={`text-sm border rounded px-2 py-1 focus:ring-2 outline-none ${user.role === 'AK' ? 'focus:ring-purple-500' :
                          user.role === 'AKA' ? 'focus:ring-indigo-500' : 'focus:ring-purple-500'
                          }`}
                        value={dashboardBranchFilter}
                        onChange={(e) => setDashboardBranchFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Cabang</option>
                        {Array.from(new Set(reports.map(r => r.branch))).sort().map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {user?.role === 'AO' && (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Cari Nama Anggota..."
                        className="text-sm border rounded px-2 py-1 w-48 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={dashboardSearch}
                        onChange={(e) => setDashboardSearch(e.target.value)}
                      />
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={dashboardTypeFilter}
                        onChange={(e) => setDashboardTypeFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Jenis</option>
                        <option value="KC">KC (Kredit Cepat)</option>
                        <option value="AREA">AREA (Analisa Area)</option>
                        <option value="KP">KP (Kantor Pusat)</option>
                      </select>
                    </div>
                  </div>
                )}
                {user?.role === 'ADMIN' && (
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-sm text-gray-600 bg-gray-100 inline-block px-2 py-1 rounded font-medium border border-gray-300">
                      Monitoring Semua Aktivitas User
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Cari Nama AO..."
                        className="text-sm border rounded px-2 py-1 w-48 focus:ring-2 focus:ring-gray-500 outline-none"
                        value={dashboardSearch}
                        onChange={(e) => setDashboardSearch(e.target.value)}
                      />
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-gray-500 outline-none"
                        value={adminAreaFilter}
                        onChange={(e) => setAdminAreaFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Area</option>
                        {Array.from(new Set(reports.map(r => r.areaCode))).sort().map(area => (
                          <option key={area} value={area}>Area {area}</option>
                        ))}
                      </select>
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-gray-500 outline-none"
                        value={dashboardBranchFilter}
                        onChange={(e) => setDashboardBranchFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Cabang</option>
                        {Array.from(new Set(reports.map(r => r.branch))).sort().map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {user?.role === 'AM' && (
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-sm text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded font-medium border border-orange-200">
                      Monitoring Area {user.areaCode}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Cari Nama AO / AK..."
                        className="text-sm border rounded px-2 py-1 w-48 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={amUserSearch}
                        onChange={(e) => setAmUserSearch(e.target.value)}
                      />
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={amBranchFilter}
                        onChange={(e) => setAmBranchFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Cabang</option>
                        {Array.from(new Set(reports.map(r => r.branch))).sort().map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={amTypeFilter}
                        onChange={(e) => setAmTypeFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Jenis</option>
                        <option value="KC">KC</option>
                        <option value="AREA">AREA</option>
                        <option value="KP">KP</option>
                      </select>
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={amStatusFilter}
                        onChange={(e) => setAmStatusFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SUBMITTED">Menunggu Review</option>
                        <option value="RETURNED">Dikembalikan</option>
                        <option value="APPROVED">Sukses</option>
                      </select>
                    </div>
                  </div>
                )}
                {user?.role === 'GM' && (
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-sm text-yellow-700 bg-yellow-50 inline-block px-2 py-1 rounded font-medium border border-yellow-200">
                      Monitoring Nasional (Semua Area)
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Cari Nama AO / Admin..."
                        className="text-sm border rounded px-2 py-1 w-full md:w-64 focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={gmSearch}
                        onChange={(e) => setGmSearch(e.target.value)}
                      />
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={gmAreaFilter}
                        onChange={(e) => setGmAreaFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Area</option>
                        {/* Get unique areas from reports for filter options */}
                        {Array.from(new Set(reports.map(r => r.areaCode))).sort().map(area => (
                          <option key={area} value={area}>Area {area}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {user?.role === 'IT_SUPPORT' && (
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-sm text-red-700 bg-red-50 inline-block px-2 py-1 rounded font-medium border border-red-200">
                      IT Support Panel (Full Access)
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari Report ID..."
                          className="text-sm border rounded px-2 py-1 w-full md:w-48 focus:ring-2 focus:ring-red-500 outline-none font-mono"
                          value={itSearchId}
                          onChange={(e) => setItSearchId(e.target.value)}
                        />
                      </div>
                      <select
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-red-500 outline-none"
                        value={gmAreaFilter} // Reusing GM filter logic
                        onChange={(e) => setGmAreaFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Area</option>
                        {Array.from(new Set(reports.map(r => r.areaCode))).sort().map(area => (
                          <option key={area} value={area}>Area {area}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* AO ACTIONS */}
              {user?.role === 'AO' && (
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleCreateNewReport('KC')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <FileText size={18} /> Buat Laporan KC (Baru)
                  </button>

                  <button
                    onClick={() => handleCreateNewReport('AREA')}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 shadow-lg border border-purple-800"
                  >
                    <Building2 size={18} /> Buat Laporan Area (Baru)
                  </button>

                  <button
                    onClick={() => handleCreateNewReport('KP')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg border border-indigo-800"
                  >
                    <Building2 size={18} /> Buat Pengajuan Kantor Pusat
                  </button>
                </div>
              )}
            </div>

            {/* AO STATS CARDS */}
            {user?.role === 'AO' && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-sm font-medium opacity-90">Sedang Review</div>
                  <div className="text-3xl font-bold mt-1">
                    {reports.filter(r => r.status === 'SUBMITTED').length}
                  </div>
                  <div className="text-xs opacity-75 mt-1">Menunggu persetujuan Admin</div>
                </div>
                <div className="bg-gradient-to-br from-green-400 to-emerald-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-sm font-medium opacity-90">Sukses</div>
                  <div className="text-3xl font-bold mt-1">
                    {reports.filter(r => r.status === 'APPROVED').length}
                  </div>
                  <div className="text-xs opacity-75 mt-1">Pengajuan disetujui</div>
                </div>
                <div className="bg-gradient-to-br from-gray-400 to-gray-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-sm font-medium opacity-90">Draft</div>
                  <div className="text-3xl font-bold mt-1">
                    {reports.filter(r => r.status === 'DRAFT').length}
                  </div>
                  <div className="text-xs opacity-75 mt-1">Belum dikirim</div>
                </div>
              </div>
            )}

            {/* AM STATS CARDS - Filter by same areaCode */}
            {user?.role === 'AM' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-sm font-medium opacity-90">Sedang Review</div>
                  <div className="text-3xl font-bold mt-1">
                    {reports.filter(r => r.areaCode === user.areaCode && r.status === 'SUBMITTED').length}
                  </div>
                  <div className="text-xs opacity-75 mt-1">Laporan AO di Area {user.areaCode}</div>
                </div>
                <div className="bg-gradient-to-br from-green-400 to-emerald-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-sm font-medium opacity-90">Sukses</div>
                  <div className="text-3xl font-bold mt-1">
                    {reports.filter(r => r.areaCode === user.areaCode && r.status === 'APPROVED').length}
                  </div>
                  <div className="text-xs opacity-75 mt-1">Pengajuan disetujui di Area {user.areaCode}</div>
                </div>
              </div>
            )}

            {/* GM STATS CARDS - All data */}
            {user?.role === 'GM' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-sm font-medium opacity-90">Sedang Review</div>
                  <div className="text-3xl font-bold mt-1">
                    {reports.filter(r => r.status === 'SUBMITTED').length}
                  </div>
                  <div className="text-xs opacity-75 mt-1">Laporan seluruh AO Nasional</div>
                </div>
                <div className="bg-gradient-to-br from-green-400 to-emerald-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="text-sm font-medium opacity-90">Sukses</div>
                  <div className="text-3xl font-bold mt-1">
                    {reports.filter(r => r.status === 'APPROVED').length}
                  </div>
                  <div className="text-xs opacity-75 mt-1">Pengajuan disetujui Nasional</div>
                </div>
              </div>
            )}

            {/* TEMPORARY: Clear All Reports Button for Testing */}
            {user?.role === 'ADMIN' && (
              <div className="mb-4">
                <button
                  onClick={async () => {
                    if (confirm('Hapus SEMUA laporan? Ini tidak dapat dibatalkan!')) {
                      await db.clearAllReports();
                      refreshReports();
                      showModal({ title: 'Data Dihapus', message: 'Semua laporan berhasil dihapus.', type: 'success' });
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Trash2 size={16} /> Clear All Reports (TEST)
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

              {/* SEARCH BAR */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-600">Filter Tanggal:</span>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="text-red-500 text-sm font-semibold hover:text-red-700 ml-2"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500 italic">
                  Matched: {filteredReports.length} reports
                </div>
              </div>

              <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px] overflow-hidden">
                {/* Table Header / Toolbar */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-30 relative">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {/* Transaction History ({filteredReports.length}) */} DATA
                  </h3>
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-bold text-gray-900">{filteredReports.length} Laporan</span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative bg-gray-50/50">
                  {loading ? (
                    <div className="p-8 text-center flex items-center justify-center h-full text-gray-500 flex-col gap-2">
                      <RefreshCw className="animate-spin text-blue-500" size={32} />
                      <span>Memuat data laporan...</span>
                    </div>
                  ) : (
                    <>
                      {/* CARD VIEW FOR AO, AK, AKA, & AKP */}
                      {(user?.role === 'AO' || user?.role === 'AK' || user?.role === 'AKA' || user?.role === 'AKP') ? (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredReports.length === 0 && (
                            <div className="col-span-full text-center text-gray-400 p-12">Tidak ada data laporan yang ditemukan.</div>
                          )}
                          {filteredReports.map(report => (
                            <div key={report.id} className="bg-white block p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <div className="mb-2">
                                <h5 className="text-lg font-bold tracking-tight text-gray-900 line-clamp-1" title={report.data.memberName || report.id}>
                                  {report.data.memberName ? report.data.memberName : `Laporan ${report.reportType}`}
                                </h5>
                                <div className="mt-1">
                                  <StatusBadge status={report.status} type={report.reportType} report={report} />
                                </div>
                              </div>

                              <div className="mb-4 text-sm text-gray-600 space-y-1">
                                <p className="flex items-center gap-2">
                                  <span className="font-mono text-xs bg-gray-100 px-1 rounded">{report.id}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{new Date(report.updatedAt).toLocaleDateString()}</span>
                                </p>
                                <p className="text-xs text-gray-400 italic">
                                  AO: {report.aoName} {(user?.role !== 'AO' && report.assignedToName) ? `• AK: ${report.assignedToName}` : ''}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-100">
                                {/* AO ACTIONS */}
                                {user?.role === 'AO' && (
                                  <>
                                    {(report.status === 'RETURNED' || report.status === 'APPROVED' || report.status === 'DRAFT') && (
                                      <>
                                        {report.status === 'APPROVED' && (
                                          <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="inline-flex items-center text-blue-600 bg-blue-50 border border-transparent hover:bg-blue-100 font-medium rounded-lg text-sm px-3 py-2 text-center">
                                            Lihat
                                          </button>
                                        )}
                                        <button
                                          onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('EDIT'); }}
                                          className={`inline-flex items-center font-medium rounded-lg text-sm px-3 py-2 text-center border border-transparent ${report.status === 'APPROVED' ? 'text-green-600 bg-green-50 hover:bg-green-100' :
                                            report.status === 'DRAFT' ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-sm' :
                                              'text-white bg-red-600 hover:bg-red-700 shadow-sm'
                                            }`}
                                        >
                                          {report.status === 'APPROVED' ? 'Edit Data' : report.status === 'DRAFT' ? 'Lanjut Kerja' : 'Revisi'}
                                          <svg className="w-3.5 h-3.5 ms-2 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                                          </svg>
                                        </button>
                                        {/* Delete button for DRAFT only */}
                                        {report.status === 'DRAFT' && (
                                          <button
                                            onClick={() => handleDeleteDraft(report.id)}
                                            className="inline-flex items-center text-red-600 bg-red-50 border border-transparent hover:bg-red-100 font-medium rounded-lg text-sm px-3 py-2 text-center"
                                            title="Hapus Draft"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        )}
                                      </>
                                    )}
                                    {report.status === 'SUBMITTED' && (
                                      <>
                                        <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="inline-flex items-center text-blue-600 bg-blue-50 border border-transparent hover:bg-blue-100 font-medium rounded-lg text-sm px-3 py-2 text-center">
                                          Lihat
                                        </button>
                                        {!report.viewedByAK ? (
                                          <>
                                            <button
                                              onClick={() => handleCancelSubmission(report.id)}
                                              className="inline-flex items-center text-orange-600 bg-orange-50 border border-transparent hover:bg-orange-100 font-medium rounded-lg text-sm px-3 py-2 text-center"
                                            >
                                              Batal Kirim
                                            </button>
                                            <span className="text-yellow-600 text-xs font-semibold bg-yellow-50 px-2 py-1 rounded self-center">Sudah Terkirim</span>
                                          </>
                                        ) : (
                                          <span className="text-green-600 text-xs font-semibold bg-green-50 px-2 py-1 rounded self-center">Sudah Dibuka AK</span>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}

                                {/* AK ACTIONS */}
                                {user?.role === 'AK' && (
                                  <>
                                    {report.status === 'SUBMITTED' ? (
                                      <>
                                        <button onClick={async () => {
                                          await db.markAsViewedByAK(report.id);
                                          setSelectedReport({ ...report, viewedByAK: true, isRevision: false });
                                          setActiveReportType(report.reportType);
                                          setView('REVIEW');
                                          refreshReports(); // Refresh to update badge counts
                                        }} className="inline-flex items-center text-white bg-purple-600 hover:bg-purple-700 font-medium rounded-lg text-sm px-4 py-2 text-center shadow-sm">
                                          Periksa Pengajuan
                                          <svg className="w-3.5 h-3.5 ms-2 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                                          </svg>
                                        </button>
                                        {/* Revision indicator */}
                                        {report.isRevision && (
                                          <span className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-200">Sudah Di Revisi</span>
                                        )}
                                        {/* Unread indicator */}
                                        {!report.viewedByAK && (
                                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">Baru</span>
                                        )}
                                      </>
                                    ) : (
                                      <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="inline-flex items-center text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg text-sm px-3 py-2 text-center">
                                        Lihat Detail
                                      </button>
                                    )}

                                    {report.reportType === 'AREA' && report.status === 'APPROVED' && (
                                      <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="inline-flex items-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-medium rounded-lg text-sm px-3 py-2 text-center border border-indigo-200">
                                        Kirim ke Area
                                        <svg className="w-3.5 h-3.5 ms-2 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                                        </svg>
                                      </button>
                                    )}
                                  </>
                                )}

                                {/* AKA ACTIONS */}
                                {user?.role === 'AKA' && (
                                  <div className="flex flex-col md:flex-row gap-2 justify-end items-end md:items-center">
                                    <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="inline-flex items-center text-blue-600 bg-blue-50 border border-transparent hover:bg-blue-100 font-medium rounded-lg text-sm px-3 py-2 text-center">
                                      {report.currentStage === 'AKA' && report.status !== 'RETURNED' ? 'Periksa' : 'Lihat'}
                                    </button>
                                  </div>
                                )}

                                {/* AKP ACTIONS */}
                                {user?.role === 'AKP' && (
                                  <div className="flex flex-col md:flex-row gap-2 justify-end items-end md:items-center">
                                    <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="inline-flex items-center text-blue-600 bg-blue-50 border border-transparent hover:bg-blue-100 font-medium rounded-lg text-sm px-3 py-2 text-center">
                                      {report.currentStage === 'AKP' && report.status !== 'RETURNED' ? 'Periksa' : 'Lihat'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* TABLE VIEW FOR OTHER ROLES */
                        <table className="min-w-full text-left border-collapse">
                          <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                            <tr>
                              <th className="sticky left-0 z-30 top-0 bg-gray-50 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 min-w-[150px]">ID Laporan</th>
                              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[140px]">Tanggal</th>
                              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[150px]">Pembuat (AO)</th>
                              {user?.role !== 'AO' && <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[150px]">Ditugaskan Ke</th>}
                              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[150px]">Jenis & Status</th>
                              <th className="p-4 text-xs font-semibold text-gray-500 text-right uppercase tracking-wider border-b border-gray-200 min-w-[200px]">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredReports.length === 0 && (
                              <tr><td colSpan={6} className="p-12 text-center text-gray-400">Tidak ada data laporan yang ditemukan.</td></tr>
                            )}
                            {filteredReports.map(report => (
                              <tr key={report.id} className="hover:bg-blue-50/50 transition-colors duration-150 group">
                                <td className="sticky left-0 bg-white group-hover:bg-blue-50/50 p-4 border-r border-gray-100 z-10 transition-colors duration-150">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900 truncate max-w-[160px]" title={report.id}>
                                      {report.id}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                      {report.reportType}
                                    </span>
                                    {report.data.memberName && (
                                      <span className="text-[10px] font-bold text-blue-600 mt-1 truncate max-w-[160px]">
                                        {report.data.memberName}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-700">{new Date(report.updatedAt).toLocaleDateString()}</span>
                                    <span className="text-xs text-gray-400">{new Date(report.updatedAt).toLocaleTimeString()}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-sm font-medium text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                      {report.aoName.charAt(0)}
                                    </div>
                                    {report.aoName}
                                  </div>
                                </td>
                                {user?.role !== 'AO' && <td className="p-4 text-sm text-gray-500">{report.assignedToName || '-'}</td>}
                                <td className="p-4"><StatusBadge status={report.status} type={report.reportType} report={report} /></td>
                                <td className="p-4 text-right space-x-2">
                                  {/* Logic AKA */}
                                  {user?.role === 'AKA' && (
                                    <div className="flex flex-col md:flex-row gap-2 justify-end items-end md:items-center">
                                      <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="text-blue-600 font-semibold text-sm hover:underline border border-blue-200 px-2 py-1 rounded bg-blue-50">
                                        {report.currentStage === 'AKA' && report.status !== 'RETURNED' ? 'Periksa' : 'Lihat'}
                                      </button>
                                    </div>
                                  )}

                                  {/* Logic AKP */}
                                  {user?.role === 'AKP' && (
                                    <div className="flex flex-col md:flex-row gap-2 justify-end items-end md:items-center">
                                      <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="text-blue-600 font-semibold text-sm hover:underline border border-blue-200 px-2 py-1 rounded bg-blue-50">
                                        {report.currentStage === 'AKP' && report.status !== 'RETURNED' ? 'Periksa' : 'Lihat'}
                                      </button>
                                    </div>
                                  )}

                                  {/* Logic ADMIN: Lihat Semua */}
                                  {user?.role === 'ADMIN' && (
                                    <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="text-blue-600 font-semibold text-sm hover:underline">Detail</button>
                                  )}

                                  {/* Logic AM: View and Edit */}
                                  {user?.role === 'AM' && (
                                    <div className="flex flex-col md:flex-row gap-2 justify-end items-end md:items-center">
                                      <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="text-blue-600 font-semibold text-sm hover:underline border border-blue-200 px-2 py-1 rounded bg-blue-50">Lihat</button>
                                      <button
                                        onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('EDIT'); }}
                                        className="text-green-600 hover:text-green-800 font-semibold text-sm hover:underline flex items-center gap-1 border border-green-200 px-2 py-1 rounded bg-green-50"
                                      >
                                        <Edit size={14} /> Edit
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-center text-gray-400">
                  {user?.role === 'AO' || user?.role === 'AK' || user?.role === 'AKA' || user?.role === 'AKP' ? '' : 'Scroll horizontally to see more columns • '} Scroll vertically to browse history
                </div>
              </div>

              {/* GM & IT SUPPORT AREA GROUPING VIEW */}
              {
                (user?.role === 'GM' || user?.role === 'IT_SUPPORT') && !loading && (
                  <div className="mt-8">
                    <h3 className={`text-lg font-bold text-gray-700 mb-4 p-3 rounded border ${user?.role === 'IT_SUPPORT' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      Laporan per Area Kerja {user?.role === 'IT_SUPPORT' ? '(Admin Mode)' : ''}
                    </h3>
                    {Array.from(new Set(filteredReports.map(r => r.areaCode))).sort().map(area => {
                      const areaReports = filteredReports.filter(r => r.areaCode === area);
                      if (areaReports.length === 0) return null;
                      return (
                        <div key={area} className="mb-6 bg-white border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                          <div className="bg-gray-100 px-4 py-2 border-b font-bold text-gray-700 flex justify-between min-w-[600px]">
                            <span>Area Kerja: {area}</span>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border">{areaReports.length} Laporan</span>
                          </div>
                          <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                              <tr>
                                <th className="p-3 text-xs font-semibold text-gray-500 whitespace-nowrap">ID</th>
                                <th className="p-3 text-xs font-semibold text-gray-500 whitespace-nowrap">AO / Cabang</th>
                                <th className="p-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Status</th>
                                <th className="p-3 text-xs font-semibold text-gray-500 text-right whitespace-nowrap">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {areaReports.map(report => (
                                <tr key={report.id} className={`hover:bg-blue-50 ${user?.role === 'IT_SUPPORT' ? 'group' : ''}`}>
                                  <td className="p-3 font-mono text-xs">
                                    {report.id}
                                    {user?.role === 'IT_SUPPORT' && <span className="ml-2 text-[10px] text-gray-400">({report.reportType})</span>}
                                  </td>
                                  <td className="p-3 text-xs">
                                    <div className="font-bold">{report.aoName}</div>
                                    <div className="text-gray-500">{report.branch}</div>
                                  </td>
                                  <td className="p-3"><StatusBadge status={report.status} type={report.reportType} report={report} /></td>
                                  <td className="p-3 text-right flex justify-end gap-2">
                                    <button onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('REVIEW'); }} className="text-blue-600 font-semibold text-xs hover:underline">Detail</button>
                                    {user?.role === 'IT_SUPPORT' && (
                                      <>
                                        <button
                                          onClick={() => { setSelectedReport(report); setActiveReportType(report.reportType); setView('EDIT'); }}
                                          className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                                          title="Edit Laporan"
                                        >
                                          <Edit size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteReport(report.id)}
                                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                          title="Hapus Laporan"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div >
          </div >
          {
            user && user.areaCode && (
              <div className="w-full lg:w-80 lg:sticky lg:top-6 h-auto lg:h-[calc(100vh-100px)] flex-shrink-0 mt-6 lg:mt-0">
                <AreaRankingSidebar reports={reports} areaCode={user.areaCode} />
              </div>
            )
          }
        </main >
      </div >
    );
  }

  // CREATE / EDIT / REVIEW CONTAINER
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      <header className={`text-white p-4 shadow-md flex justify-between items-center z-10 ${user?.role === 'AO' ? 'bg-blue-900' : 'bg-gray-800'}`}>
        <div className="flex items-center gap-2">
          <Save className="w-6 h-6" />
          <h1 className="text-xl font-bold">
            {view === 'CREATE' ? `Laporan Baru (${activeReportType})` : view === 'EDIT' ? (user?.role === 'IT_SUPPORT' ? 'Edit Data Laporan' : 'Revisi Laporan') : `Detail Laporan (${activeReportType})`}
          </h1>
          {selectedReport?.status === 'RETURNED' && view === 'EDIT' && (
            <span className="ml-4 bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">Mode Perbaikan</span>
          )}
        </div>
        <div className="flex gap-2">
          {view === 'REVIEW' && (
            <button
              onClick={() => handleExportPDF({ current: document.querySelector('.print-container') })}
              className={`bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Download size={18} />}
              {loading ? 'Processing...' : 'Export PDF'}
            </button>
          )}
          <button onClick={handleBackButton} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold">
            Kembali
          </button>
        </div>
      </header >

      {/* Warning Banner for Returned Reports */}
      {
        selectedReport?.correctionNotes && (view === 'EDIT' || view === 'REVIEW') && (
          <div className="bg-red-100 border-b border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800">Catatan Koreksi Admin Kredit:</h3>
              <p className="text-red-700 text-sm">{selectedReport.correctionNotes}</p>
            </div>
          </div>
        )
      }

      <div className="flex flex-1 overflow-hidden relative">
        <ReportForm
          initialValues={view === 'CREATE' ? undefined : (selectedReport?.data || initialData)}
          reportType={activeReportType}
          readOnly={view === 'REVIEW'}
          userAreaCode={user?.areaCode}
          userId={user?.id}
          onSubmit={view === 'CREATE' ? handleCreateReport : handleUpdateReport}
          onSaveDraft={user?.role === 'AO' && view !== 'REVIEW' ? handleSaveDraft : undefined}
          onDataChange={(data) => { formDataRef.current = data; }}
          isSubmitting={loading}
          onExportPDF={handleExportPDF}
          currentStatus={selectedReport?.status}
        />

        {/* Admin Kredit Action Panel (Overlay) */}
        {(selectedReport?.status === 'APPROVED' || selectedReport?.status === 'RETURNED') && (selectedReport.reportType === 'AREA' || selectedReport.reportType === 'KP') && user?.role === 'AK' && (
          <div className="absolute bottom-0 right-0 w-1/2 md:w-7/12 p-4 bg-white/90 backdrop-blur border-t border-gray-200 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <h3 className="font-bold text-gray-800 border-b pb-2">Aksi Lanjutan Admin Kredit (AREA/KP)</h3>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => handleForwardReport('AKA')}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-bold flex justify-center items-center gap-2 shadow-lg"
              >
                <CheckCircle size={18} /> Kirim ke Admin Kredit Area
              </button>
            </div>
          </div>
        )}


        {selectedReport && user?.role === 'AKA' && selectedReport.currentStage === 'AKA' && selectedReport.status !== 'RETURNED' && (
          <div className="absolute bottom-0 right-0 w-1/2 md:w-7/12 p-4 bg-white/90 backdrop-blur border-t border-gray-200 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <h3 className="font-bold text-gray-800 border-b pb-2">Aksi Admin Kredit Area</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <textarea
                  className="w-full border rounded p-2 text-sm h-24"
                  placeholder="Tulis catatan jika dikembalikan..."
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 w-48">
                <button
                  onClick={() => handleReturnReport('AK')}
                  className="bg-red-100 text-red-700 border border-red-300 px-4 py-2 rounded hover:bg-red-200 font-semibold flex justify-center items-center gap-2 text-sm"
                >
                  <AlertCircle size={16} /> Kembalikan ke AK
                </button>
                <button
                  onClick={() => handleForwardReport('AKP')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold flex justify-center items-center gap-2 shadow-lg text-sm"
                >
                  <CheckCircle size={16} /> Setujui & Kirim ke KP
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedReport && user?.role === 'AKP' && selectedReport.currentStage === 'AKP' && selectedReport.status !== 'RETURNED' && (
          <div className="absolute bottom-0 right-0 w-1/2 md:w-7/12 p-4 bg-white/90 backdrop-blur border-t border-gray-200 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <h3 className="font-bold text-gray-800 border-b pb-2">Aksi Admin Kredit Pusat (FINAL)</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <textarea
                  className="w-full border rounded p-2 text-sm h-24"
                  placeholder="Tulis catatan jika dikembalikan..."
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 w-48">
                <button
                  onClick={() => handleReturnReport('AKA')}
                  className="bg-red-100 text-red-700 border border-red-300 px-4 py-2 rounded hover:bg-red-200 font-semibold flex justify-center items-center gap-2 text-sm"
                >
                  <AlertCircle size={16} /> Kembalikan ke Area
                </button>
                <button
                  onClick={() => handleAKAction('APPROVED')} // Final Approval
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold flex justify-center items-center gap-2 shadow-lg text-sm"
                >
                  <CheckCircle size={16} /> Setujui Final
                </button>
              </div>
            </div>
          </div>
        )}

        {user?.role === 'AK' && view === 'REVIEW' && selectedReport?.status === 'SUBMITTED' && (
          <div className="absolute bottom-0 right-0 w-1/2 md:w-7/12 p-4 bg-white/90 backdrop-blur border-t border-gray-200 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <h3 className="font-bold text-gray-800 border-b pb-2">Aksi Admin Kredit</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <textarea
                  className="w-full border rounded p-2 text-sm h-24"
                  placeholder="Tulis catatan jika dikembalikan..."
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 w-48">
                <button
                  onClick={() => handleAKAction('RETURNED')}
                  className="bg-red-100 text-red-700 border border-red-300 px-4 py-2 rounded hover:bg-red-200 font-semibold flex justify-center items-center gap-2"
                >
                  <AlertCircle size={18} /> Kembalikan
                </button>
                <button
                  onClick={() => handleAKAction('APPROVED')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold flex justify-center items-center gap-2 shadow-lg"
                >
                  <CheckCircle size={18} /> Setujui (Sukses)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EmbedPDF Viewer Modal */}
      {showPdfViewer && pdfUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Preview PDF Export</h3>
              <button
                onClick={() => {
                  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                  setPdfUrl(null);
                  setShowPdfViewer(false);
                }}
                className="text-gray-500 hover:text-red-500 transition-colors"
                title="Tutup & Hapus Preview"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 relative">
              <div
                ref={pdfViewerRef}
                className="w-full h-full absolute inset-0"
                id="embed-pdf-container"
              />
            </div>
          </div>
        </div>
      )}

      {/* Initialize EmbedPDF when modal opens */}
      <EmbedPdfInitializer
        isOpen={showPdfViewer}
        url={pdfUrl}
        containerRef={pdfViewerRef}
      />

    </div >
  );
}

// Separate component to handle side-effect of EmbedPDF init
function EmbedPdfInitializer({ isOpen, url, containerRef }: { isOpen: boolean, url: string | null, containerRef: React.RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    if (isOpen && url && containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = '';

      const viewer = EmbedPDF.init({
        type: 'container',
        target: containerRef.current,
        src: url,
      });

      return () => {
        if (containerRef.current) containerRef.current.innerHTML = '';
      };
    }
  }, [isOpen, url, containerRef]);
  return null;
}
