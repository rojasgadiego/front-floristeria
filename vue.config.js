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
    /* Para probar en el celular con `npm run serve:movil`: se entra por la
       IP de la red (https://192.168.x.x:8080), y sin esto el servidor de
       desarrollo rechaza ese host. Solo afecta a desarrollo. */
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://localhost:5042',
        changeOrigin: true,
        secure: false   // el cert de desarrollo de .NET es autofirmado
      }
    }
  }
})