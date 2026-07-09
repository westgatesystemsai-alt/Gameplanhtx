'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProfileViewTrackerProps {
  vendorId: string
  /** The vendor owner's profile id — used to skip self-views so the
   *  vendor doesn't inflate their own count by opening their listing. */
  vendorProfileId: string
}

// Renders nothing; fires a single lightweight INSERT into
// vendor_profile_views on load. RLS lets anyone log a view against an
// approved vendor (viewer_id is stamped from the current session).
export default function ProfileViewTracker({
  vendorId,
  vendorProfileId,
}: ProfileViewTrackerProps) {
  const logged = useRef(false)

  useEffect(() => {
    if (logged.current) return
    logged.current = true

    const supabase = createClient()
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Don't count the vendor viewing their own profile.
      if (user?.id === vendorProfileId) return

      await supabase
        .from('vendor_profile_views')
        .insert({ vendor_id: vendorId, viewer_id: user?.id ?? null })
    })()
  }, [vendorId, vendorProfileId])

  return null
}
