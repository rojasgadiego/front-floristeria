const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,

  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Floristería Colibrí'
    }
  },

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