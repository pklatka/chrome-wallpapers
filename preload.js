// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const fs = require('fs')
const path = require('path')
const wallpaper = require('wallpaper')
const axios = require('axios')
const settings = require(path.join(__dirname, './data/settings.json'))
const { ipcRenderer } = require('electron')
const temporarySelected = []
const schedule = require(path.join(__dirname, './data/schedule.json'))

const loader = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>'
const checked = '<div class="checked"></div>'

window.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('input#interval-value').value = schedule.inputValue == 0 ? '' : schedule.inputValue
    document.querySelector('select').selectedIndex = schedule.selectedIndex
    document.querySelector('input#shuffle').checked = schedule.shuffle

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
    document.querySelectorAll('div.thumbnail').forEach(el => {
        el.addEventListener('click', mainRender)
        el.addEventListener('contextmenu', addToSchedule)
    })

    document.querySelector('a').addEventListener('click', e => {
        e.preventDefault()
        ipcRenderer.invoke('openExternalBrowser', e.target.href)
    })

    document.querySelector('select').addEventListener('change', e => {
        const input = document.querySelector('input#interval-value')
        if (e.target.selectedIndex == 6) {
            input.disabled = true
            input.classList.add('disabled')
            input.value = ''
        } else {
            input.disabled = false
            input.classList.remove('disabled')
        }
    })

    document.querySelector('button#show').addEventListener('click', e => {
        if (schedule.wallpapers.length <= 0) return;

        if (!e.target.classList.contains('hide')) {
            document.querySelectorAll('div.checked').forEach(el => {
                temporarySelected.push(el.parentElement)
                el.parentElement.innerHTML = ''
            })
            e.target.classList.add('hide')
            e.target.textContent = 'HIDE SELECTED'
            // Read from file and select saved photos
            schedule.wallpapers.forEach(el => {
                if (el.type === 'wallpaper') {
                    document.querySelector(`div[data-image-url="${el.imageUrl}"]`).innerHTML = checked
                } else {
                    console.log(document.querySelector(`div[data-type="wallpapers"][data-id="${el.id}"]`))
                    document.querySelector(`div[data-type="categories"][data-id="${el.id}"]`).innerHTML = checked
                }
            })
        } else {
            document.querySelectorAll('div.checked').forEach(el => {
                el.parentElement.innerHTML = ''
            })
            temporarySelected.forEach(el => el.innerHTML = checked)
            e.target.classList.remove('hide')
            e.target.textContent = 'SHOW SELECTED'
        }
    })

    document.querySelector('button#save').addEventListener('click', () => {
        const inputValue = Number(document.querySelector('input#interval-value').value)
        const selectedIndex = document.querySelector('select').selectedIndex
        const interval = inputValue * Number(document.querySelector('select').value) * 1000
        const shuffle = document.querySelector('input#shuffle').checked
        const categories = []
        let wallpapers = [...document.querySelectorAll('div.checked')].map(el => {
            if (el.parentElement.dataset.type === "wallpapers") {
                return { imageUrl: el.parentElement.dataset.imageUrl, active: false, type: 'wallpaper' }
            } else if (el.parentElement.dataset.type === "categories") {
                categories.push(el.parentElement.dataset.id)
                return { id: el.parentElement.dataset.id, type: 'category' }
            }
        })

        if (wallpapers.length <= 0) {
            return notify("No wallpapers selected")
        }

        wallpapers[0].active = true
        fs.writeFileSync(path.join(__dirname, './data/schedule.json'), JSON.stringify({
            interval, inputValue, selectedIndex, shuffle, categories, wallpapers
        }))

        notify("Schedule saved")
    })
    document.querySelector('button#clear').addEventListener('click', () => {
        document.querySelectorAll('div.checked').forEach(el => el.remove())
    })
    document.querySelector('button#all').addEventListener('click', () => {
        document.querySelectorAll('div.thumbnail').forEach(el => el.innerHTML = checked)
    })
})

const addToSchedule = async e => {
    e.preventDefault()
    if (e.target.dataset.type === "categories") {
        if (e.target.innerHTML != '') {
            e.target.innerHTML = ''
            document.querySelectorAll(`div[data-id="${e.target.dataset.id}"]`).forEach(el => el.innerHTML = '')
        } else {
            e.target.innerHTML = checked
            document.querySelectorAll(`div[data-id="${e.target.dataset.id}"]`).forEach(el => el.innerHTML = checked)
        }
    } else {
        if (e.target.innerHTML != '') {
            const categoryBlock = document.querySelector(`section#categories div[data-id="${e.target.dataset.id}"]`)
            if (categoryBlock.innerHTML != '') {
                categoryBlock.innerHTML = ''
            }
            e.target.innerHTML = ''
        } else {
            e.target.innerHTML = checked
            for (el of document.querySelectorAll(`section#${e.target.dataset.id}>div>div`)) {
                if (el.innerHTML == '') {
                    return;
                }
            }
            document.querySelector(`section#categories div[data-id="${e.target.dataset.id}"]`).innerHTML = checked
        }
    }
}

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
                // Autoupdate category photos in schedule
                const newSchedule = { ...schedule }
                schedule.categories.forEach(category => {
                    const wallpaperList = list.categories.find(el => el.id == category)
                    if (wallpaperList) {
                        wallpaperList.wallpapers.forEach(wallpaper => {
                            if (!schedule.wallpapers.find(el => el.imageUrl == wallpaper.imageUrl)) {
                                newSchedule.wallpapers.push({ imageUrl: wallpaper.imageUrl, active: false, type: 'wallpaper' })
                            }
                        })
                    }
                })

                fs.writeFileSync(path.join(__dirname, './data/schedule.json'), JSON.stringify(newSchedule))
            } catch (error) {
                console.error(error)
            }
        } else {
            console.error("User not connected to network! Using previously downloaded wallpaper list.")
        }
    }

    return list
}

const notify = (msg) => {
    alert(msg)
}