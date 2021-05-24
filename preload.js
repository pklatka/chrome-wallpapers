// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const fs = require('fs')
const path = require('path')
const wallpaper = require('wallpaper')
const axios = require('axios')
const storage = require('electron-json-storage')
const settings = require(path.join(__dirname, './data/settings.json'))
const { ipcRenderer } = require('electron')
let temporarySelected = []
let schedule = storage.getSync('schedule')

const loader = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>'
const checked = '<div class="checked"></div>'
let interval;

window.addEventListener('DOMContentLoaded', async () => {
    try {
        document.querySelector('input#interval-value').value = schedule.inputValue == 0 ? '' : schedule.inputValue
        document.querySelector('select').selectedIndex = schedule.selectedIndex
        document.querySelector('input#shuffle').checked = schedule.shuffle
        document.querySelector('input#autostart').checked = schedule.autostart
        document.querySelector('input#close').checked = schedule.autoclose
        document.querySelector('button#startstop').textContent = schedule.enabled == true ? 'STOP INTERVAL' : 'START INTERVAL'

        const list = await getWallpapersList('onstart')

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
                        document.querySelector(`div[data-type="categories"][data-id="${el.id}"]`).innerHTML = checked
                    }
                })
            } else {
                document.querySelectorAll('div.checked').forEach(el => {
                    el.parentElement.innerHTML = ''
                })
                temporarySelected.forEach(el => el.innerHTML = checked)
                e.target.classList.remove('hide')
                temporarySelected = []
                e.target.textContent = 'SHOW SELECTED'
            }
        })

        document.querySelector('input#autostart').addEventListener('click', (e) => {
            ipcRenderer.invoke('runOnLogin', e.target.checked)
            schedule.autostart = e.target.checked
            storage.set('schedule', schedule, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        })

        document.querySelector('input#close').addEventListener('click', (e) => {
            schedule.autoclose = e.target.checked
            storage.set('schedule', schedule, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        })

        document.querySelector('button#save').addEventListener('click', () => {
            const autostart = document.querySelector('input#autostart').checked
            if (!autostart) {
                notify("Autostart must be on to make schedule work!", 2)
                return;
            }
            const selectedIndex = document.querySelector('select').selectedIndex
            const inputValue = Number(document.querySelector('input#interval-value').value)
            if (inputValue < 1 && selectedIndex != 6) {
                notify("Time value must be greater than zero!", 2)
                return;
            }
            const interval = inputValue * Number(document.querySelector('select').value) * 1000
            const autoclose = document.querySelector('input#close').checked
            const shuffle = document.querySelector('input#shuffle').checked
            const categories = []
            let wallpapers = [...document.querySelectorAll('div.checked')].map(el => {
                let r;
                if (el.parentElement.dataset.type === "wallpapers") {
                    r = { imageUrl: el.parentElement.dataset.imageUrl, active: false, type: 'wallpaper' }
                } else if (el.parentElement.dataset.type === "categories") {
                    categories.push(el.parentElement.dataset.id)
                    r = { id: el.parentElement.dataset.id, type: 'category' }
                }
                el.remove()
                return r
            })

            if (wallpapers.length <= 0) {
                return notify("No wallpapers selected.", 2)
            }

            wallpapers[0].active = true
            const newSchedule = {
                enabled: true, interval, autostart,autoclose, nextRunDate: new Date(new Date().getTime() + interval), inputValue, selectedIndex, shuffle, categories, wallpapers
            }
            storage.set('schedule', newSchedule, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            schedule = newSchedule
            document.querySelector('button#startstop').textContent = 'STOP INTERVAL'
            temporarySelected = []
            notify("Schedule saved.")
            startInterval()
            if (document.querySelector('button#show').textContent == "HIDE SELECTED") {
                document.querySelector('button#show').click()
            }
        })
        document.querySelector('button#clear').addEventListener('click', () => {
            document.querySelectorAll('div.checked').forEach(el => el.remove())
        })
        document.querySelector('button#startstop').addEventListener('click', async e => {
            if (e.target.textContent == 'STOP INTERVAL') {
                clearInterval(interval)
                schedule.enabled = false
                e.target.textContent = 'START INTERVAL'
                notify('Interval has been stopped!', 1)
            } else {
                // Start schedule
                schedule.enabled = true
                e.target.textContent = 'STOP INTERVAL'
                await startInterval()
                notify('Interval has been enabled!', 1)
            }
            storage.set('schedule', schedule, (err) => {
                if (err) {
                    console.error(err)
                }
            })
        })
    } catch (error) {
        notify('Something went wrong!', 3)
        console.error(error)
    }
})

const addToSchedule = e => {
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
    try {
        if (e.target.dataset.type === "categories") {
            document.querySelector(`section#categories`).classList.add('hidden')
            document.querySelector(`section#${e.target.dataset.id}`).classList.remove('hidden')
            document.querySelector('button#back').classList.remove('hidden')
        } else {
            if (e.target.innerHTML !== '') {
                return
            }
            e.target.innerHTML += loader
            await changeWallpaper(e.target.dataset.imageUrl)
            e.target.innerHTML = ''
        }
    } catch (error) {
        notify('Something went wrong!', 3)
        console.error(error)
    }
}

