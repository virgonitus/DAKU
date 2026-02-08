
export interface FinancialItem {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  price: number;
}

export interface DynamicPhoto {
  id: string;
  title: string; // The label of the photo
  image: string | null;
  description: string; // New: Optional caption below photo
  rotation?: number; // 0, 90, 180, 270
  displayMode?: 'default' | 'ktp' | 'full'; // Visual preference
}

export interface DocumentSection {
  id: string;
  title: string; // Section Title (e.g. "Dokumen Keuangan")
  photos: DynamicPhoto[];
}

export interface KCDocumentSection {
  id: string;
  title: string;
  photos: DynamicPhoto[];
  sectionType: 'survey' | 'domisili' | 'peta-domisili' | 'jaminan' | 'peta-jaminan';
}

export interface AreaAnalysisData {
  nomorBA: string;
  alamat: string;
  jumlahPengajuan: number;
  tujuan: string;
  kelengkapan: {
    ktpPribadi: boolean;
    ktpPasangan: boolean;
    kartuKeluarga: boolean;
    npwp: boolean;
    bukuAnggotaPribadi: boolean;
    bukuAnggotaKeluarga: boolean;
    buktiPendapatan: boolean;
    fotocopyJaminan: boolean;
    petaTempatTinggal: boolean;
    petaUsaha: boolean;
    petaJaminan: boolean;
  };
  catatanRapat: string;
  penilaianMelemahkan: string;
  penilaianMenguatkan: string;
  keputusan: string;
  catatanTindakLanjut: string;
  komite: {
    ketua: string;
    anggota: string;
    notulen: string;
  };
}

export interface ReportData {
  // --- EXISTING KC FIELDS (DO NOT REMOVE) ---
  memberName?: string; // New: Nama Anggota (Searchable)
  ybsTimImage: string | null;
  ybsIstriImage: string | null;
  domisiliDepan: string | null;
  domisiliKanan: string | null;
  domisiliKiri: string | null;
  domisiliDalam: string | null;
  petaDomisili: string | null;
  jaminanTitle: string;
  jaminanDepan: string | null;
  jaminanKanan: string | null;
  jaminanKiri: string | null;
  jaminanDalam: string | null;
  petaJaminan: string | null;
  lokasiPembangunan: string | null; // Page 21
  petaLokasiPembangunan: string | null; // Page 22
  totalPinjaman: number;
  financialItems: FinancialItem[];
  dynamicPhotos: DynamicPhoto[]; // Used for extra photos in KC
  additionalInfo: string;

  // --- NEW KC FIELDS WITH ROTATION SUPPORT ---
  ybsTimPhoto?: DynamicPhoto;
  ybsIstriPhoto?: DynamicPhoto;
  domisiliDepanPhoto?: DynamicPhoto;
  domisiliKananPhoto?: DynamicPhoto;
  domisiliKiriPhoto?: DynamicPhoto;
  domisiliDalamPhoto?: DynamicPhoto;
  petaDomisiliPhoto?: DynamicPhoto;
  jaminanDepanPhoto?: DynamicPhoto;
  jaminanKananPhoto?: DynamicPhoto;
  jaminanKiriPhoto?: DynamicPhoto;
  jaminanDalamPhoto?: DynamicPhoto;
  petaJaminanPhoto?: DynamicPhoto;

  // --- NEW FIELDS FOR AREA REPORT ---
  areaAnalysis?: AreaAnalysisData;
  documentSections?: DocumentSection[]; // Flexible dynamic sections

  // --- NEW FIELDS FOR KC DYNAMIC SECTIONS ---
  kcSections?: KCDocumentSection[];
}

export const initialAreaAnalysis: AreaAnalysisData = {
  nomorBA: '',
  alamat: '',
  jumlahPengajuan: 0,
  tujuan: '',
  kelengkapan: {
    ktpPribadi: true,
    ktpPasangan: true,
    kartuKeluarga: true,
    npwp: false,
    bukuAnggotaPribadi: true,
    bukuAnggotaKeluarga: true,
    buktiPendapatan: true,
    fotocopyJaminan: true,
    petaTempatTinggal: true,
    petaUsaha: true,
    petaJaminan: true,
  },
  catatanRapat: '',
  penilaianMelemahkan: '',
  penilaianMenguatkan: '',
  keputusan: 'Disetujui sebesar Rp ',
  catatanTindakLanjut: '',
  komite: {
    ketua: '',
    anggota: '',
    notulen: ''
  }
};

