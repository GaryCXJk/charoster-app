module.exports = {
  packagerConfig: {
    // asar: true,
  },
  electronRebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "charoster_app"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: [
        "darwin"
      ]
    },
    {
      name: "@electron-forge/maker-deb",
      config: {}
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {}
    }
  ],
  plugins: [
    // ['@electron-forge/plugin-auto-unpack-natives'],
    [
      "@electron-forge/plugin-webpack",
      {
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer.js",
              name: "main_window",
              preload: {
                js: "./src/preload.js"
              }
            }
          ]
        }
      }
    ]
  ]
}
