-- Clear the Focus 25 review log.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run.

delete from ee_review_log where plan_code = 'FOCUS25';
