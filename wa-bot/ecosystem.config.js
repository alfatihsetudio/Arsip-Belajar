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
      restart_delay: 5000,
      min_uptime: '10s',
      max_restarts: 100,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
