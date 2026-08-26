export const createClient = (): any => {
  const executor = new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'then') return undefined; // so it's not treated as a Promise immediately
      return (...args: any[]) => executor;
    }
  });

  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'auth') {
        return {
          getUser: async () => ({ data: { user: { id: 'mock', user_metadata: {}, email: 'mock@example.com' } } }),
          signOut: async () => {},
          signInWithOAuth: async () => {},
          updateUser: async () => ({ error: null })
        };
      }
      if (prop === 'storage') {
        return {
          from: () => ({
            upload: async () => ({ error: null }),
            remove: async () => ({ error: null })
          })
        };
      }
      if (prop === 'from') {
        return () => executor;
      }
      return (...args: any[]) => executor;
    }
  });
};
