/**
 * "Where did you hear about us?" — asked once, on the sign-up form, and
 * written into the new Supabase user's metadata as `heard_about`, beside
 * `landing_variant`. The
 * same answer rides on PostHog's `sign_up_completed` and the Owner's
 * new-signup alert. Count them with:
 * `select raw_user_meta_data->>'heard_about', count(*) from auth.users group by 1;`
 *
 * The stored value is the key, never the label, so a relabelled option still
 * groups with its old answers. Keys read as words on purpose: they are what the
 * signup alert prints.
 */

export const HEARD_ABOUT_OPTIONS = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'x', label: 'X (Twitter)' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'reddit', label: 'Reddit' },
    { value: 'community', label: 'A Skool or Discord community' },
    { value: 'google', label: 'Google search' },
    { value: 'ai', label: 'ChatGPT or another AI' },
    { value: 'friend', label: 'A friend or colleague' },
    { value: 'other', label: 'Other' },
] as const;

export type HeardAbout = (typeof HEARD_ABOUT_OPTIONS)[number]['value'];

export interface HeardAboutAnswer {
    source: HeardAbout;
}