// Helper to create IDs
const uid = () => Math.random().toString(36).substr(2, 9);

export const initialDocumentSections: DocumentSection[] = [
  {
    id: 'admin',
    title: '1. Dokumen Administratif',
    photos: [
      { id: uid(), title: 'Surat Pengantar', image: null, description: '' },
      { id: uid(), title: 'Surat Permohonan', image: null, description: '' },
    ]
  },
  {
    id: 'identity',
    title: '2. Dokumen Identitas',
    photos: [
      { id: uid(), title: 'KTP Nasabah', image: null, description: '' },
      { id: uid(), title: 'KTP Pasangan', image: null, description: '' },
    ]
  },
  {
    id: 'finance',
    title: '3. Dokumen Keuangan',
    photos: [
      { id: uid(), title: 'Scan Saldo Simpanan', image: null, description: '' },
    ]
  },
  {
    id: 'asset',
    title: '4. Dokumen Aset & Jaminan',
    photos: [
      { id: uid(), title: 'Foto SHM', image: null, description: '' },
    ]
  },
  {
    id: 'survey',
    title: '5. Foto Survey & Lokasi Fisik',
    photos: [
      { id: uid(), title: 'YBS & Tim Survey', image: null, description: '' },
      { id: uid(), title: 'YBS & Istri', image: null, description: '' },
      { id: uid(), title: 'Rumah (Tampak Depan)', image: null, description: '' },
      { id: uid(), title: 'Rumah (Tampak Kiri)', image: null, description: '' },
      { id: uid(), title: 'Rumah (Tampak Kanan)', image: null, description: '' },
      { id: uid(), title: 'Rumah (Tampak Dalam)', image: null, description: '' },
    ]
  },
  {
    id: 'peta',
    title: 'Peta Lokasi Domisili', // Number removed as requested
    photos: [
      { id: uid(), title: 'Peta Lokasi Domisili', image: null, description: '', displayMode: 'full' },
    ]
  },
  {
    id: 'jaminan',
    title: 'Foto Fisik Jaminan Tanah/Bangunan',
    photos: [
      { id: uid(), title: 'Tampak Depan', image: null, description: '' },
      { id: uid(), title: 'Tampak Kanan', image: null, description: '' },
      { id: uid(), title: 'Tampak Kiri', image: null, description: '' },
      { id: uid(), title: 'Peta Lokasi Jaminan', image: null, description: '' },
    ]
  },
];

export const initialKCSections: KCDocumentSection[] = [
  {
    id: 'kc-survey',
    title: '1. YBS & Tim Survey',
    sectionType: 'survey',
    photos: [
      { id: uid(), title: 'YBS & Tim', image: null, description: '', rotation: 0 },
      { id: uid(), title: 'YBS & Istri', image: null, description: '', rotation: 0 },
    ]
  },
  {
    id: 'kc-domisili',
    title: '2. Foto Domisili',
    sectionType: 'domisili',
    photos: [
      { id: uid(), title: 'Tampak Depan', image: null, description: '', rotation: 0 },
      { id: uid(), title: 'Tampak Kanan', image: null, description: '', rotation: 0 },
      { id: uid(), title: 'Tampak Kiri', image: null, description: '', rotation: 0 },
      { id: uid(), title: 'Tampak Dalam', image: null, description: '', rotation: 0 },
    ]
  },
  {
    id: 'kc-peta-domisili',
    title: '3. Peta Domisili',
    sectionType: 'peta-domisili',
    photos: [
      { id: uid(), title: 'Peta Lokasi', image: null, description: '', rotation: 0, displayMode: 'full' },
    ]
  },
  {
    id: 'kc-jaminan',
    title: '4. Foto Jaminan',
    sectionType: 'jaminan',
    photos: [
      { id: uid(), title: 'Tampak Depan', image: null, description: '', rotation: 0 },
      { id: uid(), title: 'Tampak Kanan', image: null, description: '', rotation: 0 },
      { id: uid(), title: 'Tampak Kiri', image: null, description: '', rotation: 0 },
      { id: uid(), title: 'Tampak Dalam', image: null, description: '', rotation: 0 },
    ]
  },
  {
    id: 'kc-peta-jaminan',
    title: '5. Peta Jaminan',
    sectionType: 'peta-jaminan',
    photos: [
      { id: uid(), title: 'Peta Lokasi Jaminan', image: null, description: '', rotation: 0, displayMode: 'full' },
    ]
  },
];

