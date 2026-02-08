# DAKU (Digital Aplikasi Kunjungan)

"Datamu Dataku, aplikasi survey."

A web-based application for field report management (Laporan Kunjungan), designed for Account Officers (AO), Admins, and Management.

## 🚀 Status
- **Version**: 1.0 (Production Ready)
- **Database**: IndexedDB (Local Browser Storage) - *Migration to Supabase Planned*
- **Hosting**: Static Build (Vite/React)

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS / Vanilla CSS
- **Icons**: Lucide React
- **PDF Generation**: html2canvas + jsPDF + @embedpdf
- **Storage**: IndexedDB (Native Browser API)

## 📦 Installation & Dev

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## 🚢 Deployment
See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

## 🔮 Future Roadmap
- [ ] Migrate Database to Supabase (PostgreSQL)
- [ ] Implement Server-Side Auth
- [ ] Remove IndexedDB dependency
- [ ] Deploy to Vercel
