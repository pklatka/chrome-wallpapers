// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const fs = require('fs')
const path = require('path')
const wallpaper = require('wallpaper')
const axios = require('axios')
const settings = require(path.join(__dirname, './data/settings.json'))

const loader = '<div class="lds-ellipsis" ><div></div><div></div><div></div><div></div></div>'

window.addEventListener('DOMContentLoaded', async () => {

    const list = await getWallpapersList()

    const main = document.querySelector('main')

    const section = document.createElement('section')
    section.id = "categories"

    for (category of list.categories) {
        let div = document.createElement('div')
        div.className = "block"
        let thumbnail = document.createElement('div')
        thumbnail.className = 'thumbnail'
        thumbnail.style = `background-image: url(${category.thumbnailImageUrl});`
        thumbnail.dataset.id = category.id
        thumbnail.dataset.type = "categories"
        div.appendChild(thumbnail)
        div.innerHTML += category.categoryTitle
        section.appendChild(div)

        // Create section for category items
        const wallpapers = document.createElement('section')
        wallpapers.id = category.id
        wallpapers.className = 'hidden'
        for (photo of category.wallpapers) {
            let div = document.createElement('div')
            div.className = "block"
            let thumbnail = document.createElement('div')
            thumbnail.className = 'thumbnail'
            thumbnail.dataset.imageUrl = photo.imageUrl
            thumbnail.style = `background-image: url(${photo.thumbnailImageUrl});`
            thumbnail.dataset.id = category.id
            thumbnail.dataset.type = "wallpapers"
            thumbnail.title = photo.title
            div.appendChild(thumbnail)

            wallpapers.appendChild(div)
        }

        main.appendChild(wallpapers)
    }

    main.appendChild(section)

    document.querySelector('button#back').addEventListener('click', e => {
        document.querySelector('section:not(.hidden)').classList.add('hidden')
        document.querySelector(`section#categories`).classList.remove('hidden')
        e.target.classList.add('hidden')
    })
    document.querySelectorAll('div.thumbnail').forEach(el => el.addEventListener('click', mainRender))
})

const mainRender = async e => {
    if (e.target.dataset.type === "categories") {
        document.querySelector(`section#categories`).classList.add('hidden')
        document.querySelector(`section#${e.target.dataset.id}`).classList.remove('hidden')
        document.querySelector('button#back').classList.remove('hidden')
    } else {
        if (e.target.innerHTML !== '') {
            return
        }
        e.target.innerHTML += loader
        const res = await axios({
            url: e.target.dataset.imageUrl,
            responseType: 'arraybuffer'
        })
        fs.writeFileSync(path.join(__dirname, './data/wallpaper.jpg'), Buffer.from(res.data, 'binary'))
        await wallpaper.set('./data/wallpaper.jpg')
        e.target.innerHTML = ''
    }
}

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