
-- Required for gen_random_uuid() on older PostgreSQL versions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    pass_hashed TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE entry_type AS ENUM ('money', 'favour');
CREATE TYPE entry_status AS ENUM (
    'pending',
    'confirmed',
    'dispute',
    'settled'
);

CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),
    counterparty_id UUID REFERENCES users(id),
    counterparty_phone TEXT,
    type entry_type NOT NULL,
    amount_paise BIGINT CHECK (amount_paise > 0),
    description TEXT,
    status entry_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT no_self_entry
        CHECK (
            counterparty_id IS NULL
            OR counterparty_id <> creator_id
        ),

    CONSTRAINT money_requires_amount
        CHECK (type = 'favour' OR amount_paise IS NOT NULL)
);

CREATE TABLE entry_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id),
    storage_key TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entry_events (
    id BIGSERIAL PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES entries(id),
    actor_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_entries_creator
    ON entries(creator_id);

CREATE INDEX idx_entries_counterparty
    ON entries(counterparty_id);

CREATE INDEX idx_entries_cp_phone
    ON entries(counterparty_phone);

CREATE INDEX idx_events_entry
    ON entry_events(entry_id);

-- Keep entry_events append-only
CREATE FUNCTION block_event_changes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'entry_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entry_events_immutable
    BEFORE UPDATE OR DELETE ON entry_events
    FOR EACH ROW
    EXECUTE FUNCTION block_event_changes();
