// Paste this code to executeAsyncScript in main.js

const getWallpapers = async () => {
    // Click customization button
    document.querySelector("body > ntp-app").shadowRoot.querySelector("#customizeIcon").click()

    await new Promise(r => setTimeout(r, 1000));

    const data = []

    const categories = document.querySelector("body > ntp-app").shadowRoot.querySelector("ntp-customize-dialog").shadowRoot.querySelector("#backgrounds").shadowRoot.querySelectorAll("#collections > div.tile")
    
    let wallpapersInCategory;

    for(const category of categories){
        if(category.hasAttribute('title')){
            category.click()
            await new Promise(r => setTimeout(r, 2000));
            const categoryUrl = category.innerHTML
            const thumbnailImageUrl = categoryUrl.slice(categoryUrl.indexOf('image?')+6,categoryUrl.indexOf('-mv')+3)
            const categoryTitle = category.getAttribute('title')

            wallpapersInCategory = document.querySelector("body > ntp-app").shadowRoot.querySelector("ntp-customize-dialog").shadowRoot.querySelector("#backgrounds").shadowRoot.querySelectorAll("#images > div.tile")   

            let wallpapersArray = []

            for(const wallpaper of wallpapersInCategory){
                const wallpaperHTML = wallpaper.innerHTML
                const thumbnailImageUrl = wallpaperHTML.slice(wallpaperHTML.indexOf('image?')+6,wallpaperHTML.indexOf('-mv')+3)
                const imageUrl = thumbnailImageUrl.replace('w156','w3840').replace('h117','h2160')
                const title = wallpaper.getAttribute('title')
                wallpapersArray.push({
                    title, imageUrl, thumbnailImageUrl
                })
            }

             data.push({
                id: categoryTitle.toLowerCase().replaceAll(' ', '_'), categoryTitle, thumbnailImageUrl, wallpapers: wallpapersArray
             })

            // Return to main categories
            document.querySelector("body > ntp-app").shadowRoot.querySelector("ntp-customize-dialog").shadowRoot.querySelector("#backButton").shadowRoot.querySelector("#maskedImage").click()
        }
    }
    
    return data
}

return await getWallpapers()
// getWallpapers()
