-- 001_init.sql : users, vouchers, voucher number sequence

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,
  role           VARCHAR(20)   NOT NULL CHECK (role IN ('EMPLOYEE', 'DIRECTOR', 'ACCOUNTS')),
  employee_code  VARCHAR(30),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Drives automatic, unique voucher numbers such as EV-2026-00001
CREATE SEQUENCE IF NOT EXISTS voucher_number_seq START 1;

CREATE TABLE IF NOT EXISTS vouchers (
  id                  SERIAL PRIMARY KEY,
  voucher_number      VARCHAR(30) NOT NULL UNIQUE
                      DEFAULT ('EV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('voucher_number_seq')::TEXT, 5, '0')),
  employee_id         INTEGER NOT NULL REFERENCES users(id),

  voucher_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_date        DATE NOT NULL,
  department          VARCHAR(100) NOT NULL,
  expense_title       VARCHAR(150) NOT NULL,
  expense_category    VARCHAR(50),
  expense_description TEXT,
  amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),

  status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),

  employee_signature  VARCHAR(255),
  submitted_at        TIMESTAMPTZ,

  director_id         INTEGER REFERENCES users(id),
  director_signature  VARCHAR(255),
  approval_date       TIMESTAMPTZ,
  rejected_date       TIMESTAMPTZ,
  rejection_reason    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rules enforced at database level as a safety net
  CONSTRAINT chk_submitted_has_employee_signature
    CHECK (status = 'DRAFT' OR employee_signature IS NOT NULL),
  CONSTRAINT chk_approved_has_director_signature
    CHECK (status <> 'APPROVED' OR director_signature IS NOT NULL),
  CONSTRAINT chk_rejected_has_reason
    CHECK (status <> 'REJECTED' OR (rejection_reason IS NOT NULL AND LENGTH(TRIM(rejection_reason)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_vouchers_employee ON vouchers(employee_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status   ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_created  ON vouchers(created_at DESC);
