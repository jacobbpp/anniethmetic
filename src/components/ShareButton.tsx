import { useCopyFeedback } from '../hooks/useCopyFeedback.ts'

export interface ShareButtonProps {
  text: string
  // Reserved for a future generated share image — no image generation
  // exists yet, so this only ever gets passed through to navigator.share.
  imageDataUrl?: string
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], 'anniethmetic-share.png', { type: blob.type || 'image/png' })
}

export function ShareButton({ text, imageDataUrl }: ShareButtonProps) {
  const { copied, copy } = useCopyFeedback()

  const handleShare = async () => {
    if (navigator.share) {
      const shareData: ShareData = { text }

      if (imageDataUrl && navigator.canShare) {
        const file = await dataUrlToFile(imageDataUrl)
        const withFile = { ...shareData, files: [file] }
        if (navigator.canShare(withFile)) {
          try {
            await navigator.share(withFile)
            return
          } catch {
            // Fall through to the plain-text share below.
          }
        }
      }

      try {
        await navigator.share(shareData)
        return
      } catch {
        // Sharing was cancelled or failed — fall back to copying instead.
      }
    }

    await copy(text)
  }

  return (
    <button type="button" className="btn btn--ghost" onClick={handleShare}>
      {copied ? 'Copied' : 'Share'}
    </button>
  )
}
