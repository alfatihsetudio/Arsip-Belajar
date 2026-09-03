module.exports = {
  apps: [
    {
      name: 'wa-bot-arsip',
      script: 'index.js',
      node_args: '--dns-result-order=ipv4first',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
