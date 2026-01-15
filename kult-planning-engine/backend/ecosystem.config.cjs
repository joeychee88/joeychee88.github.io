module.exports = {
  apps: [
    {
      name: 'kult-backend',
      script: 'src/demo-server.js',
      cwd: '/home/user/webapp/backend',
      interpreter: 'node',
      interpreter_args: '--experimental-modules',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      error_file: '/home/user/.pm2/logs/kult-backend-error.log',
      out_file: '/home/user/.pm2/logs/kult-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
