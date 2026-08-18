const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,

  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:5042',
        changeOrigin: true,
        secure: false   // el cert de desarrollo de .NET es autofirmado
      }
    }
  }
})