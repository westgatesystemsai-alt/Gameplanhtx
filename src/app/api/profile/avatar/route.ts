import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadImage } from '@/lib/cloudinary/upload'

const MAX_BYTES = 5 * 1024 * 1024

// POST /api/profile/avatar — upload a new avatar image to Cloudinary and
// save the resulting URL on the caller's own profile.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadImage(buffer, `gameplanhtx/avatars/${user.id}`)

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id)
    if (error) {
      console.error('POST /api/profile/avatar db update failed', error)
      return NextResponse.json({ error: 'Could not save avatar.' }, { status: 500 })
    }

    return NextResponse.json({ avatar_url: url })
  } catch (err) {
    console.error('POST /api/profile/avatar failed', err)
    return NextResponse.json({ error: 'Could not upload image.' }, { status: 500 })
  }
}
