Bubble Borough asset-path repair

This patch includes the complete generated sprite-delivery tree and the direct UI image assets used by BubbleBodega, WebSurf, BB Bank, email, medicine/food thumbnails, and fish thumbnails.

It also bumps the app.js cache key in index.html so a browser cannot keep using the pre-migration bundle after fish/decor paths have changed.

Apply this ZIP over the current project root and preserve the directory structure.
