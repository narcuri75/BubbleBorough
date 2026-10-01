# WebSurf bookmark reordering

Phase 8 adds pointer-based drag-and-release ordering for saved WebSurf bookmarks.

- Saved bookmark order is the order of `state.webSurf.bookmarks`; no separate sort key is needed.
- The same order drives the browser bookmark bar and the saved bookmark cards on WebSurf Home.
- A pointer must move at least 7 CSS pixels before a normal click becomes a drag.
- During a drag the original control becomes a dashed insertion slot and a fixed clone follows the pointer.
- Reordering uses DOM insertion, so wrapped Home rows can be crossed naturally.
- The horizontal bookmark bar auto-scrolls when dragging near either edge.
- Releasing commits the new array order through `saveState()` without changing `createdAt` values.
- Escape and pointer cancellation discard the temporary order and re-render from the saved state.
- A short post-drag click suppression window prevents release from accidentally navigating to the dragged bookmark.
- New bookmarks continue to append to the end; deleting one simply removes that entry without disturbing the remaining order.
- The existing WebSurf state sanitizer preserves array order after save/load and restart once default bookmarks have been seeded.
