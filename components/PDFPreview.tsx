
import React, { forwardRef } from 'react';
import { ReportData, DynamicPhoto, ReportType, initialAreaAnalysis, initialDocumentSections, initialKCSections } from '../types';

interface PDFPreviewProps {
  data: ReportData;
  reportType?: ReportType;
}

// Formatting helper
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

// Helper to chunk array for pagination
function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

interface PageProps {
  children: React.ReactNode;
  className?: string;
  reportType?: ReportType;
  pageNum?: string;
}

// A4 Page Container Component
const Page: React.FC<PageProps> = ({ children, className = "", reportType = 'KC', pageNum }) => (
  <div
    className={`pdf-page bg-white shadow-lg mx-auto mb-8 p-10 relative flex flex-col text-black ${className}`}
    style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always' }}
  >
    <div className="flex-1 flex flex-col h-full">
      {children}
    </div>
    {/* Page Footer */}
    <div className="mt-auto pt-2 border-t border-gray-300 flex justify-between text-[10px] text-gray-400 shrink-0">
      <span>{reportType === 'KC' ? 'Laporan Analisa KC' : 'Laporan Analisa Area/KP'}</span>
      <span>{pageNum ? `Halaman ${pageNum}` : 'Dokumen Rahasia'}</span>
    </div>
  </div>
);

interface PhotoContainerProps {
  title: string;
  src: string | null;
  description?: string;
  sizeMode?: 'default' | 'ktp' | 'full-fit' | 'ktp-grid';
  rotation?: number;
}

const PhotoContainer: React.FC<PhotoContainerProps> = ({ title, src, description, sizeMode = 'default', rotation = 0 }) => {
  // Styles for different modes
  const isKTP = sizeMode === 'ktp';
  const isKTPGrid = sizeMode === 'ktp-grid'; // New mode for grid layout
  const isFullFit = sizeMode === 'full-fit';

  // Constraint for rotated full-fit images to prevent page overflow
  // If rotated 90/270deg, the image Height becomes visual Width.
  // We must ensure this Height <= Page Inner Width (approx 188mm)
  // We also constrain Width <= Page Inner Height (approx 250mm) to prevent vertical overflow
  const isRotatedVertical = rotation % 180 !== 0;

  // Explicit constraints based on mode
  const defaultMaxHeight = '85mm'; // Safer height for 2-per-page (297mm - margins / 2) with headers
  const fullMaxHeight = '230mm';    // Safe height for 1-per-page

  const rotationStyle = {
    transform: `rotate(${rotation}deg)`,
    ...(isFullFit
      ? (isRotatedVertical ? { maxHeight: '170mm', maxWidth: '230mm' } : { maxHeight: fullMaxHeight, maxWidth: '170mm' })
      : (isRotatedVertical ? { maxHeight: '170mm', maxWidth: defaultMaxHeight } : { maxHeight: defaultMaxHeight }) // Restrict Default Mode
    )
  };

  return (
    <div className={`flex-1 flex flex-col border border-black min-h-0 ${isKTP ? 'flex-none' : ''}`}>
      {/* Title Header */}
      {(isFullFit && title) ? (
        <div className="w-full text-center border-b border-gray-300 pb-1 mb-2 font-bold uppercase text-[10px] bg-gray-50">
          {title}
        </div>
      ) : (
        title && !isFullFit && (
          <div className="bg-gray-100 p-1 font-bold text-[10px] border-b border-black text-center uppercase shrink-0">
            {title}
          </div>
        )
      )}

      <div className={`flex-1 bg-white p-1 relative overflow-hidden flex items-center justify-center ${isKTP || isKTPGrid ? 'min-h-[60mm]' : ''}`}>
        {src ? (
          <img
            src={src}
            style={rotationStyle}
            // Use w-auto h-auto to respect max-constraints set in style
            className={`
              object-contain 
              ${isKTP || isKTPGrid ? 'w-[100mm] h-[63mm]' : ''}
              w-auto h-auto
            `}
            alt={title || "Document"}
          />
        ) : (
          <div className="text-gray-300 text-[10px]">No Image</div>
        )}
      </div>

      {/* Description Footer */}
      {description && (
        <div className={`p-1 text-[9px] border-t border-gray-300 w-full text-left whitespace-pre-wrap ${isFullFit ? 'mt-2' : 'bg-gray-50 min-h-[20px] border-black'}`}>
          {description}
        </div>
      )}
    </div>
  );
};

