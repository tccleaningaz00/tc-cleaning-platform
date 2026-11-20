ALTER TABLE manager_timecard_drafts ADD COLUMN monday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecard_drafts ADD COLUMN tuesday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecard_drafts ADD COLUMN wednesday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecard_drafts ADD COLUMN thursday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecard_drafts ADD COLUMN friday_shifts_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE manager_timecards ADD COLUMN monday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecards ADD COLUMN tuesday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecards ADD COLUMN wednesday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecards ADD COLUMN thursday_shifts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE manager_timecards ADD COLUMN friday_shifts_json TEXT NOT NULL DEFAULT '[]';
