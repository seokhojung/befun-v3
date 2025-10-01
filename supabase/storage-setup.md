# Supabase Storage Setup for Drawing PDFs

## Storage Bucket Configuration

### Bucket: `drawings`

```sql
-- Create storage bucket for PDF drawings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drawings',
  'drawings',
  false, -- Private bucket (authenticated users only)
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);
```

### Storage Structure

```
drawings/
└── {userId}/
    └── {designId}/
        └── desk-design-{designId}-{timestamp}.pdf
```

## RLS Policies for Storage

### Policy 1: Users can upload to their own folder

```sql
CREATE POLICY "Users can upload drawings to own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'drawings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Users can view their own drawings

```sql
CREATE POLICY "Users can view own drawings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'drawings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Users can update their own drawings

```sql
CREATE POLICY "Users can update own drawings"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'drawings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4: Users can delete their own drawings

```sql
CREATE POLICY "Users can delete own drawings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'drawings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Setup Instructions

1. **Via Supabase Dashboard:**
   - Navigate to Storage → Create new bucket
   - Name: `drawings`
   - Public: `false`
   - File size limit: `10MB`
   - Allowed MIME types: `application/pdf`

2. **Apply RLS Policies:**
   - Navigate to Storage → Policies
   - Create policies for INSERT, SELECT, UPDATE, DELETE as shown above

3. **Verify Setup:**
   ```typescript
   // Test upload
   const { data, error } = await supabase.storage
     .from('drawings')
     .upload(`${userId}/${designId}/test.pdf`, pdfFile)

   console.log(data, error)
   ```

## Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

## Usage in Code

```typescript
import { createClient } from '@/lib/supabase/server'

// Upload PDF
const supabase = createClient()
const filePath = `${userId}/${designId}/desk-design-${designId}-${Date.now()}.pdf`

const { data, error } = await supabase.storage
  .from('drawings')
  .upload(filePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: false
  })

// Get public URL (signed URL for private bucket)
const { data: urlData } = await supabase.storage
  .from('drawings')
  .createSignedUrl(filePath, 3600) // 1 hour expiry

console.log(urlData.signedUrl)
```