// New Component for Full Page Photos (Simple Border, No Title Header - Like Peta Domisili)
const FullPagePhotoContainer: React.FC<{ src: string | null; rotation?: number; title?: string; description?: string }> = ({ src, rotation = 0, title, description }) => {
  // Constraint for rotated full-page images to prevent page overflow
  const isRotatedVertical = rotation % 180 !== 0;

  // STRICT constraints to ensure image never overflows page printable area
  // Printable width approx 170mm (210mm - 40mm margins)
  // Printable height approx 230mm (297mm - header/footer)
  const rotationStyle = {
    transform: `rotate(${rotation}deg)`,
    ...(isRotatedVertical ? {
      maxHeight: '170mm', // Visual Width on Page
      maxWidth: '230mm'   // Visual Height on Page
    } : {
      maxWidth: '170mm',  // Visual Width on Page
      maxHeight: '230mm'  // Visual Height on Page
    })
  };

  return (
    <div className="flex-1 border border-black p-2 bg-white min-h-0 flex flex-col items-center justify-center">
      {/* Title Header */}
      {title && (
        <div className="w-full text-center border-b border-gray-300 pb-1 mb-2 font-bold uppercase text-[10px]">
          {title}
        </div>
      )}

      {/* Image Area */}
      <div className="flex-1 flexible-photo-area flex items-center justify-center relative overflow-hidden w-full">
        {src ? (
          <img
            src={src}
            style={rotationStyle}
            className="w-full h-full object-contain"
            alt={title || "Full Page Document"}
          />
        ) : (
          <div className="text-gray-400">No Image</div>
        )}
      </div>

      {/* Description Footer */}
      {description && (
        <div className="mt-2 pt-1 border-t border-gray-300 text-[10px] w-full text-left whitespace-pre-wrap">
          {description}
        </div>
      )}
    </div>
  );
};

// Two Photos Vertical Component (Reused)
const TwoPhotoPage: React.FC<{ title1: string, src1: string | null, title2: string, src2: string | null, pageNum?: string }> = ({ title1, src1, title2, src2, pageNum }) => (
  <Page pageNum={pageNum}>
    <div className="flex-1 flex flex-col gap-4">
      <PhotoContainer title={title1} src={src1} />
      <PhotoContainer title={title2} src={src2} />
    </div>
  </Page>
);

