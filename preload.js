// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const fs = require('fs')
const path = require('path')
const settings = require(path.join(__dirname, './data/settings.json'))

window.addEventListener('DOMContentLoaded', async () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    const list = await getWallpapersList()
    console.log(list)


    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})

const getWallpapersList = async () => {
    let list = null
    if (navigator.onLine) {
        try {
            const response = await fetch(settings.wallpapersListSource)
            const data = await response.json()
            list = data
            fs.writeFileSync(path.join(__dirname, './data/wallpapers.json'), JSON.stringify(data))
        } catch (error) {
            console.error(error)
        }
    } else {
        console.error("User not connected to network! Using previously downloaded wallpaper list.")
    }

    if (list === null) {
        const oldFile = fs.readFileSync(path.join(__dirname, './data/wallpapers.json'))
        list = JSON.parse(oldFile)
    }
    return list
}