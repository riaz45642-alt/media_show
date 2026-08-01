import fs from 'node:fs/promises'

const cleanBase = (value = '') => value.trim().replace(/\/$/, '')

export function objectStorageConfigured() {
  return Boolean(cleanBase(process.env.SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}

export async function uploadPublicMedia(file, folder = 'stories') {
  const baseUrl = cleanBase(process.env.SUPABASE_URL)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'media'

  if (!baseUrl || !serviceKey) {
    const error = new Error('Permanent media storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.')
    error.status = 503
    error.code = 'OBJECT_STORAGE_NOT_CONFIGURED'
    throw error
  }

  const objectPath = `${folder}/${file.filename}`
  const bytes = await fs.readFile(file.path)
  const endpoint = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': file.mimetype,
      'x-upsert': 'false',
    },
    body: bytes,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const error = new Error(`Supabase Storage upload failed (${response.status}): ${detail.slice(0, 300)}`)
    error.status = 502
    error.code = 'OBJECT_STORAGE_UPLOAD_FAILED'
    throw error
  }

  await fs.unlink(file.path).catch(() => {})
  return {
    bucket,
    objectPath,
    publicUrl: `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
  }
}

export async function deletePublicMedia({ bucket, objectPath }) {
  const baseUrl = cleanBase(process.env.SUPABASE_URL)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!baseUrl || !serviceKey || !bucket || !objectPath) return
  const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!response.ok && response.status !== 404) {
    const error = new Error(`Supabase Storage delete failed (${response.status})`)
    error.code = 'OBJECT_STORAGE_DELETE_FAILED'
    throw error
  }
}

export function objectPathFromPublicUrl(publicUrl, bucket) {
  const marker = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`
  const index = String(publicUrl || '').indexOf(marker)
  if (index < 0) return null
  return String(publicUrl).slice(index + marker.length).split('/').map(decodeURIComponent).join('/')
}
