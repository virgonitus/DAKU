
import React, { useRef, useState, useEffect } from 'react';
import { ReportData, FinancialItem, DynamicPhoto, DocumentSection, KCDocumentSection, initialData, ReportType, initialAreaAnalysis, initialDocumentSections, initialKCSections, User } from '../types';
import ImageInput from './ImageInput';
import PDFPreview from './PDFPreview';
import { db } from '../services/db';
import { Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, Send, Save, UserCheck, Printer } from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface ReportFormProps {
    initialValues?: ReportData;
    reportType?: ReportType;
    readOnly?: boolean;
    userAreaCode?: string; // Passed from parent to filter AK list
    userId?: string; // User ID for user-specific draft storage
    onSubmit?: (data: ReportData, assignedTo?: { id: string, name: string }) => void;
    onSaveDraft?: (data: ReportData) => void; // New: Save as Draft
    onDataChange?: (data: ReportData) => void; // Callback to notify parent of data changes
    isSubmitting?: boolean;
    onExportPDF: (ref: React.RefObject<HTMLDivElement>) => void;
    currentStatus?: string; // New: Pass current status to control button visibility
}

export default function ReportForm({
    initialValues,
    reportType = 'KC',
    readOnly = false,
    userAreaCode,
    userId,
    onSubmit,
    onSaveDraft,
    onDataChange,
    isSubmitting = false,
    onExportPDF,
    currentStatus
}: ReportFormProps) {
    const { showModal } = useModal();
    // Initialize with initialValues or defaults (we load draft progressively)
    const [data, setData] = useState<ReportData>(() => {
        const val = initialValues || initialData;
        return {
            ...val,
            areaAnalysis: val.areaAnalysis || initialAreaAnalysis,
            documentSections: val.documentSections || initialDocumentSections,
            dynamicPhotos: val.dynamicPhotos || [],
            kcSections: val.kcSections || initialKCSections
        };
    });

    const [isDraftLoading, setIsDraftLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Computed: Check if form has meaningful data (for disabling Simpan Dulu button)
    const isFormEmpty = (() => {
        const hasMemberName = data.memberName && data.memberName.trim().length > 0;
        const hasKCPhotos = data.kcSections?.some(s => s.photos.some(p => p.image));
        const hasDocPhotos = data.documentSections?.some(s => s.photos.some(p => p.image));
        const hasDynamicPhotos = data.dynamicPhotos?.some(p => p.image);
        return !hasMemberName && !hasKCPhotos && !hasDocPhotos && !hasDynamicPhotos;
    })();

    // Ref to track if the draft has been fully loaded AND merged into state
    // This prevents the autosave from running before the draft data is applied
    const hasDraftInitialized = useRef(false);

    // Load Draft from IndexedDB on Mount (Create Mode Only)
    useEffect(() => {


        if (!initialValues) {
            const loadDraft = async () => {

                try {
                    const savedDraft = await db.getDraft(userId || 'anonymous');
                    if (savedDraft) {

                        setData(prev => ({
                            ...prev,
                            ...savedDraft,
                            // Ensure merge robustness
                            areaAnalysis: savedDraft.areaAnalysis || prev.areaAnalysis,
                            documentSections: savedDraft.documentSections || prev.documentSections,
                            dynamicPhotos: savedDraft.dynamicPhotos || prev.dynamicPhotos,
                            kcSections: savedDraft.kcSections || prev.kcSections
                        }));

                    } else {

                    }
                } catch (e) {
                    console.error("[REPORTFORM] Failed to load draft", e);
                } finally {
                    setIsDraftLoading(false);
                    // Set hasDraftInitialized on the NEXT render cycle
                    // This ensures the state update from setData has been applied
                    setTimeout(() => {
                        hasDraftInitialized.current = true;

                    }, 100); // Small delay to ensure React state is committed
                }
            };
            loadDraft();
        } else {

            setIsDraftLoading(false);
            hasDraftInitialized.current = true; // Skip draft for edit mode
        }
    }, [initialValues]);

    // Autosave data to IndexedDB (Only in Create Mode AND after draft is fully initialized)
    // The hasDraftInitialized ref ensures we don't overwrite saved data with initial empty state
    useEffect(() => {
        if (!initialValues && hasDraftInitialized.current) {
            setSaveStatus('saving');
            db.saveDraft(userId || 'anonymous', data)
                .then(() => {
                    setSaveStatus('saved');
                    // Reset to idle after 2 seconds
                    setTimeout(() => setSaveStatus('idle'), 2000);
                })
                .catch(e => {
                    console.error("Autosave failed", e);
                    setSaveStatus('error');
                });
        }
    }, [data, initialValues]);

    // Ref to hold the current data for use in event listeners (avoids stale closures)
    const dataRef = useRef(data);
    useEffect(() => {
        dataRef.current = data;
        // Notify parent of data changes for auto-save on back button
        if (onDataChange) {
            onDataChange(data);
        }
    }, [data, onDataChange]);

    // Flag to bypass native beforeunload if user confirmed via custom popup
    const isReloadingRef = useRef(false);

    // Force save on page leave (beforeunload) or tab switch (visibilitychange)
    // Force save on page leave (beforeunload) or tab switch (visibilitychange)
    useEffect(() => {
        if (initialValues) return; // Skip for edit/review mode

        const saveNow = () => {
            if (hasDraftInitialized.current) {
                // Use synchronous IndexedDB write attempt
                try {
                    db.saveDraft(userId || 'anonymous', dataRef.current);

                } catch (e) {
                    console.error("Forced save failed", e);
                }
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // If we are reloading via our custom popup, don't show native dialog
            if (isReloadingRef.current) return;

            saveNow();
            // Show browser's native popup: "Reload site? Changes may not be saved."
            e.preventDefault();
            e.returnValue = 'Apakah anda yakin ingin mereload halaman? Datamu akan terhapus loh...';
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveNow();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for F5 or Ctrl+R (Cmd+R on Mac)
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
                e.preventDefault();
                showModal({
                    title: 'Reload Halaman?',
                    message: 'Kamu mau reload halaman? datamu akan terhapus loh',
                    type: 'confirm',
                    confirmLabel: 'Reload',
                    cancelLabel: 'Batal',
                    onConfirm: () => {
                        // User confirmed reload
                        isReloadingRef.current = true;
                        // For "Jika reload maka clean" - we SKIP saveNow()
                        window.location.reload();
                    }
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [initialValues, userId, showModal]);


    // AK Selection State
    const [availableAdmins, setAvailableAdmins] = useState<User[]>([]);
    const [selectedAdminId, setSelectedAdminId] = useState<string>('');

    // Section toggle state
    const [isMobilePreviewCollapsed, setIsMobilePreviewCollapsed] = useState(true); // Default collapsed on mobile
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        'admin': true,
        'identity': true,
        'finance': true,
        'asset': true,
        'photos-survey': true,
        'finance-analysis': true,
        'extra-photos': true
    });

    // Delete Modal State


    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialValues) {
            setData({
                ...initialValues,
                areaAnalysis: initialValues.areaAnalysis || initialAreaAnalysis,
                documentSections: initialValues.documentSections || initialDocumentSections,
                dynamicPhotos: initialValues.dynamicPhotos || []
            });
        }
    }, [initialValues]);

    // Fetch Available Admins based on Area Code
    useEffect(() => {
        const fetchAdmins = async () => {
            if (readOnly) return;
            const admins = await db.getUsers();
            // Filter: Only AK role
            // Optional: Filter by specific rules if needed
            let filteredAdmins = admins.filter(u => u.role === 'AK');

            // If userAreaCode is provided (AO's area), filter AKs by that area
            if (userAreaCode) {
                // filteredAdmins = filteredAdmins.filter(u => u.areaCode === userAreaCode);
                // Actually, let's allow all AKs for now or strictly filter?
                // Based on types.ts, AK handles specific areas.
                // Let's use the helper we created
                const areaAdmins = await db.getAdminsByArea(userAreaCode);
                if (areaAdmins.length > 0) {
                    filteredAdmins = areaAdmins;
                }
            }
            setAvailableAdmins(filteredAdmins);
        };
        fetchAdmins();
    }, [readOnly, userAreaCode]);

    const handleSubmit = () => {
        // Validate Member Name (Required for ALL report types)
        if (!data.memberName || data.memberName.trim().length === 0) {
            showModal({ title: 'Validasi Gagal', message: 'Nama Anggota / Nasabah wajib diisi.', type: 'error' });
            return;
        }

        // Validate Main Photo (YBS & Tim) checked via kcSections ONLY for KC reports
        if (reportType === 'KC') {
            const surveySection = data.kcSections?.find(s => s.id === 'kc-survey');
            const hasMainPhoto = surveySection?.photos.some(p => p.image);

            if (!hasMainPhoto) {
                showModal({ title: 'Validasi Gagal', message: 'Harap lengkapi foto utama (YBS & Tim) sebelum kirim.', type: 'error' });
                return;
            }
        }

        // Clear autosave before submit
        db.clearDraft(userId || 'anonymous');

        if (onSubmit) {
            onSubmit(data, selectedAdminId ? { id: selectedAdminId, name: availableAdmins.find(a => a.id === selectedAdminId)?.name || 'Admin' } : undefined);
        }
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    }

    const updateData = <K extends keyof ReportData>(key: K, value: ReportData[K]) => {
        if (readOnly) return;
        setData(prev => ({ ...prev, [key]: value }));
    };

    const updateAreaAnalysis = (field: keyof typeof initialAreaAnalysis, value: any) => {
        if (readOnly) return;
        setData(prev => ({
            ...prev,
            areaAnalysis: {
                ...(prev.areaAnalysis || initialAreaAnalysis),
                [field]: value
            }
        }));
    };

    // --- DELETE CONFIRMATION HANDLER ---
    // --- DELETE HANDLER (Refactored to use Global Modal) ---
    const performDelete = (sectionId: string | null, photoId: string, type: 'doc' | 'dynamic_extra') => {
        if (type === 'doc' && sectionId) {
            setData(prev => ({
                ...prev,
                documentSections: (prev.documentSections || initialDocumentSections).map(sec =>
                    sec.id === sectionId ? { ...sec, photos: sec.photos.filter(p => p.id !== photoId) } : sec
                )
            }));
        } else if (type === 'dynamic_extra') {
            setData(prev => ({ ...prev, dynamicPhotos: prev.dynamicPhotos.filter(p => p.id !== photoId) }));
        }
    };

    // --- DYNAMIC DOCUMENTS HANDLERS ---

    const updateDocPhoto = (sectionId: string, photoId: string, field: keyof DynamicPhoto, value: any) => {
        if (readOnly) return;
        setData(prev => ({
            ...prev,
            documentSections: (prev.documentSections || initialDocumentSections).map(sec =>
                sec.id === sectionId ? {
                    ...sec,
                    photos: sec.photos.map(p => p.id === photoId ? { ...p, [field]: value } : p)
                } : sec
            )
        }));
    };

    const addDocPhoto = (sectionId: string, displayMode: 'default' | 'ktp' | 'full' = 'default') => {
        if (readOnly) return;

        let title = 'Foto Baru';
        if (displayMode === 'ktp') title = 'KTP Baru';
        if (displayMode === 'full') title = 'Kartu Keluarga Baru';

        const newPhoto: DynamicPhoto = {
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            title,
            image: null,
            description: '',
            rotation: 0,
            displayMode
        };
        setData(prev => ({
            ...prev,
            documentSections: (prev.documentSections || initialDocumentSections).map(sec =>
                sec.id === sectionId ? { ...sec, photos: [...sec.photos, newPhoto] } : sec
            )
        }));
    };

    const removeDocPhoto = (e: React.MouseEvent, sectionId: string, photoId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (readOnly) return;

        showModal({
            title: 'Hapus Foto Layout?',
            message: 'Apakah Anda yakin ingin menghapus layout foto ini? Data yang sudah diisi akan hilang.',
            type: 'confirm',
            confirmLabel: 'Hapus',
            onConfirm: () => performDelete(sectionId, photoId, 'doc')
        });
    };

    const updateChecklist = (field: string, checked: boolean) => {
        if (readOnly) return;
        const currentChecklist = data.areaAnalysis?.kelengkapan || initialAreaAnalysis.kelengkapan;
        updateAreaAnalysis('kelengkapan', {
            ...currentChecklist,
            [field]: checked
        });
    };

    const updateCommittee = (field: string, value: string) => {
        if (readOnly) return;
        const currentKomite = data.areaAnalysis?.komite || initialAreaAnalysis.komite;
        updateAreaAnalysis('komite', {
            ...currentKomite,
            [field]: value
        });
    };

    // --- STANDARD FORM HANDLERS (KC) ---

    const updateFinancialItem = (id: string, field: keyof FinancialItem, value: any) => {
        if (readOnly) return;
        setData(prev => ({
            ...prev,
            financialItems: prev.financialItems.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const addFinancialItem = () => {
        if (readOnly) return;
        const newItem: FinancialItem = {
            id: (data.financialItems.length + 1).toString(),
            name: '',
            quantity: '',
            unit: '',
            price: 0
        };
        setData(prev => ({ ...prev, financialItems: [...prev.financialItems, newItem] }));
    };

    const removeFinancialItem = (id: string) => {
        if (readOnly) return;
        setData(prev => ({
            ...prev,
            financialItems: prev.financialItems.filter(item => item.id !== id)
        }));
    };

    // --- DYNAMIC PHOTOS HANDLERS (Manual/Extra Photos) ---

    const addDynamicPhoto = () => {
        if (readOnly) return;
        const newPhoto: DynamicPhoto = { id: Date.now().toString(), title: '', image: null, description: '' };
        setData(prev => ({ ...prev, dynamicPhotos: [...prev.dynamicPhotos, newPhoto] }));
    };

    const removeDynamicPhoto = (id: string) => {
        if (readOnly) return;
        showModal({
            title: 'Hapus Foto Manual?',
            message: 'Apakah Anda yakin ingin menghapus foto tambahan ini?',
            type: 'confirm',
            confirmLabel: 'Hapus',
            onConfirm: () => performDelete(null, id, 'dynamic_extra')
        });
    };

    const updateDynamicPhoto = (id: string, field: keyof DynamicPhoto, value: any) => {
        if (readOnly) return;
        setData(prev => ({ ...prev, dynamicPhotos: prev.dynamicPhotos.map(p => p.id === id ? { ...p, [field]: value } : p) }));
    };

    // --- KC PHOTO HELPERS (NEW) ---
    const updateKCPhoto = (photoKey: keyof ReportData, field: keyof DynamicPhoto, value: any) => {
        if (readOnly) return;
        setData(prev => {
            const currentPhoto = prev[photoKey] as DynamicPhoto | undefined;
            if (!currentPhoto) {
                // Initialize if it doesn't exist (for backward compatibility)
                const newPhoto: DynamicPhoto = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 5),
                    title: '',
                    image: null,
                    description: '',
                    rotation: 0
                };
                return { ...prev, [photoKey]: { ...newPhoto, [field]: value } };
            }
            return { ...prev, [photoKey]: { ...currentPhoto, [field]: value } };
        });
    };

    const getKCPhoto = (photoKey: keyof ReportData): DynamicPhoto => {
        const photo = data[photoKey] as DynamicPhoto | undefined;
        if (photo) return photo;
        // Return default photo object for backward compatibility
        return {
            id: Date.now().toString(),
            title: '',
            image: null,
            description: '',
            rotation: 0
        };
    };

    // --- KC SECTION HELPERS (DYNAMIC SECTIONS) ---
    const updateKCSectionPhoto = (sectionId: string, photoId: string, field: keyof DynamicPhoto, value: any) => {
        if (readOnly) return;
        setData(prev => ({
            ...prev,
            kcSections: (prev.kcSections || initialKCSections).map(sec =>
                sec.id === sectionId ? {
                    ...sec,
                    photos: sec.photos.map(p => p.id === photoId ? { ...p, [field]: value } : p)
                } : sec
            )
        }));
    };

    const addKCSectionPhoto = (sectionId: string) => {
        if (readOnly) return;

        // Find the section to determine display mode
        const section = (data.kcSections || initialKCSections).find(s => s.id === sectionId);
        const isPetaSection = section?.sectionType.includes('peta') || false;

        const newPhoto: DynamicPhoto = {
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            title: 'Foto Baru',
            image: null,
            description: '',
            rotation: 0,
            displayMode: isPetaSection ? 'full' : 'default' // Set displayMode based on section type
        };
        setData(prev => ({
            ...prev,
            kcSections: (prev.kcSections || initialKCSections).map(sec =>
                sec.id === sectionId ? { ...sec, photos: [...sec.photos, newPhoto] } : sec
            )
        }));
    };

    const removeKCSectionPhoto = (sectionId: string, photoId: string) => {
        showModal({
            title: 'Hapus Foto Layout?',
            message: 'Apakah Anda yakin ingin menghapus layout foto ini?',
            type: 'confirm',
            confirmLabel: 'Hapus',
            onConfirm: () => {
                setData(prev => ({
                    ...prev,
                    kcSections: (prev.kcSections || initialKCSections).map(sec =>
                        sec.id === sectionId ? { ...sec, photos: sec.photos.filter(p => p.id !== photoId) } : sec
                    )
                }));
            }
        });
    };

    // --- RENDER FUNCTIONS ---

    const renderStandardKCForm = () => {
        const sections = data.kcSections || initialKCSections;

        return (
            <>
                {/* Dynamic KC Sections */}
                {sections.map((section) => (
                    <section key={section.id} className="space-y-4">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 text-blue-800">
                            {section.title}
                        </h2>

                        {/* Jaminan Title if section is jaminan */}
                        {section.sectionType === 'jaminan' && (
                            <div className="flex flex-col gap-2 mb-2">
                                <label className="text-xs font-semibold uppercase text-gray-600">Judul Jaminan</label>
                                <input
                                    type="text"
                                    className="border p-2 rounded w-full text-sm"
                                    value={data.jaminanTitle}
                                    onChange={(e) => updateData('jaminanTitle', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        )}

                        <div className={`grid ${section.sectionType.includes('peta') ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                            {section.photos.map((photo) => (
                                <div key={photo.id} className="relative group/wrapper bg-gray-50 p-2 rounded border border-dashed border-gray-300">
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => removeKCSectionPhoto(section.id, photo.id)}
                                            className="absolute -top-3 -right-2 z-[60] bg-white text-red-600 rounded-full p-1.5 shadow-md border border-red-200 hover:bg-red-600 hover:text-white transition-all"
                                            title="Hapus Layout Foto Ini"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <ImageInput
                                        label={photo.title}
                                        imageSrc={photo.image}
                                        description={photo.description}
                                        rotation={photo.rotation}
                                        aspectRatio={section.sectionType.includes('peta') ? 'portrait' : 'landscape'}
                                        onImageChange={(v) => updateKCSectionPhoto(section.id, photo.id, 'image', v)}
                                        onLabelChange={(txt) => updateKCSectionPhoto(section.id, photo.id, 'title', txt)}
                                        onDescriptionChange={(txt) => updateKCSectionPhoto(section.id, photo.id, 'description', txt)}
                                        onRotationChange={(r) => updateKCSectionPhoto(section.id, photo.id, 'rotation', r)}
                                        readOnly={readOnly}
                                    />
                                </div>
                            ))}

                            {/* Add Photo Button */}
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => addKCSectionPhoto(section.id)}
                                    className="flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-blue-500"
                                >
                                    <Plus size={32} className="mb-2" />
                                    <span className="text-sm font-semibold">Tambah Layout Foto</span>
                                </button>
                            )}
                        </div>
                    </section>
                ))}

                {/* Section 6 Input */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold border-b border-gray-200 pb-2 text-blue-800">6. Rincian Keuangan</h2>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase text-gray-600">Total Pinjaman (Rp)</label>
                        <input
                            type="number"
                            className="border p-2 rounded w-full"
                            value={data.totalPinjaman}
                            onChange={(e) => updateData('totalPinjaman', parseFloat(e.target.value) || 0)}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        {data.financialItems.map((item, index) => (
                            <div key={item.id} className="flex gap-2 items-end border p-2 rounded bg-gray-50">
                                <div className="w-8 text-center font-bold text-gray-400">{index + 1}</div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase text-gray-500 block">Nama</label>
                                    <input className="border p-1 w-full text-sm rounded" value={item.name} onChange={(e) => updateFinancialItem(item.id, 'name', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] uppercase text-gray-500 block">Harga/Total</label>
                                    <input className="border p-1 w-full text-sm rounded text-right" type="number" value={item.price} onChange={(e) => updateFinancialItem(item.id, 'price', parseFloat(e.target.value) || 0)} disabled={readOnly} />
                                </div>
                                {!readOnly && (
                                    <button onClick={() => removeFinancialItem(item.id)} className="text-red-500 p-1 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))}
                        {!readOnly && (
                            <button onClick={addFinancialItem} className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded hover:bg-blue-50 flex items-center justify-center gap-2"><Plus size={16} /> Add Row</button>
                        )}
                    </div>
                </section>

                {/* Section 7 Input (Dynamic) */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold border-b border-gray-200 pb-2 text-blue-800">7. Foto Tambahan</h2>
                    <div className="space-y-6">
                        {data.dynamicPhotos.map((photo, index) => (
                            <div key={photo.id} className="border p-4 rounded bg-gray-50 relative">
                                {!readOnly && (
                                    <button type="button" onClick={() => removeDynamicPhoto(photo.id)} className="absolute top-2 right-2 text-red-500 hover:bg-red-100 p-1 rounded-full"><Trash2 size={16} /></button>
                                )}
                                <div className="mb-2">
                                    <label className="text-xs font-semibold uppercase text-gray-600 block mb-1">Judul Foto</label>
                                    <input className="border p-2 rounded w-full text-sm" value={photo.title} onChange={(e) => updateDynamicPhoto(photo.id, 'title', e.target.value)} disabled={readOnly} placeholder={`Contoh: Tampak Belakang...`} />
                                </div>
                                <ImageInput label={`Foto ${index + 1}`} imageSrc={photo.image} onImageChange={(v) => updateDynamicPhoto(photo.id, 'image', v)} />
                            </div>
                        ))}
                        {!readOnly && (
                            <button type="button" onClick={addDynamicPhoto} className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-500 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 font-semibold"><Plus size={20} /> Tambah Foto</button>
                        )}
                    </div>
                </section>
            </>
        );
    };

    const SectionHeader = ({ title, id }: { title: string, id: string }) => (
        <button
            type="button"
            onClick={() => toggleSection(id)}
            className="w-full flex justify-between items-center text-lg font-bold border-b-2 border-gray-200 pb-2 mb-4 text-blue-800 hover:text-blue-600 transition-colors"
        >
            {title}
            {openSections[id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
    );

    const renderAreaDynamicForm = () => {
        const areaData = data.areaAnalysis || initialAreaAnalysis;
        return (
            <div className="space-y-8">
                {/* ... Existing Dynamic Form Code ... */}
                {data.documentSections?.map((section) => (
                    <section key={section.id} className="mb-6">
                        <SectionHeader title={section.title} id={section.id} />
                        {openSections[section.id] && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {section.photos.map((photo) => (
                                        <div key={photo.id} className="relative group/wrapper bg-gray-50 p-2 rounded border border-dashed border-gray-300 mt-2">
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => removeDocPhoto(e, section.id, photo.id)}
                                                    className="absolute -top-3 -right-2 z-[60] bg-white text-red-600 rounded-full p-1.5 shadow-md border border-red-200 hover:bg-red-600 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                                                    title="Hapus Layout Foto Ini"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <ImageInput
                                                label={photo.title}
                                                imageSrc={photo.image}
                                                description={photo.description}
                                                onImageChange={(v) => updateDocPhoto(section.id, photo.id, 'image', v)}
                                                onLabelChange={(txt) => updateDocPhoto(section.id, photo.id, 'title', txt)}
                                                onDescriptionChange={(txt) => updateDocPhoto(section.id, photo.id, 'description', txt)}
                                                readOnly={readOnly}
                                                // Rotation and Mode props
                                                rotation={photo.rotation || 0}
                                                onRotationChange={(r) => updateDocPhoto(section.id, photo.id, 'rotation', r)}
                                                aspectRatio={photo.displayMode === 'ktp' ? 'landscape' : 'portrait'}
                                            />
                                        </div>
                                    ))}

                                    {!readOnly && (
                                        section.id === 'identity' ? (
                                            <div className="flex flex-col gap-2 h-full min-h-[200px]">
                                                <button
                                                    type="button"
                                                    onClick={() => addDocPhoto(section.id, 'ktp')}
                                                    className="flex-1 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 text-blue-500 font-semibold flex flex-col items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Plus size={24} />
                                                    <span>Tambah KTP</span>
                                                    <span className="text-[10px] text-gray-400 font-normal">(Ukuran Kartu)</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => addDocPhoto(section.id, 'full')}
                                                    className="flex-1 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50 text-green-600 font-semibold flex flex-col items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Plus size={24} />
                                                    <span>Tambah KK</span>
                                                    <span className="text-[10px] text-gray-400 font-normal">(Full Halaman)</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => addDocPhoto(section.id)}
                                                className="flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-400 hover:text-blue-500"
                                            >
                                                <Plus size={32} className="mb-2" />
                                                <span className="text-sm font-semibold">Tambah Layout Foto</span>
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                ))}

                {/* SECTION 4 MOVED TO DYNAMIC - SECTION 5 NOW DYNAMIC */}

                {/* SECTION 6: FINANCIAL ANALYSIS */}

                {/* SECTION 6: FINANCIAL ANALYSIS */}
                <section>
                    <SectionHeader title="6. Rincian & Analisa Keuangan" id="finance-analysis" />
                    {
                        openSections['finance-analysis'] && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold uppercase text-gray-600">Total Pinjaman (Rp)</label>
                                    <input
                                        type="number"
                                        className="border p-2 rounded w-full"
                                        value={data.totalPinjaman}
                                        onChange={(e) => updateData('totalPinjaman', parseFloat(e.target.value) || 0)}
                                        disabled={readOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    {data.financialItems.map((item, index) => (
                                        <div key={item.id} className="flex gap-2 items-end border p-2 rounded bg-gray-50">
                                            <div className="w-8 text-center font-bold text-gray-400">{index + 1}</div>
                                            <div className="flex-1">
                                                <input className="border p-1 w-full text-sm rounded"
                                                    value={item.name} onChange={(e) => updateFinancialItem(item.id, 'name', e.target.value)} disabled={readOnly} />
                                            </div>
                                            <div className="w-24">
                                                <input className="border p-1 w-full text-sm rounded text-right" type="number"
                                                    value={item.price} onChange={(e) => updateFinancialItem(item.id, 'price', parseFloat(e.target.value) || 0)} disabled={readOnly} />
                                            </div>
                                            {!readOnly && (
                                                <button type="button" onClick={() => removeFinancialItem(item.id)} className="text-red-500 p-1 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    ))}
                                    {!readOnly && (
                                        <button type="button" onClick={addFinancialItem} className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded hover:bg-blue-50 flex items-center justify-center gap-2"><Plus size={16} /> Add Row</button>
                                    )}
                                </div>

                                <div className="mt-4">
                                    <label className="text-xs font-semibold uppercase text-gray-600 block mb-1">Informasi Tambahan / Analisa</label>
                                    <textarea
                                        className="w-full h-32 border p-3 rounded text-sm font-mono"
                                        value={data.additionalInfo}
                                        onChange={(e) => updateData('additionalInfo', e.target.value)}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        )
                    }
                </section >

                {/* SECTION 7: EXTRA PHOTOS */}
                < section className="border-t-2 border-dashed pt-4 mt-4" >
                    <SectionHeader title="7. Foto Tambahan (Manual)" id="extra-photos" />
                    {
                        openSections['extra-photos'] && (
                            <div className="space-y-6">
                                <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                                    Bagian ini opsional. Gunakan jika ingin menambahkan foto bebas di luar kategori dokumen di atas. Foto ini akan muncul sebelum halaman keputusan komite.
                                </p>
                                {data.dynamicPhotos.map((photo, index) => (
                                    <div key={photo.id} className="border p-4 rounded bg-gray-50 relative group">
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => removeDynamicPhoto(photo.id)}
                                                className="absolute top-2 right-2 text-red-500 bg-white border border-red-200 hover:bg-red-100 p-1 rounded-full shadow-sm"
                                                title="Hapus Foto Ini"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <div className="mb-2">
                                            <label className="text-xs font-semibold uppercase text-gray-600 block mb-1">Judul Foto</label>
                                            <input
                                                className="border p-2 rounded w-full text-sm"
                                                value={photo.title}
                                                onChange={(e) => updateDynamicPhoto(photo.id, 'title', e.target.value)}
                                                disabled={readOnly}
                                                placeholder={`Contoh: Tampak Samping...`}
                                            />
                                        </div>
                                        <ImageInput
                                            label={`Foto ${index + 1}`}
                                            imageSrc={photo.image}
                                            onImageChange={(v) => updateDynamicPhoto(photo.id, 'image', v)}
                                            description={photo.description}
                                            onDescriptionChange={(v) => updateDynamicPhoto(photo.id, 'description', v)}
                                        />
                                    </div>
                                ))}
                                {!readOnly && (
                                    <button type="button" onClick={addDynamicPhoto} className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-500 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 font-semibold">
                                        <Plus size={20} /> Tambah Foto Manual
                                    </button>
                                )}
                            </div>
                        )
                    }
                </section >

                {/* Area Analysis Form (Committee Decision) */}
                < div className="mt-8 border-t-4 border-purple-100 pt-6" >
                    <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                        <span className="bg-purple-100 p-1 rounded">KP</span> Analisa Komite Area
                    </h2>
                    <section className="bg-white p-4 rounded-lg border shadow-sm mb-4">
                        <h3 className="font-bold text-lg mb-3 border-b pb-2">Informasi Rapat Komite</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nomor BA</label>
                                <input type="text" className="w-full border p-2 rounded text-sm"
                                    value={areaData.nomorBA} onChange={e => updateAreaAnalysis('nomorBA', e.target.value)} disabled={readOnly} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Jumlah Pengajuan</label>
                                <input type="number" className="w-full border p-2 rounded text-sm"
                                    value={areaData.jumlahPengajuan} onChange={e => updateAreaAnalysis('jumlahPengajuan', parseFloat(e.target.value))} disabled={readOnly} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Alamat</label>
                                <input type="text" className="w-full border p-2 rounded text-sm"
                                    value={areaData.alamat} onChange={e => updateAreaAnalysis('alamat', e.target.value)} disabled={readOnly} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Tujuan Pinjaman</label>
                                <input type="text" className="w-full border p-2 rounded text-sm"
                                    value={areaData.tujuan} onChange={e => updateAreaAnalysis('tujuan', e.target.value)} disabled={readOnly} />
                            </div>
                        </div>
                    </section>
                    {/* ... Checklist & Decision ... */}
                    <section className="bg-white p-4 rounded-lg border shadow-sm mb-4">
                        <h3 className="font-bold text-lg mb-3 border-b pb-2">Checklist Kelengkapan</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                                { id: 'ktpPribadi', label: '1. KTP Pribadi' },
                                { id: 'ktpPasangan', label: '2. KTP Pasangan' },
                                { id: 'kartuKeluarga', label: '3. Kartu Keluarga' },
                                { id: 'npwp', label: '4. Nomor Pokok Wajib Pajak' },
                                { id: 'bukuAnggotaPribadi', label: '5. Buku Anggota Pribadi' },
                                { id: 'bukuAnggotaKeluarga', label: '6. Buku Anggota Keluarga' },
                                { id: 'buktiPendapatan', label: '7. Bukti Pendapatan' },
                                { id: 'fotocopyJaminan', label: '8. Bukti Jaminan' },
                                { id: 'petaTempatTinggal', label: '9. Peta Tempat Tinggal' },
                                { id: 'petaUsaha', label: '10. Peta Usaha' },
                                { id: 'petaJaminan', label: '11. Peta Jaminan' },
                            ].map((item) => (
                                <label key={item.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded"
                                        checked={areaData.kelengkapan[item.id as keyof typeof areaData.kelengkapan]}
                                        onChange={(e) => updateChecklist(item.id, e.target.checked)}
                                        disabled={readOnly}
                                    />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white p-4 rounded-lg border shadow-sm mb-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <h3 className="font-bold text-sm mb-1">Catatan Saat Rapat</h3>
                                <textarea className="w-full border p-2 rounded text-sm h-24"
                                    value={areaData.catatanRapat} onChange={e => updateAreaAnalysis('catatanRapat', e.target.value)} disabled={readOnly} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm mb-1 text-red-600">Penilaian Melemahkan</h3>
                                <textarea className="w-full border p-2 rounded text-sm h-24"
                                    value={areaData.penilaianMelemahkan} onChange={e => updateAreaAnalysis('penilaianMelemahkan', e.target.value)} disabled={readOnly} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm mb-1 text-green-600">Penilaian Menguatkan</h3>
                                <textarea className="w-full border p-2 rounded text-sm h-24"
                                    value={areaData.penilaianMenguatkan} onChange={e => updateAreaAnalysis('penilaianMenguatkan', e.target.value)} disabled={readOnly} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm mb-1 bg-blue-50 p-1">Keputusan Komite</h3>
                                <textarea className="w-full border p-2 rounded text-sm h-20 font-bold text-gray-700"
                                    value={areaData.keputusan} onChange={e => updateAreaAnalysis('keputusan', e.target.value)} disabled={readOnly} />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="font-bold text-lg mb-3 border-b pb-2">Tanda Tangan Komite</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Ketua</label>
                                <input type="text" className="w-full border p-2 rounded text-sm"
                                    value={areaData.komite.ketua} onChange={e => updateCommittee('ketua', e.target.value)} disabled={readOnly} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Anggota</label>
                                <input type="text" className="w-full border p-2 rounded text-sm"
                                    value={areaData.komite.anggota} onChange={e => updateCommittee('anggota', e.target.value)} disabled={readOnly} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Notulen</label>
                                <input type="text" className="w-full border p-2 rounded text-sm"
                                    value={areaData.komite.notulen} onChange={e => updateCommittee('notulen', e.target.value)} disabled={readOnly} />
                            </div>
                        </div>
                    </section>
                </div >
            </div >
        );
    }

    return (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full relative">

            {/* Left Side: Input Form */}
            <div className="w-full md:w-5/12 flex-1 md:flex-none md:h-full overflow-y-auto p-6 border-r border-gray-300 bg-white shadow-inner relative">
                <div className="max-w-xl mx-auto space-y-8 pb-20">

                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center mb-6">
                        <span className="text-sm font-bold text-blue-800 uppercase tracking-wide">
                            Formulir {reportType === 'KC' ? 'Laporan KC' : 'Analisa Area/KP'}
                        </span>
                    </div>

                    {/* Member Name Input (Searchable) - Shared across all forms */}
                    <section className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold uppercase text-blue-800">Nama Anggota / Nasabah</label>
                            <input
                                type="text"
                                className="border-2 border-blue-200 p-2 rounded w-full text-lg font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                value={data.memberName || ''}
                                onChange={(e) => updateData('memberName', e.target.value)}
                                placeholder="Masukan nama lengkap anggota..."
                                disabled={readOnly}
                            />
                            <p className="text-xs text-blue-600 italic">*Nama ini akan digunakan untuk pencarian data.</p>
                        </div>
                    </section>

                    {reportType === 'KC' ? renderStandardKCForm() : renderAreaDynamicForm()}

                    {reportType === 'KC' && (
                        <section className="space-y-4">
                            <h2 className="text-lg font-bold border-b border-gray-200 pb-2 text-blue-800">
                                8. Informasi Tambahan
                            </h2>
                            <textarea
                                className="w-full h-48 border p-3 rounded text-sm font-mono"
                                value={data.additionalInfo}
                                onChange={(e) => updateData('additionalInfo', e.target.value)}
                                disabled={readOnly}
                                placeholder="Enter details here (each line will be a bullet point)..."
                            />
                        </section>
                    )}

                    {!readOnly && onSubmit && (
                        <div className="mt-8 space-y-3">

                            {/* ADMIN SELECTION DROPDOWN */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                                    <UserCheck size={18} /> Pilih Admin Kredit Penerima
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full p-3 border border-blue-300 rounded bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                        value={selectedAdminId}
                                        onChange={(e) => setSelectedAdminId(e.target.value)}
                                    >
                                        <option value="" disabled>-- Pilih Admin Kredit (Area {userAreaCode}) --</option>
                                        {availableAdmins.map(admin => (
                                            <option key={admin.id} value={admin.id}>
                                                {admin.name} ({admin.id})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-blue-600">
                                        <ChevronDown size={20} />
                                    </div>
                                </div>
                                {availableAdmins.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2">*Tidak ditemukan Admin Kredit di Area {userAreaCode}. Hubungi IT.</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                {/* Autosave Indicator */}
                                {!initialValues && (
                                    <div className="flex justify-end pr-2">
                                        {saveStatus === 'saving' && <span className="text-xs text-blue-500 animate-pulse">Menyimpan data...</span>}
                                        {saveStatus === 'saved' && <span className="text-xs text-green-600">Data tersimpan otomatis</span>}
                                        {saveStatus === 'error' && <span className="text-xs text-red-500">Gagal menyimpan data autosave</span>}
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !selectedAdminId}
                                    className={`w-full text-white py-3 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${reportType === 'AREA' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {isSubmitting ? 'Mengirim Data...' : reportType === 'AREA' ? (
                                        <>
                                            <Send size={20} /> KIRIM KE ADMIN KREDIT
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} /> SIMPAN & KIRIM
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating Save Draft Button */}
                    {!readOnly && onSaveDraft && (currentStatus === undefined || currentStatus === 'DRAFT' || currentStatus === 'RETURNED') && (
                        <button
                            type="button"
                            onClick={() => onSaveDraft(data)}
                            disabled={isSubmitting || isFormEmpty}
                            className={`fixed bottom-6 left-6 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 z-50 transition-all ${isFormEmpty ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 hover:scale-105'} disabled:opacity-50`}
                            title={isFormEmpty ? 'Isi data terlebih dahulu sebelum menyimpan' : 'Simpan sebagai draft'}
                        >
                            <Save size={20} /> Simpan Dulu
                        </button>
                    )}
                </div>
            </div>

            {/* Right Side: Live Preview */}
            <div className={`w-full md:w-7/12 bg-gray-500 overflow-y-auto flex flex-col items-center transition-all duration-300 ease-in-out ${isMobilePreviewCollapsed ? 'h-12 md:h-full overflow-hidden' : 'h-[500px] md:h-full'}`}>
                {/* Mobile Toggle Header */}
                <div
                    className="w-full bg-gray-800 text-white p-3 flex justify-between items-center cursor-pointer md:hidden sticky top-0 z-50 shadow-md"
                    onClick={() => setIsMobilePreviewCollapsed(!isMobilePreviewCollapsed)}
                >
                    <span className="font-bold text-sm tracking-wide">
                        {isMobilePreviewCollapsed ? 'Show PDF Preview' : 'Hide PDF Preview'}
                    </span>
                    <button className="p-1 bg-gray-700 rounded-full">
                        {isMobilePreviewCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                <div className="p-8 w-full flex justify-center">
                    <div className="relative w-full max-w-[210mm]">
                        <div className="shadow-2xl">
                            <PDFPreview ref={printRef} data={data} reportType={reportType} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}

        </div>
    );
}
