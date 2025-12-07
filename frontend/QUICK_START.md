# 🚀 Sui Risk Index - Quick Start Guide

## Hızlı Başlangıç

### 1. Development Server'ı Başlat

```bash
cd /root/projeler/ezgin/Sui/frontend
npm run dev
```

**VEYA**

```bash
./start-dev.sh
```

### 2. Tarayıcıda Aç

http://localhost:3000

---

## 📄 Sayfalar

| URL | Açıklama |
|-----|----------|
| `/` | Landing page - Proje tanıtımı |
| `/pools` | Havuz listesi ve risk skorları |
| `/pools/[id]` | Havuz detay sayfası |
| `/identity` | Risk Identity NFT mint |

---

## 🔌 Backend API

**Base URL:** http://45.9.30.42:8009

Backend'in çalıştığını kontrol et:
```bash
curl http://45.9.30.42:8009/
```

---

## 🎯 Demo Flow

1. **Landing'e git** → Proje özelliklerini gör
2. **"Explore Pools"** → Deepbook havuzlarını listele
3. **"Sync Pools from Deepbook"** → Backend'den havuzları çek
4. **"Sync All Metrics"** → Tüm risk skorlarını hesapla
5. **Bir havuza tıkla** → Detaylı metrikleri gör
6. **"Mint Risk Identity NFT"** → NFT mint flow'unu dene

---

## 🛠️ Yararlı Komutlar

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 📁 Önemli Dosyalar

| Dosya | Amaç |
|-------|------|
| `src/lib/config.ts` | Backend URL konfigürasyonu |
| `src/lib/api.ts` | API client |
| `src/lib/types.ts` | TypeScript tipleri |
| `src/app/page.tsx` | Landing page |
| `src/app/pools/page.tsx` | Pools listesi |
| `src/app/pools/[id]/page.tsx` | Pool detay |
| `src/app/identity/page.tsx` | NFT mint |

---

## ✅ Build Durumu

✓ TypeScript compilation: **BAŞARILI**
✓ ESLint: **BAŞARILI**
✓ Next.js build: **BAŞARILI**
✓ Production ready: **EVET**

---

## 🎨 Özellikler

- ✅ Responsive tasarım (mobile + desktop)
- ✅ Real-time risk scoring
- ✅ Pool metrikleri
- ✅ NFT mint flow
- ✅ Error handling
- ✅ Loading states
- ✅ Success/Error alerts
- ✅ Clean UI/UX

---

## 📞 Sorun Giderme

### Port 3000 kullanımda ise:

```bash
# Farklı portta çalıştır
PORT=3001 npm run dev
```

### Backend'e erişemiyorsanız:

`src/lib/config.ts` dosyasında API URL'i kontrol edin.

### Dependencies eksik ise:

```bash
npm install
```

---

**Hazır! 🎉**

Development server başlatıldığında http://localhost:3000 adresini ziyaret edin.
