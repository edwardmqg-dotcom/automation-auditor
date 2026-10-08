-- One cumulative budget. Reapplying this migration never resets consumption.
CREATE TABLE IF NOT EXISTS analyst_budget (
  id TEXT PRIMARY KEY CHECK (id = 'reviewer-10usd-v1'),
  cap_nanos INTEGER NOT NULL CHECK (cap_nanos = 10000000000),
  charged_nanos INTEGER NOT NULL DEFAULT 0 CHECK (charged_nanos >= 0 AND charged_nanos <= cap_nanos),
  halted INTEGER NOT NULL DEFAULT 0 CHECK (halted IN (0, 1))
);
INSERT INTO analyst_budget (id, cap_nanos) VALUES ('reviewer-10usd-v1', 10000000000) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS analyst_requests (
  request_key TEXT PRIMARY KEY,
  input_sha256 TEXT NOT NULL,
  credential_sha256 TEXT NOT NULL,
  pricing_version TEXT NOT NULL,
  created_ms INTEGER NOT NULL,
  reserved_nanos INTEGER NOT NULL CHECK (reserved_nanos > 0),
  charged_nanos INTEGER NOT NULL CHECK (charged_nanos >= 0 AND charged_nanos <= reserved_nanos),
  state TEXT NOT NULL CHECK (state IN ('reserved', 'dispatched', 'settled', 'held')),
  outcome TEXT,
  policy_id TEXT NOT NULL DEFAULT 'reviewer-10usd-v1' REFERENCES analyst_budget(id)
);
CREATE INDEX IF NOT EXISTS analyst_requests_created ON analyst_requests(created_ms);
CREATE TRIGGER IF NOT EXISTS analyst_reservation_check BEFORE INSERT ON analyst_requests
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM analyst_budget WHERE id=NEW.policy_id AND halted=0) THEN RAISE(ABORT, 'ANALYST_BUDGET_UNAVAILABLE') END;
  SELECT CASE WHEN (SELECT charged_nanos + NEW.reserved_nanos > cap_nanos FROM analyst_budget WHERE id=NEW.policy_id) THEN RAISE(ABORT, 'ANALYST_BUDGET_EXHAUSTED') END;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM analyst_requests WHERE state IN ('reserved', 'dispatched')) THEN RAISE(ABORT, 'ANALYST_BUSY') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM analyst_requests WHERE created_ms >= NEW.created_ms - 60000) >= 10 THEN RAISE(ABORT, 'ANALYST_RATE_LIMIT') END;
END;
CREATE TRIGGER IF NOT EXISTS analyst_reservation_charge AFTER INSERT ON analyst_requests
BEGIN
  UPDATE analyst_budget SET charged_nanos = charged_nanos + NEW.charged_nanos WHERE id=NEW.policy_id;
END;
CREATE TRIGGER IF NOT EXISTS analyst_settlement_charge AFTER UPDATE OF charged_nanos ON analyst_requests
BEGIN
  UPDATE analyst_budget SET charged_nanos = charged_nanos + NEW.charged_nanos - OLD.charged_nanos WHERE id=NEW.policy_id;
END;
