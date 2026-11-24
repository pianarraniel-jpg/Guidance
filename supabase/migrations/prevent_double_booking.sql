-- Migration: Prevent Double Booking
-- Enforces partial unique constraints so that active appointments cannot overlap on (counselor_id, date, time)
-- or (student_id, date, time). Cancelled appointments are excluded from the constraint.

CREATE UNIQUE INDEX IF NOT EXISTS unique_counselor_active_slot
  ON appointments (counselor_id, date, time)
  WHERE status != 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS unique_student_active_slot
  ON appointments (student_id, date, time)
  WHERE status != 'cancelled';
