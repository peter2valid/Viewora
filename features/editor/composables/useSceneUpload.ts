import { ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'

export type LocalUploadState = 'local_select' | 'signing' | 'uploading' | 'registering' | 'processing' | 'failed'

export interface LocalUploadItem {
  id: string
  fileName: string
  mediaType: string
  state: LocalUploadState
  error?: string
}

export function useSceneUpload(spaceId: string) {
  const { apiFetch } = useApiFetch()
  const localUploads = ref<LocalUploadItem[]>([])

  function createLocalUpload(file: File, mediaType: string): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    localUploads.value.push({ id, mediaType, fileName: file.name, state: 'local_select' })
    return id
  }

  function updateLocalUpload(id: string, patch: Partial<LocalUploadItem>) {
    const item = localUploads.value.find((u) => u.id === id)
    if (item) Object.assign(item, patch)
  }

  function removeLocalUpload(id: string) {
    localUploads.value = localUploads.value.filter((u) => u.id !== id)
  }

  function extractUploadErrorMessage(err: any, fileName: string) {
    const rawMsg = err?.data?.statusMessage || err?.message || ''
    if (rawMsg.includes('File too large')) return `File too large: ${fileName}`
    if (rawMsg.includes('Storage limit reached')) return 'Storage limit reached. Please upgrade your plan.'
    if (rawMsg.includes('fetch') || rawMsg.includes('network') || err?.name === 'TypeError') return `Network error uploading ${fileName}`
    return rawMsg || `Failed to upload ${fileName}`
  }

  function unwrapApiData<T = any>(value: any): T {
    return value && value.data !== undefined ? value.data : value
  }

  async function uploadFile(
    file: File,
    type: string,
    options?: {
      onRegister?: (record: any) => Promise<void>
      onError?: (err: Error, humanError: string) => void
    }
  ) {
    const localId = createLocalUpload(file, type)
    
    try {
      updateLocalUpload(localId, { state: 'signing' })
      const signedPayload = unwrapApiData<any>(await apiFetch<any>('/uploads/create-signed-url', {
        method: 'POST',
        body: { spaceId, mediaType: type, fileName: file.name, contentType: file.type, fileSize: file.size },
      }))

      const signedUrl = signedPayload?.signedUrl
      const objectKey = signedPayload?.objectKey
      const publicUrlVal = signedPayload?.publicUrl

      if (!signedUrl || typeof signedUrl !== 'string' || !signedUrl.startsWith('http')) {
        throw new Error('Upload signing failed: invalid signed URL returned by server')
      }
      if (!objectKey || !publicUrlVal) throw new Error('Upload signing failed: missing upload metadata from server')

      updateLocalUpload(localId, { state: 'uploading' })
      
      await $fetch(signedUrl, { 
        method: 'PUT', 
        body: file, 
        headers: { 
          'Content-Type': file.type,
          'Cache-Control': 'public, max-age=31536000, immutable'
        } 
      })
      
      updateLocalUpload(localId, { state: 'registering' })

      const record = unwrapApiData<any>(await apiFetch<any>('/uploads/complete', {
        method: 'POST',
        body: { spaceId, mediaType: type, objectKey, publicUrl: publicUrlVal, fileSize: file.size },
      }))

      if (!record || typeof record !== 'object') {
        throw new Error('Upload registration returned an invalid response. Please try again.')
      }
      if (type === 'panorama' && !record.public_url) {
        throw new Error('Upload registration returned no public URL. Please try again.')
      }

      if (options?.onRegister) {
        await options.onRegister(record)
      }

      removeLocalUpload(localId)
      return record
    } catch (err: any) {
      const humanError = extractUploadErrorMessage(err, file.name)
      updateLocalUpload(localId, { state: 'failed', error: humanError })
      if (options?.onError) {
        options.onError(err, humanError)
      } else {
        throw err
      }
    }
  }

  return {
    localUploads,
    createLocalUpload,
    updateLocalUpload,
    removeLocalUpload,
    uploadFile,
    extractUploadErrorMessage
  }
}
