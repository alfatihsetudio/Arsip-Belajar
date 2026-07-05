-- 1. Add storage tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- 2. Create a function to update user storage when a file is uploaded to the 'media' bucket
CREATE OR REPLACE FUNCTION update_user_storage_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  file_owner UUID;
BEGIN
  -- We extract the user_id from the file path. Our files are stored as: "user_id/timestamp.ext"
  -- SPLIT_PART(NEW.name, '/', 1) gets the first part before the slash
  file_owner := SPLIT_PART(NEW.name, '/', 1)::UUID;

  IF NEW.bucket_id = 'media' THEN
    UPDATE public.profiles
    SET storage_used = storage_used + NEW.metadata->>'size'::BIGINT
    WHERE id = file_owner;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ignore UUID casting errors if the folder isn't a valid UUID
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to update user storage when a file is deleted from the 'media' bucket
CREATE OR REPLACE FUNCTION update_user_storage_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  file_owner UUID;
BEGIN
  file_owner := SPLIT_PART(OLD.name, '/', 1)::UUID;

  IF OLD.bucket_id = 'media' THEN
    UPDATE public.profiles
    SET storage_used = GREATEST(0, storage_used - OLD.metadata->>'size'::BIGINT)
    WHERE id = file_owner;
  END IF;

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach triggers to the storage.objects table
DROP TRIGGER IF EXISTS on_media_upload ON storage.objects;
CREATE TRIGGER on_media_upload
AFTER INSERT ON storage.objects
FOR EACH ROW EXECUTE FUNCTION update_user_storage_on_insert();

DROP TRIGGER IF EXISTS on_media_delete ON storage.objects;
CREATE TRIGGER on_media_delete
AFTER DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION update_user_storage_on_delete();
