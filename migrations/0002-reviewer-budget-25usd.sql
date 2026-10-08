-- User-approved cumulative $25 cap. Preserve the ledger identity, charges,
-- halt flag, every request, and all reservation/settlement protections.
-- D1 migrations run in one transaction. Never apply these statements separately.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE analyst_budget_cap25 (
  id TEXT PRIMARY KEY CHECK (id = 'reviewer-10usd-v1'),
  cap_nanos INTEGER NOT NULL CHECK (cap_nanos = 25000000000),
  charged_nanos INTEGER NOT NULL DEFAULT 0 CHECK (charged_nanos >= 0 AND charged_nanos <= cap_nanos),
  halted INTEGER NOT NULL DEFAULT 0 CHECK (halted IN (0, 1))
);
INSERT INTO analyst_budget_cap25 (id, cap_nanos, charged_nanos, halted)
SELECT id, 25000000000, charged_nanos, halted FROM analyst_budget;
DROP TRIGGER analyst_reservation_check;
DROP TRIGGER analyst_reservation_charge;
DROP TRIGGER analyst_settlement_charge;
DROP TABLE analyst_budget;
ALTER TABLE analyst_budget_cap25 RENAME TO analyst_budget;
CREATE TRIGGER analyst_reservation_check BEFORE INSERT ON analyst_requests
BEGIN
  SELECT (CASE WHEN NOT EXISTS (SELECT 1 FROM analyst_budget WHERE id=NEW.policy_id AND halted=0) THEN RAISE(ABORT, 'ANALYST_BUDGET_UNAVAILABLE') END);
  SELECT (CASE WHEN (SELECT charged_nanos + NEW.reserved_nanos > cap_nanos FROM analyst_budget WHERE id=NEW.policy_id) THEN RAISE(ABORT, 'ANALYST_BUDGET_EXHAUSTED') END);
  SELECT (CASE WHEN EXISTS (SELECT 1 FROM analyst_requests WHERE state IN ('reserved', 'dispatched')) THEN RAISE(ABORT, 'ANALYST_BUSY') END);
  SELECT (CASE WHEN (SELECT COUNT(*) FROM analyst_requests WHERE created_ms >= NEW.created_ms - 60000) >= 10 THEN RAISE(ABORT, 'ANALYST_RATE_LIMIT') END);
END;
CREATE TRIGGER analyst_reservation_charge AFTER INSERT ON analyst_requests
BEGIN
  UPDATE analyst_budget SET charged_nanos = charged_nanos + NEW.charged_nanos WHERE id=NEW.policy_id;
END;
CREATE TRIGGER analyst_settlement_charge AFTER UPDATE OF charged_nanos ON analyst_requests
BEGIN
  UPDATE analyst_budget SET charged_nanos = charged_nanos + NEW.charged_nanos - OLD.charged_nanos WHERE id=NEW.policy_id;
END;
PRAGMA defer_foreign_keys = OFF;
