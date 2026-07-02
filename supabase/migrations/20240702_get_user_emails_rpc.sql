-- Buat fungsi RPC untuk mengambil email user berdasarkan user_id
-- Fungsi ini hanya bisa dipanggil oleh user yang sudah login (authenticated)
CREATE OR REPLACE FUNCTION get_user_emails(user_ids uuid[])
RETURNS TABLE (id uuid, email text, full_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    (u.raw_user_meta_data->>'full_name')::text as full_name,
    (u.raw_user_meta_data->>'avatar_url')::text as avatar_url
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant eksekusi ke authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails(uuid[]) TO authenticated;
