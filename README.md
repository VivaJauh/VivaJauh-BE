# VivaJauh

who knows - Technoscape 2026

## Architecture

VivaJauh Backend menggunakan pendekatan Domain Driven Design (DDD) agar business logic koperasi dipisahkan per domain. Setiap modul utama di `src/modules` disusun dengan lapisan domain, application, infrastructure, dan presentation.

Pola ini dipakai untuk menjaga batas tanggung jawab fitur seperti auth, sync offline, tenant/koperasi, dana koperasi, pengajuan pinjaman, report, dan verification.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from the example:

```bash
cp .env.example .env
```

3. Update `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vivajauh
JWT_SECRET=change-this-for-local-dev
GEMINI_API_KEY=
```

4. Generate Prisma client:

```bash
npm run db:generate
```

5. Run database migrations:

```bash
npm run db:migrate
```

6. Seed local users:

```bash
npm run db:seed
```

7. Start development server:

```bash
npm run dev
```

Swagger documentation at `/docs`.

## Documentation

- [Backend ERD](https://drive.google.com/file/d/1CkiNKOCuk2zFM0qHUPQN46KPBZhrGoxo/view?usp=sharing)