const PDFPreview = forwardRef<HTMLDivElement, PDFPreviewProps>(({ data, reportType = 'KC' }, ref) => {
  const financialTotal = data.financialItems.reduce((sum, item) => sum + item.price, 0);

  // --- LOGIC FOR KANTOR CABANG REPORT (DYNAMIC SECTIONS) ---
  if (reportType === 'KC') {
    const sections = data.kcSections || initialKCSections;
    const dynamicChunks = chunkArray<DynamicPhoto>(data.dynamicPhotos, 2);

    return (
      <div ref={ref} className="print-container flex flex-col items-center bg-gray-500/50 p-8">


        {/* Dynamic KC Sections */}
        {sections.map((section, sectionIndex) => {
          const photosPerPage = section.sectionType.includes('peta') ? 1 : 2;
          const chunks = chunkArray(section.photos, photosPerPage);

          return chunks.map((chunk, chunkIndex) => (
            <Page key={`${section.id}-${chunkIndex}`}>
              {/* Add Main Title on the very first page of the first section */}
              {sectionIndex === 0 && chunkIndex === 0 && (
                <h1 className="text-xl font-bold border-b-2 border-black pb-2 mb-2 uppercase text-center shrink-0">
                  Laporan Analisa Kunjungan Calon Nasabah
                </h1>
              )}

              <h2 className="font-bold text-base mb-1 border-b border-gray-400 shrink-0 uppercase">
                {section.sectionType === 'jaminan' ? `${section.title.split('.')[0]}. ${data.jaminanTitle}` : section.title} {chunks.length > 1 ? `(${chunkIndex + 1}/${chunks.length})` : ''}
              </h2>

              <div className="flex-1 flex flex-col gap-4 min-h-0">
                {chunk.map((photo: DynamicPhoto) => {
                  const isFullPage = section.sectionType.includes('peta') || photo.displayMode === 'full';

                  if (isFullPage) {
                    return (
                      <FullPagePhotoContainer
                        key={photo.id}
                        src={photo.image}
                        rotation={photo.rotation}
                        title={photo.title}
                        description={photo.description}
                      />
                    );
                  }
                  return (
                    <PhotoContainer
                      key={photo.id}
                      title={photo.title}
                      src={photo.image}
                      description={photo.description}
                      rotation={photo.rotation}
                    />
                  );
                })}

                {/* Spacer for single photo in 2-photo layout to prevent stretching */}
                {photosPerPage === 2 && chunk.length === 1 && (
                  <div className="flex-1 border border-transparent p-2 min-h-0 invisible">
                    {/* Empty placeholder to take up space equivalent to a photo */}
                  </div>
                )}
              </div>
            </Page>
          ));
        })}

        {/* Financials & Info */}
        <Page>
          <div>
            <h2 className="font-bold text-base mb-1 border-b border-gray-400">6. RINCIAN PENGGUNAAN PINJAMAN</h2>
            <div className="border border-black text-xs">
              <div className="bg-yellow-100 font-bold text-center p-2 border-b border-black">RINCIAN PENGGUNAAN PINJAMAN YBS</div>
              <div className="flex justify-between font-bold bg-gray-50 p-2 border-b border-black">
                <span>Total Pinjaman</span><span>{formatCurrency(data.totalPinjaman)}</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px]">
                    <th className="border-r border-black p-1 w-8 text-center">No</th>
                    <th className="border-r border-black p-1">Nama</th>
                    <th className="border-r border-black p-1 w-24">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {data.financialItems.map((item, idx) => (
                    <tr key={item.id} className="border-t border-black text-[10px]">
                      <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                      <td className="border-r border-black p-1">{item.name}</td>
                      <td className="p-1 text-right">{formatCurrency(item.price)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-black bg-green-100 font-bold text-[10px]">
                    <td colSpan={2} className="border-r border-black p-1 text-center">Total</td>
                    <td className="p-1 text-right">{formatCurrency(financialTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Page>
        {/* Dynamic Photos */}
        {dynamicChunks.map((chunk, index) => (
          <Page key={`photos-${index}`}>
            <h2 className="font-bold text-base mb-1 border-b border-gray-400 uppercase shrink-0">
              7. FOTO TAMBAHAN {dynamicChunks.length > 1 ? `(${index + 1}/${dynamicChunks.length})` : ''}
            </h2>
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {chunk.map((photo: DynamicPhoto) => <PhotoContainer key={photo.id} title={photo.title || 'Tanpa Judul'} src={photo.image} description={photo.description} rotation={photo.rotation} />)}
            </div>
          </Page>
        ))}
        <Page>
          <h2 className="font-bold text-base mb-1 border-b border-gray-400 uppercase shrink-0">8. INFORMASI TAMBAHAN</h2>
          <div className="border border-black p-4 h-full">
            <ul className="list-disc pl-5 text-sm space-y-2 text-justify">
              {data.additionalInfo.split('\n').filter(line => line.trim() !== '').map((line, idx) => <li key={idx}>{line}</li>)}
            </ul>
          </div>
        </Page>
      </div>
    );
  }

  // --- LOGIC FOR AREA REPORT (NEW DYNAMIC LAYOUT) ---

  const sections = data.documentSections || initialDocumentSections;
  const areaData = data.areaAnalysis || initialAreaAnalysis;
  const dynamicExtraChunks = chunkArray(data.dynamicPhotos || [], 2);

  return (
    <div ref={ref} className="print-container flex flex-col items-center bg-gray-500/50 p-8">

      {/* 1. DYNAMIC DOCUMENT SECTIONS (Pages 1-3, 7-19, 23 in PDF) */}
      {(() => {
        // --- PRE-PROCESSING: Extract global KTPs ---
        const isKTP = (p: DynamicPhoto) => p.displayMode === 'ktp' || (p.title || '').toLowerCase().includes('ktp');

        const allKTPs: DynamicPhoto[] = [];
        const nonKtpSections = sections.map(sec => {
          const ktps = sec.photos.filter(p => isKTP(p));
          const nonKtps = sec.photos.filter(p => !isKTP(p));
          allKTPs.push(...ktps);
          return { ...sec, photos: nonKtps };
        });

        const ktpChunks = chunkArray(allKTPs, 8); // 8 KTPs per page (2 cols x 4 rows)

        return nonKtpSections.map((section) => {
          // If this is IDENTITY section, we inject the KTP pages here
          const isIdentitySection = section.id === 'identity';

          // Render Non-KTP photos of this section
          const fullPageSections = ['admin', 'identity', 'asset', 'peta']; // 'survey' and 'finance' excluded -> 2 per page
          const itemsPerPage = fullPageSections.includes(section.id) ? 1 : 2;
          const chunkedPhotos = chunkArray(section.photos, itemsPerPage);

          const standardPages = chunkedPhotos.map((chunk, chunkIdx) => {
            // Check if this chunk is a single "Full Page" item (e.g. Peta Domisili in Survey)
            // If so, we should NOT render the spacer, allowing it to flex-grow to full height
            const isSingleFullItem = chunk.length === 1 && (
              (chunk[0] as DynamicPhoto).displayMode === 'full' ||
              ((chunk[0] as DynamicPhoto).title || '').toLowerCase().includes('peta') ||
              ((chunk[0] as DynamicPhoto).title || '').toLowerCase().includes('kk')
            );

            return (
              <Page key={`${section.id}-${chunkIdx}`} reportType="AREA">
                <h2 className="font-bold text-lg mb-2 border-b border-black pb-1">
                  {section.title} {chunkedPhotos.length > 1 ? `(${chunkIdx + 1}/${chunkedPhotos.length})` : ''}
                </h2>
                <div className="flex-1 flex flex-col gap-4">
                  {chunk.map((photo: DynamicPhoto) => {
                    let sizeMode: 'default' | 'ktp' | 'full-fit' = 'default';
                    const lowerTitle = photo.title?.toLowerCase() || '';

                    // If it's a "Full Halaman" section (1 item per page) OR explicitly full/KK
                    if (itemsPerPage === 1 || photo.displayMode === 'full' || lowerTitle.includes('kartu keluarga') || lowerTitle.includes('kk')) {
                      sizeMode = 'full-fit';
                    }

                    if (sizeMode === 'full-fit') {
                      return (
                        <FullPagePhotoContainer
                          key={photo.id}
                          src={photo.image}
                          rotation={photo.rotation}
                          title={photo.title}
                          description={photo.description}
                        />
                      );
                    }

                    return (
                      <PhotoContainer
                        key={photo.id}
                        title={photo.title}
                        src={photo.image}
                        description={photo.description}
                        sizeMode={sizeMode}
                        rotation={photo.rotation}
                      />
                    );
                  })}
                  {/* Only render spacer if it's NOT a single full-page item */}
                  {itemsPerPage === 2 && chunk.length === 1 && !isSingleFullItem && <div className="flex-1 border border-transparent"></div>}
                </div>
              </Page>
            )
          });

          // If Identity Section, Append KTP Grid Pages
          const ktpPages = isIdentitySection ? ktpChunks.map((chunk, index) => (
            <Page key={`ktp-grid-${index}`} reportType="AREA">
              <h2 className="font-bold text-lg mb-4 border-b border-black pb-1">
                Dokumen Identitas (KTP) {ktpChunks.length > 1 ? `(${index + 1}/${ktpChunks.length})` : ''}
              </h2>
              <div className="flex-1 grid grid-cols-2 gap-4 content-start">
                {chunk.map((photo) => (
                  <PhotoContainer
                    key={photo.id}
                    title={photo.title}
                    src={photo.image}
                    description={photo.description}
                    sizeMode="ktp-grid" // Use new mode
                    rotation={photo.rotation}
                  />
                ))}
              </div>
            </Page>
          )) : [];

          return (
            <React.Fragment key={`sec-group-${section.id}`}>
              {standardPages}
              {ktpPages}
            </React.Fragment>
          );
        });
      })()}

      {/* 2. SURVEY & ASSET LOCATION PHOTOS (Pages 4, 5, 20, 22 in PDF) */}
      {/* 2. SURVEY & ASSET LOCATION PHOTOS MOVED TO DYNAMIC LOOP */}


      {/* JAMINAN FISIK (Page 20) MOVED TO DYNAMIC LOOP */}

      {data.lokasiPembangunan && (
        <>
          <Page reportType="AREA" pageNum="21a">
            <h2 className="font-bold text-lg mb-2 border-b border-black pb-1">9. Foto Rumah yang akan di bangun</h2>
            <div className="flex-1 flex flex-col gap-4">
              <FullPagePhotoContainer src={data.lokasiPembangunan} />
            </div>
          </Page>
          <Page reportType="AREA" pageNum="21b">
            <h2 className="font-bold text-lg mb-2 border-b border-black pb-1">Peta Lokasi Bangun</h2>
            <div className="flex-1 flex flex-col gap-4">
              <FullPagePhotoContainer src={data.petaLokasiPembangunan} />
            </div>
          </Page>
        </>
      )}

      {/* 3. FINANCIAL ANALYSIS (Page 24) */}
      <Page reportType="AREA" pageNum="24">
        <div>
          <h2 className="font-bold text-base mb-1 border-b border-gray-400">11. RINCIAN PENGGUNAAN PINJAMAN</h2>
          <div className="border border-black text-xs mb-6">
            <div className="bg-yellow-100 font-bold text-center p-2 border-b border-black">RINCIAN PENGGUNAAN PINJAMAN YBS</div>
            <div className="flex justify-between font-bold bg-gray-50 p-2 border-b border-black">
              <span>Total Pinjaman</span>
              <span>{formatCurrency(data.totalPinjaman)}</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px]">
                  <th className="border-r border-black p-1 w-8 text-center">No</th>
                  <th className="border-r border-black p-1">Nama</th>
                  <th className="border-r border-black p-1 w-20">Jumlah</th>
                  <th className="border-r border-black p-1 w-16">Satuan</th>
                  <th className="border-r border-black p-1 w-24">Harga Beli</th>
                  <th className="p-1 w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.financialItems.map((item) => (
                  <tr key={item.id} className="border-t border-black text-[10px]">
                    <td className="border-r border-black p-1 text-center">{item.id}</td>
                    <td className="border-r border-black p-1">{item.name}</td>
                    <td className="border-r border-black p-1">{item.quantity}</td>
                    <td className="border-r border-black p-1">{item.unit}</td>
                    <td className="border-r border-black p-1 text-right">{item.price > 0 ? formatCurrency(item.price).replace('Rp', '') : ''}</td>
                    <td className="p-1 text-right">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
                <tr className="border-t border-black bg-green-100 font-bold text-[10px]">
                  <td colSpan={5} className="border-r border-black p-1 text-center">Total</td>
                  <td className="p-1 text-right">{formatCurrency(financialTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="font-bold text-base mb-1 border-b border-gray-400">12. INFORMASI TAMBAHAN</h2>
          <div className="border border-black p-4 text-xs">
            <ul className="list-disc pl-5 space-y-1 text-justify">
              {data.additionalInfo.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </Page>

      {/* 4. EXTRA PHOTOS FOR AREA (NEW PAGE) */}
      {dynamicExtraChunks.map((chunk, index) => (
        <Page key={`extra-area-${index}`} reportType="AREA" pageNum={`Lampiran ${index + 1}`}>
          <h2 className="font-bold text-base mb-1 border-b border-gray-400 uppercase shrink-0">
            FOTO TAMBAHAN {dynamicExtraChunks.length > 1 ? `(${index + 1}/${dynamicExtraChunks.length})` : ''}
          </h2>
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {chunk.map((photo: DynamicPhoto) => (
              <PhotoContainer
                key={photo.id}
                title={photo.title || 'Tanpa Judul'}
                src={photo.image}
                description={photo.description}
                rotation={photo.rotation}
              />
            ))}
          </div>
        </Page>
      ))}

      {/* 5. COMMITTEE DECISION (Page 30) */}
      <Page reportType="AREA" pageNum="30">
        <div className="text-center mb-4">
          <h2 className="font-bold text-xs uppercase tracking-wider">Koperasi Simpan Pinjam Credit Union Pancur Solidaritas</h2>
          <p className="text-[10px] text-gray-600">Kantor Cabang Inhutani</p>
          <div className="border-b-2 border-black my-2"></div>
          <h1 className="font-bold text-lg uppercase underline">KEPUTUSAN RAPAT KREDIT KOMITE AREA</h1>
        </div>

        <div className="text-xs mb-4 grid grid-cols-[120px_10px_1fr] gap-y-1">
          <div>Tanggal</div><div>:</div><div>{new Date().toLocaleDateString('id-ID')}</div>
          <div>Nomor BA</div><div>:</div><div>{areaData.nomorBA}</div>
          <div>Alamat</div><div>:</div><div>{areaData.alamat}</div>
          <div>Jumlah Pengajuan</div><div>:</div><div>{formatCurrency(areaData.jumlahPengajuan)}</div>
          <div>Tujuan</div><div>:</div><div>{areaData.tujuan}</div>
        </div>

        <div className="mb-4">
          <h3 className="font-bold text-xs underline mb-2">Kelengkapan Pengajuan</h3>
          <div className="text-[10px] grid grid-cols-[20px_1fr_60px] gap-y-1">
            {Object.entries(areaData.kelengkapan).map(([key, val], idx) => (
              <React.Fragment key={key}>
                <div>{idx + 1}.</div>
                <div className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div>: {val ? 'Ada' : 'Tidak Ada'}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <h3 className="font-bold text-xs underline mb-1">Catatan Saat Rapat</h3>
          <p className="text-[10px] text-justify whitespace-pre-line">{areaData.catatanRapat}</p>
        </div>

        <div className="mb-2">
          <div className="text-[10px] grid grid-cols-[150px_10px_1fr]">
            <div>Penilaian Melemahkan</div><div>:</div><div>{areaData.penilaianMelemahkan}</div>
            <div>Penilaian Menguatkan</div><div>:</div><div>{areaData.penilaianMenguatkan}</div>
            <div className="mt-2 font-bold">Keputusan</div><div>:</div><div className="mt-2 font-bold">{areaData.keputusan}</div>
          </div>
        </div>

        <div className="mt-8 text-[10px]">
          <div className="font-bold mb-4">Komite</div>
          <div className="grid grid-cols-[100px_150px] gap-y-6">
            <div>Ketua</div><div>{areaData.komite.ketua}</div>
            <div>Anggota</div><div>{areaData.komite.anggota}</div>
            <div>Notulen</div><div>{areaData.komite.notulen}</div>
          </div>
        </div>
      </Page>

    </div>
  );
});

export default PDFPreview;
