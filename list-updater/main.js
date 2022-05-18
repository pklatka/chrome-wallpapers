const { getWallpapers } = require('./selenium')
const axios = require('axios')
const { intervalInMiliseconds } = require('./settings.json')
const fs = require('fs')
const path = require('path')

// Global variables
var WH_MAX_WEBSITE_COUNT = 200

const main = async () => {
    try {
        // Check for internet connection
        await axios.get('https://example.com/')

        // Fetch wallpapers from Chrome browser
        const categories = await getWallpapers()

        // Fetch wallpapers from https://wallpaperhub.app/
        wallpaperhubWallpapers = []
        const fetchConfig = await axios({
            method: 'get',
            url: 'https://wallpaperhub.app/api/v1/wallpapers/?limit=&page=1&query=&width=3000&height=2500&tags='
        })

        const currentLimit = fetchConfig.data.limit
        const requiredNoPages = Math.ceil(WH_MAX_WEBSITE_COUNT / currentLimit)
        const totalPages = requiredNoPages > fetchConfig.data.totalPages ? fetchConfig.data.totalPages : requiredNoPages
        let currentPage = 1
        while (currentPage < totalPages) {
            const fetchConfig = await axios({
                method: 'get',
                url: `https://wallpaperhub.app/api/v1/wallpapers/?limit=&page=${currentPage}&query=&width=3000&height=2500&tags=`
            })

            for (const entity of fetchConfig.data.entities) {
                // Find original and 4K wallpaper
                // Always choose 4K rather than original
                let url4K = "", urlOriginal = ""

                for (const wallpaper of entity.entity.variations[0].resolutions) {
                    if (wallpaper.resolutionLabel == "Original") {
                        urlOriginal = wallpaper.url
                        break;
                    }
                    // if (wallpaper.resolutionLabel == "4K") {
                    //     url4K = wallpaper.url
                    // }
                }

                wallpaperhubWallpapers.push({
                    imageUrl: urlOriginal,
                    thumbnailImageUrl: entity.entity.thumbnail,
                    title: entity.entity.title
                })
            }

            currentPage++;
        }

        categories.push({
            categoryTitle: "Wallpaperhub.app",
            id: "wallpaperhub",
            thumbnailImageUrl: "https://cdn.wallpaperhub.app/cloudcache/7/5/8/5/b/d/7585bdd2cab6b676fa443d064ee1946eaea5eb60.jpg",
            wallpapers: wallpaperhubWallpapers
        })

        // Save download time
        const millis = new Date().getTime()
        fs.writeFileSync(path.join(__dirname, './settings.json'), JSON.stringify({ intervalInMiliseconds, runDate: new Date(millis + intervalInMiliseconds) }))

        await axios({
            method: 'post',
            url: 'https://www.klatka.it/chrome-wallpapers-list-update',
            data: { createdAt: new Date(), validUntil: new Date(new Date().getTime() + intervalInMiliseconds), categories },
            headers: {
                'verysecretpassword': 'R0licwKfea46V0Bk59MwXMr41wh1o0OEnMkuGJxU'
            }
        })
    } catch (error) {
        console.log(error)
    }
}

main()
