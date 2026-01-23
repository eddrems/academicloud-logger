module.exports = {
  apps: [{
    name: 'academicloud-logger',
    script: './server.js',
    instances: 1, // 1 instancia (puede aumentar si necesitas más throughput)
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    // Restart automático si falla
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};

