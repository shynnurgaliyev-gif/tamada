begin;

-- Add 'vacation' to the calendar_entry_status enum.
-- ALTER TYPE ... ADD VALUE is safe: non-destructive, no table rewrite required.
ALTER TYPE calendar_entry_status ADD VALUE IF NOT EXISTS 'vacation';

commit;
