'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EmailLog } from '@/lib/supabase/types';

interface EmailLogWithPoem extends EmailLog {
  poems: { title: string } | null;
}

interface EmailStats {
  emailLog: EmailLog;
  poemTitle: string | null;
  events: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  };
}

export default function AnalyticsPage() {
  const [emailStats, setEmailStats] = useState<EmailStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const supabase = createClient();

        // Fetch email logs with poem titles
        const { data: logs, error: logsError } = await supabase
          .from('email_logs')
          .select(`
            *,
            poems:poem_id (title)
          `)
          .order('sent_at', { ascending: false })
          .limit(50);

        if (logsError) throw logsError;
        if (!logs) {
          setEmailStats([]);
          return;
        }

        const typedLogs: EmailLogWithPoem[] = logs as unknown as EmailLogWithPoem[];

        // Fetch events for each log
        const stats: EmailStats[] = await Promise.all(
          typedLogs.map(async (log: EmailLogWithPoem) => {
            const { data: events } = await supabase
              .from('email_events')
              .select('event_type')
              .eq('email_log_id', log.id);

            const eventCounts = {
              sent: 0,
              delivered: 0,
              opened: 0,
              clicked: 0,
              bounced: 0,
              complained: 0,
            };

            (events || []).forEach((event: { event_type: string }) => {
              if (event.event_type in eventCounts) {
                eventCounts[event.event_type as keyof typeof eventCounts]++;
              }
            });

            // Extract email log fields from joined result
            const emailLog: EmailLog = {
              id: log.id,
              sent_at: log.sent_at,
              subject: log.subject,
              poem_id: log.poem_id,
              recipient_count: log.recipient_count,
              status: log.status,
              resend_email_id: log.resend_email_id,
              open_count: log.open_count,
              click_count: log.click_count,
              unique_opens: log.unique_opens,
              unique_clicks: log.unique_clicks,
            };

            return {
              emailLog,
              poemTitle: (log.poems as { title: string } | null)?.title || null,
              events: eventCounts,
            };
          })
        );

        setEmailStats(stats);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Email Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Email Analytics
        </h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Calculate overall stats
  const overallStats = emailStats.reduce(
    (acc, stat) => ({
      totalSent: acc.totalSent + (stat.emailLog.recipient_count || 0),
      totalOpened: acc.totalOpened + stat.events.opened,
      totalClicked: acc.totalClicked + stat.events.clicked,
      totalBounced: acc.totalBounced + stat.events.bounced,
    }),
    { totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0 }
  );

  const openRate = overallStats.totalSent > 0
    ? ((overallStats.totalOpened / overallStats.totalSent) * 100).toFixed(1)
    : '0';
  const clickRate = overallStats.totalSent > 0
    ? ((overallStats.totalClicked / overallStats.totalSent) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Email Analytics
      </h1>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Sent</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {overallStats.totalSent}
          </p>
        </div>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Opens</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {overallStats.totalOpened}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{openRate}% rate</p>
        </div>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Clicks</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {overallStats.totalClicked}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{clickRate}% rate</p>
        </div>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Bounced</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {overallStats.totalBounced}
          </p>
        </div>
      </div>

      {/* Email List */}
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Email History
      </h2>

      {emailStats.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No emails sent yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left p-3" style={{ color: 'var(--text-tertiary)' }}>Subject</th>
                <th className="text-left p-3" style={{ color: 'var(--text-tertiary)' }}>Date</th>
                <th className="text-center p-3" style={{ color: 'var(--text-tertiary)' }}>Sent</th>
                <th className="text-center p-3" style={{ color: 'var(--text-tertiary)' }}>Opened</th>
                <th className="text-center p-3" style={{ color: 'var(--text-tertiary)' }}>Clicked</th>
                <th className="text-center p-3" style={{ color: 'var(--text-tertiary)' }}>Bounced</th>
              </tr>
            </thead>
            <tbody>
              {emailStats.map((stat) => {
                const sentCount = stat.emailLog.recipient_count || 0;
                const emailOpenRate = sentCount > 0
                  ? ((stat.events.opened / sentCount) * 100).toFixed(0)
                  : '0';
                const emailClickRate = sentCount > 0
                  ? ((stat.events.clicked / sentCount) * 100).toFixed(0)
                  : '0';

                return (
                  <tr
                    key={stat.emailLog.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="p-3">
                      <p style={{ color: 'var(--text-primary)' }}>{stat.emailLog.subject}</p>
                      {stat.poemTitle && (
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                          {stat.poemTitle}
                        </p>
                      )}
                    </td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(stat.emailLog.sent_at).toLocaleDateString()}
                    </td>
                    <td className="text-center p-3" style={{ color: 'var(--text-primary)' }}>
                      {sentCount}
                    </td>
                    <td className="text-center p-3">
                      <span style={{ color: 'var(--text-primary)' }}>{stat.events.opened}</span>
                      <span className="text-sm ml-1" style={{ color: 'var(--text-tertiary)' }}>
                        ({emailOpenRate}%)
                      </span>
                    </td>
                    <td className="text-center p-3">
                      <span style={{ color: 'var(--text-primary)' }}>{stat.events.clicked}</span>
                      <span className="text-sm ml-1" style={{ color: 'var(--text-tertiary)' }}>
                        ({emailClickRate}%)
                      </span>
                    </td>
                    <td className="text-center p-3" style={{ color: stat.events.bounced > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {stat.events.bounced}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Setup Required</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          To track email opens and clicks, configure your Resend webhook:
        </p>
        <ol className="list-decimal list-inside text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          <li>Go to <a href="https://resend.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>Resend Webhooks</a></li>
          <li>Add endpoint: <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>https://yourdomain.com/api/webhooks/resend</code></li>
          <li>Select events: email.opened, email.clicked, email.delivered, email.bounced</li>
          <li>Copy the signing secret to <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>RESEND_WEBHOOK_SECRET</code> env var</li>
        </ol>
      </div>
    </div>
  );
}
