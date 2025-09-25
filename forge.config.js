module.exports = {
  packagerConfig: {
    // asar: true,
  },
  releaseEventsebuildConfig: {},
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
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'GaryCXJk',
          name: 'charoster-app'
        },
        prerelease: true,
        draft: true
      }
    }
  ],
  plugins: [
    // ['@electron-forge/plugin-auto-unpack-natives'],
    {
      name: "@electron-forge/plugin-webpack",
      config: {
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
    }
  ]
}
