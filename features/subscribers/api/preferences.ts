import { apiFetch } from '@/lib/apiFetch';

/* A subscriber's new-poem email preference, reached by the signed token in
   their email link. No login: the token is the credential. */

export type Preference = { enabled: boolean; unsubscribed: boolean };
export type PreferenceAction = 'on' | 'off';

type PreferenceResponse = Preference & { email: string };

const pick = ({ enabled, unsubscribed }: PreferenceResponse): Preference => ({ enabled, unsubscribed });

/** Read the current preference without changing it. */
export async function readPreference(token: string): Promise<Preference> {
  return pick(
    await apiFetch<PreferenceResponse>(`/api/notifications?token=${encodeURIComponent(token)}`)
  );
}

/** Set the preference to an absolute value. Repeating it changes nothing. */
export async function writePreference(token: string, action: PreferenceAction): Promise<Preference> {
  return pick(
    await apiFetch<PreferenceResponse>('/api/notifications', {
      method: 'POST',
      json: { token, action },
    })
  );
}
