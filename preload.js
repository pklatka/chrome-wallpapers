// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const fs = require('fs')
const path = require('path')
const settings = require(path.join(__dirname, './data/settings.json'))

window.addEventListener('DOMContentLoaded', async () => {

    const list = await getWallpapersList()

    const section = document.querySelector('section')
    for (category of list.categories) {
        let div = document.createElement('div')
        div.className = "block"
        div.innerHTML = `<div class="thumbnail" style="background-image: url(${category.thumbnailImageUrl});"></div>${category.categoryTitle}`
        div.dataset.id = category.id
        section.appendChild(div)
    }
})

const getWallpapersList = async () => {
    const oldFile = fs.readFileSync(path.join(__dirname, './data/wallpapers.json'))
    let list = JSON.parse(oldFile)

    if (new Date() > new Date(list.validUntil)) {
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
    }

    return list
}