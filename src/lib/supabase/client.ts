export const createClient = (): any => {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: 'mock', email: 'mock@example.com' } } }),
      signOut: async () => {},
      updateUser: async () => ({ error: null })
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File | Blob, opts?: any) => {
          // get presigned URL
          const res = await fetch('/api/db-shim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'storage_upload', bucket, path, contentType: file.type || opts?.contentType })
          });
          const { data, error } = await res.json();
          if (error) return { error };
          
          // PUT file
          const putRes = await fetch(data.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || opts?.contentType },
            body: file
          });
          if (!putRes.ok) return { error: { message: 'Upload failed' } };
          return { data: { path }, error: null };
        },
        remove: async (paths: string[]) => {
          const res = await fetch('/api/db-shim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'storage_remove', bucket, paths })
          });
          return await res.json();
        }
      })
    },
    from: (table: string) => {
      let currentAction = 'select';
      let payload: any = null;
      let filters: any[] = [];
      let isSingle = false;

      const execute = async () => {
        try {
          const res = await fetch('/api/db-shim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'db', table, action: currentAction, payload, filters })
          });
          
          let json;
          try {
            json = await res.json();
          } catch (e) {
            const text = await res.text();
            console.error('db-shim returned non-json:', res.status, text);
            return { data: null, error: { message: `API Error ${res.status}` } };
          }

          if (json.error) return { data: null, error: json.error };
          if (isSingle) return { data: Array.isArray(json.data) ? json.data[0] : json.data, error: null };
          return { data: json.data, error: null };
        } catch (err: any) {
          console.error('db-shim fetch error:', err);
          return { data: null, error: { message: err.message } };
        }
      };

      const chain: any = {
        select: (cols?: string) => { currentAction = 'select'; return chain; },
        insert: (data: any) => { currentAction = 'insert'; payload = data; return chain; },
        update: (data: any) => { currentAction = 'update'; payload = data; return chain; },
        delete: () => { currentAction = 'delete'; return chain; },
        eq: (col: string, val: any) => { filters.push({ col, val, op: 'eq' }); return chain; },
        in: (col: string, vals: any[]) => { filters.push({ col, val: vals, op: 'in' }); return chain; },
        order: (col: string, opts?: { ascending?: boolean }) => { return chain; },
        single: () => { isSingle = true; return chain; },
        maybeSingle: () => { isSingle = true; return chain; },
        then: (resolve: any, reject: any) => execute().then(resolve).catch(reject)
      };
      
      return chain;
    }
  };
};
