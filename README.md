# VivaJauh
who knows - Technoscape 2026

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