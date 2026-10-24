# Klip Server

REST API for **Klip**, a private ledger for the money and favours you have given to people. Keep track. Keep it fair.

- **Live app:** https://klip-client.vercel.app
- **API base URL:** https://klip-server.onrender.com
- **Client repo:** https://github.com/aradhy404/KLIP-CLIENT
- **Docs:** [`docs/PRD.md`](../docs/PRD.md), [`docs/BACKEND.md`](../docs/BACKEND.md)

> The API runs on a free Render instance. After inactivity the first request can take about 50 seconds while it wakes up.

## How it works

You record something you gave (money or a favour) against someone's phone number. If they are on Klip, the entry appears for them to confirm or dispute. If they are not, it attaches automatically when they register with that number. Only the two people on an entry can see it.

## Tech stack

Node.js (ES modules), Express 5, PostgreSQL (Neon), `pg`, JWT, bcrypt, `express-rate-limit`, `cors`.

## Getting started

### Prerequisites
- Node.js 18 or newer
- A PostgreSQL database (a free [Neon](https://neon.tech) project works; use a separate branch for development)

### Setup

```bash
git clone https://github.com/aradhy404/KLIP-SERVER.git
cd KLIP-SERVER/server
npm install
cp .env.example .env     # then fill in the values
npm run migrate          # creates the tables
npm run dev              # starts the API with nodemon
```

The API listens on `PORT` (default 8000).

### Environment variables

| Variable | Description |
|---|---|
| `PORT` | Port to listen on |
| `DATABASE_URL` | PostgreSQL connection string |
| `MY_JWT_SECRET` | Long random string used to sign tokens |
| `CLIENT_URL` | Frontend origin allowed by CORS, no trailing slash |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start with node |
| `npm run migrate` | Apply pending SQL migrations |

## Database migrations

SQL files live in `src/migrations/` and run in filename order. Applied files are recorded in the `schema_migrations` table, so each runs once.

To add a migration, create the next numbered file, for example `src/migrations/005_example.sql`, then run `npm run migrate`. Never edit a migration that has already been applied; add a new one instead.

## API

All routes except register and login need `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account. Body: `name`, `phone`, `password` |
| POST | `/api/auth/login` | Log in. Body: `phone`, `password` |
| POST | `/api/entry` | Create an entry. Body: `type` (`money` or `favour`), `amount` (whole rupees, money only), `description`, `counterpartyPhone`, `counterpartyName` |
| GET | `/api/entry?limit=20&offset=0` | List entries where you are the lender or the counterparty |
| POST | `/api/entry/:id/confirm` | The counterparty agrees to a pending entry |
| POST | `/api/entry/:id/dispute` | The counterparty disagrees with a pending entry |
| POST | `/api/entry/:id/settle` | The lender marks an entry settled (from pending, confirmed or disputed) |

Phone numbers are 10-digit Indian mobile numbers; `+91` and a leading `0` are accepted and stripped. Amounts are stored as integer paise.

Lifecycle endpoints return 400 for a malformed id, 404 if the entry isn't yours, 403 if it is the other person's action, and 409 if the current status doesn't allow it. A dashboard endpoint, edit and cancel are planned; see `docs/BACKEND.md`.

## Project structure

```text
src/
├── app.js            Express app and server start
├── config/db.js      pg connection pool
├── controllers/      request validation and responses
├── middleware/       JWT authentication
├── routes/           route definitions
├── services/         business logic and transactions
├── utils/            phone and amount normalization, migration runner
└── migrations/       numbered SQL files
```

## Deployment

- **API:** Render web service, auto-deployed from `main`. Set the four environment variables above in the dashboard.
- **Database:** Neon PostgreSQL.
- **Client:** Vercel.

## Security notes

- Passwords are hashed with bcrypt and never returned.
- Auth routes are rate limited (10 requests per 15 minutes per IP).
- CORS only allows the configured client origin.
- Phone numbers are not yet verified with OTP; this is planned for v1.1.

## Roadmap

v1.0 is live. Next: a dashboard endpoint, edit and cancel, an invite link, automated tests, then OTP verification. Details in [`docs/PRD.md`](../docs/PRD.md).

## License

ISC
