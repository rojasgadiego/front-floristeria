const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,

  devServer: {
    proxy: {
      '/api': {
        target: 'https://localhost:7265',
        changeOrigin: true,
        secure: false   // el cert de desarrollo de .NET es autofirmado
      }
    }
  }
})