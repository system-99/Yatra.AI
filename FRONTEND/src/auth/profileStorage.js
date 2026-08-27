import { supabase } from './supabase'

// The avatars bucket should be private. Each user gets an isolated folder.
export async function uploadAvatar(userId, blob) {
  const path = `${userId}/avatar.jpg`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60 * 24 * 30)
  if (error) throw error
  return data.signedUrl
}
