/**
 * Creates a notification record in the notifications table.
 * Silently catches errors — notifications are non-critical.
 *
 * @param {object} supabase - Supabase client instance
 * @param {object} params
 * @param {string} params.company_id
 * @param {string} params.user_id
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} [params.message]
 * @param {string} [params.link]
 */
export async function createNotification(supabase, { company_id, user_id, type, title, message, link }) {
  try {
    await supabase.from('notifications').insert({
      company_id,
      user_id,
      type,
      title,
      message: message || null,
      link: link || null,
    })
  } catch {
    // Notifications are non-critical — swallow errors silently
  }
}
