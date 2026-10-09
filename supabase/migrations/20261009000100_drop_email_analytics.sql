-- Remove the Resend analytics leftovers. Mail goes through Gmail SMTP, which
-- sends no events: every counter was 0 and email_events was empty.
-- increment_email_stat was SECURITY DEFINER and executable by anon, so anyone
-- holding the public key could rewrite email_logs columns through it.

drop function if exists increment_email_stat(uuid, text);
drop table if exists email_events;

drop index if exists idx_email_logs_resend_email_id;
alter table email_logs
  drop column if exists resend_email_id,
  drop column if exists open_count,
  drop column if exists click_count,
  drop column if exists unique_opens,
  drop column if exists unique_clicks;
