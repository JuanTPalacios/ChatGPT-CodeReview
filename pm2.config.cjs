const config = {
  apps : [{
    name      : 'Cody',
    script    : 'dist/index.js',
    interpreter_args : '-r dotenv/config',
    time: true
  }]
}

module.exports = config;