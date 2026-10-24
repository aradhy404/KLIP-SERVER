ALTER TABLE entry_events
    DROP CONSTRAINT IF EXISTS entry_events_action_check,
    ADD CONSTRAINT entry_events_action_check
    CHECK (action IN ('created', 'confirmed', 'disputed', 'settled')) NOT VALID;