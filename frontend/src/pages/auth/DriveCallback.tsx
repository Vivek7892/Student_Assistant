/**
 * Minimal page that receives the Google OAuth redirect for Drive.
 * The opener (Documents.tsx) polls this window's URL to extract the code.
 * This page just shows a spinner — the popup is closed by the opener.
 */
export default function DriveCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
