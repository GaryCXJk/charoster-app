# ChaRoster

This is a simple but extendible roster maker, which can be used for any purposes.

## Installation

If you want to run this app in development:

```
git clone https://github.com/GaryCXJk/charoster-app.git
cd charoster-app
yarn
yarn start
```

If you want to compile this app:

```
git clone https://github.com/GaryCXJk/charoster-app.git
cd charoster-app
yarn
yarn package
```

## Usage

On startup, you are prompted to set the work folder. This folder will be used to check for installed packs.

To add new packs, just add the folder of the pack to the work folder. The structure should look something like this:

* \<Work folder>
    * \<Pack folder>
        * info.json