const getWallpapersList = async (mode = "default") => {
    try {
        let list = storage.getSync('wallpapers')
        if (Object.keys(list).length === 0 || new Date() > new Date(list.validUntil)) {
            if (navigator.onLine) {
                try {
                    if (mode == "onstart") {
                        document.querySelector('main').innerHTML += `<section class="loader">${loader}</section>`
                    }
                    document.querySelector('input#interval-value').value = schedule.inputValue == 0 ? '' : schedule.inputValue
                    document.querySelector('select').selectedIndex = schedule.selectedIndex
                    document.querySelector('input#shuffle').checked = schedule.shuffle
                    document.querySelector('input#autostart').checked = schedule.autostart
                    document.querySelector('input#close').checked = schedule.autoclose
                    const response = await fetch(settings.wallpapersListSource)
                    const data = await response.json()
                    
                    if(data.validUntil !== list.validUntil){
                        list = data
                        storage.set('wallpapers', data, (err) => {
                            if (err) {
                                console.error(err)
                            }
                        })
    
                        // Autoupdate category photos in schedule
                        if (Object.keys(schedule).length !== 0) {
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
                            storage.set('schedule', newSchedule, (err) => {
                                if (err) {
                                    console.error(err)
                                }
                            })
                            schedule = newSchedule
                        }
                    }
                } catch (error) {
                    notify('Something went wrong!', 3)
                    console.error(error)
                }
            } else {
                notify('User not connected to network!', 3)
                console.error("User not connected to network! Using previously downloaded wallpaper list.")
            }

            if (mode == "onstart" && document.querySelector('section.loader')) {
                document.querySelector('section.loader').remove()
            }

        }

        return list
    } catch (error) {
        notify('Something went wrong!', 3)
        console.error(error)
    }
}

const notify = (msg, status = 0, timeout = 5000) => {
    // Status codes:
    //  - 0 -> Success!
    //  - 1 -> Info!
    //  - 2 -> Warning!
    //  - 3 -> Danger!

    const notificationBlock = document.querySelector('div.notify')

    switch (status) {
        case 0:
            notificationBlock.textContent = `Success: ${msg}`
            notificationBlock.className = 'notify success'
            break;
        case 1:
            notificationBlock.textContent = `Information: ${msg}`
            notificationBlock.className = 'notify information'
            break;
        case 2:
            notificationBlock.textContent = `Warning: ${msg}`
            notificationBlock.className = 'notify warning'
            break;
        case 3:
            notificationBlock.textContent = `Danger: ${msg}`
            notificationBlock.className = 'notify danger'
            break;
        default:
            notificationBlock.textContent = `Information: ${msg}`
            notificationBlock.className = 'notify information'
            break;
    }

    notificationBlock.classList.add('active')

    setTimeout(() => {
        notificationBlock.classList.remove('active')
    }, timeout)
}

const changeWallpaper = async (url) => {
    try {
        const res = await axios({
            url,
            responseType: 'arraybuffer'
        })
        fs.writeFileSync(path.join(storage.getDefaultDataPath(), './wallpaper.jpg'), Buffer.from(res.data, 'binary'))
        await wallpaper.set(path.join(storage.getDefaultDataPath(), './wallpaper.jpg'))
    } catch (error) {
        notify('Something went wrong!', 3)
        console.error(error)
    }
}

const getNextWallpaperUrl = () => {
    // Find active wallpaper
    let activeWallpaperIndex = schedule.wallpapers.findIndex(el => el.active == true)
    if (activeWallpaperIndex == -1) return;

    schedule.wallpapers[activeWallpaperIndex].active = false

    const wallpaperLength = schedule.wallpapers.length

    if (schedule.shuffle) {
        do {
            activeWallpaperIndex = Math.floor(Math.random() * wallpaperLength)
        } while (schedule.wallpapers[activeWallpaperIndex].type !== "wallpaper")
    } else {
        do {
            if (activeWallpaperIndex == wallpaperLength - 1) {
                activeWallpaperIndex = 0
            } else {
                activeWallpaperIndex += 1;
            }
        } while (schedule.wallpapers[activeWallpaperIndex].type !== "wallpaper")
    }
    schedule.wallpapers[activeWallpaperIndex].active = true
    schedule.nextRunDate = new Date(new Date().getTime() + schedule.interval)
    storage.set('schedule', schedule, (err) => {
        if (err) {
            console.error(err)
        }
    })

    return schedule.wallpapers[activeWallpaperIndex].imageUrl
}

const handleInterval = async (type) => {
    if (type == 'on-demand' || schedule.interval == 0 || new Date().getTime() >= new Date(schedule.nextRunDate).getTime() - 1000) {
        await changeWallpaper(getNextWallpaperUrl())
        return true
    }else{
        return false
    }
}

const startInterval = async () => {
    clearInterval(interval)

    if (!schedule.enabled) return;

    let executed;

    if (schedule.interval == 0) {
        executed = await handleInterval('on-demand')
    } else {
        executed = await handleInterval('on-demand')
        interval = setInterval(handleInterval, schedule.interval);
    }

    return executed
}

ipcRenderer.on('next-wallpaper', async (event) => {
    await handleInterval('on-demand')
})

const startup = async () => {
    const executed = await startInterval()

    if(executed && schedule.autoclose){
        ipcRenderer.invoke('closeApp')
    }
}

startup()