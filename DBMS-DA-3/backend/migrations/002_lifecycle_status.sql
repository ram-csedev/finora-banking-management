-- ============================================================================
-- Migration: 002_lifecycle_status.sql
-- Non-destructive addition of status tracking columns for Customer, Employee, and Branch
-- Finora DA3 Distributed Architecture - CockroachDB Cloud
-- ============================================================================

-- Add status column to customer if not exists
ALTER TABLE customer
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Add check constraint on customer status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_customer_status'
  ) THEN
    ALTER TABLE customer ADD CONSTRAINT chk_customer_status
      CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'));
  END IF;
END $$;

-- Add status column to employee if not exists
ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Add check constraint on employee status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_status'
  ) THEN
    ALTER TABLE employee ADD CONSTRAINT chk_employee_status
      CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE', 'TERMINATED'));
  END IF;
END $$;

-- Add status column to branch if not exists
ALTER TABLE branch
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Add check constraint on branch status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_branch_status'
  ) THEN
    ALTER TABLE branch ADD CONSTRAINT chk_branch_status
      CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED'));
  END IF;
END $$;