export const initialData: ReportData = {
  memberName: '',
  ybsTimImage: null,
  ybsIstriImage: null,
  domisiliDepan: null,
  domisiliKanan: null,
  domisiliKiri: null,
  domisiliDalam: null,
  petaDomisili: null,
  jaminanTitle: "FOTO JAMINAN BERUPA SERTIFIKAT TANAH KOSONG",
  jaminanDepan: null,
  jaminanKanan: null,
  jaminanKiri: null,
  jaminanDalam: null,
  petaJaminan: null,
  lokasiPembangunan: null,
  petaLokasiPembangunan: null,
  totalPinjaman: 250000000,
  financialItems: [
    { id: '1', name: 'Adm kredit dan materai', quantity: '', unit: '', price: 59000 },
    { id: '2', name: 'Jaspel', quantity: '', unit: '', price: 3750000 },
    { id: '3', name: 'Survei', quantity: '', unit: '', price: 350000 },
    { id: '4', name: 'Asuransi', quantity: '', unit: '', price: 4687500 },
    { id: '5', name: 'Dibawa pulang', quantity: '', unit: '', price: 241153500 },
  ],
  dynamicPhotos: [],
  additionalInfo: `Pengajuan an Suwaliyadi sebesar Rp 500.000.000 dengan tujuan pinjaman yang kan digunakan untuk membuka lahan sawit seluas 13 Ha.\nSHM an Suwaliyadi No. 00631 luas 1.406 M2 yang terletak di samping rumah tinggal ybs dengan nilai Rp 30.000.000.\nRiwayat pinjaman terakhir Rp. 300.000.000 dan lancar.`,

  // Initialize new KC photo objects
  ybsTimPhoto: { id: uid(), title: 'YBS & Tim', image: null, description: '', rotation: 0 },
  ybsIstriPhoto: { id: uid(), title: 'YBS & Istri', image: null, description: '', rotation: 0 },
  domisiliDepanPhoto: { id: uid(), title: 'Tampak Depan', image: null, description: '', rotation: 0 },
  domisiliKananPhoto: { id: uid(), title: 'Tampak Kanan', image: null, description: '', rotation: 0 },
  domisiliKiriPhoto: { id: uid(), title: 'Tampak Kiri', image: null, description: '', rotation: 0 },
  domisiliDalamPhoto: { id: uid(), title: 'Tampak Dalam', image: null, description: '', rotation: 0 },
  petaDomisiliPhoto: { id: uid(), title: 'Peta Lokasi', image: null, description: '', rotation: 0, displayMode: 'full' },
  jaminanDepanPhoto: { id: uid(), title: 'Tampak Depan', image: null, description: '', rotation: 0 },
  jaminanKananPhoto: { id: uid(), title: 'Tampak Kanan', image: null, description: '', rotation: 0 },
  jaminanKiriPhoto: { id: uid(), title: 'Tampak Kiri', image: null, description: '', rotation: 0 },
  jaminanDalamPhoto: { id: uid(), title: 'Tampak Dalam', image: null, description: '', rotation: 0 },
  petaJaminanPhoto: { id: uid(), title: 'Peta Lokasi Jaminan', image: null, description: '', rotation: 0, displayMode: 'full' },

  // Area Specific Initials
  areaAnalysis: initialAreaAnalysis,
  documentSections: initialDocumentSections,

  // NEW: For KC Dynamic Sections
  kcSections: initialKCSections,
};

// --- NEW TYPES FOR MULTI-USER SYSTEM ---

export type Role = 'ADMIN' | 'AK' | 'AO' | 'AM' | 'GM' | 'IT_SUPPORT' | 'AKA' | 'AKP';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED';
export type ReportType = 'KC' | 'AREA' | 'KP';
export type ReportStage = 'AK' | 'AKA' | 'AKP'; // Workflow Stage

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: Role;
  branchCode: string;
  areaCode: string;
}

export interface Report {
  id: string;
  aoId: string;
  aoName: string;
  branch: string;
  areaCode: string;
  createdAt: string;
  updatedAt: string;
  status: ReportStatus;
  reportType: ReportType;
  currentStage?: ReportStage; // New: Tracks workflow progress (default AK)
  correctionNotes?: string;
  assignedToId?: string;
  assignedToName?: string;
  viewedByAK?: boolean;
  isRevision?: boolean; // New: true when AO submits revised report
  data: ReportData;
}

export interface Branch {
  code: string;
}

export interface Area {
  code: string;
}
