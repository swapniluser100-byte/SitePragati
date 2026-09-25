-- Run this once against the existing database after deploying the Leads
-- tab redesign. The lead pipeline stages changed from
-- New / Contacted / Won / Lost to New / Contacted / In Progress /
-- Converted / Lost, so any lead still marked "Won" needs to become
-- "Converted" — otherwise it would show up as an unrecognized status in
-- the redesigned status dropdown. Safe to run more than once: a repeat
-- run is a no-op since no rows will still be "Won" afterward.

UPDATE leads SET status = 'Converted' WHERE status = 'Won';
