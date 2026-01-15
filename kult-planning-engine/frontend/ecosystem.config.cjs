module.exports = {
  apps: [
    {
      name: 'kult-frontend',
      script: 'node',
      args: 'server.js',
      cwd: '/home/user/webapp/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      error_file: '/home/user/.pm2/logs/kult-frontend-error.log',
      out_file: '/home/user/.pm2/logs/kult-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
