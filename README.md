# The Reading Room — Personal Book Library

A responsive, interactive book library management website built with HTML5, CSS3, and vanilla JavaScript.

## Features
- Browse a full catalog with search (title/author), genre filters, availability filters, and sorting
- Genre quick-filter chips
- Click any book to open a detail modal with description, rating, pages, and status
- Borrow / Return system with automatic 14-day due dates, stored via localStorage
- "My Shelf" view showing everything currently borrowed
- Add Book form to catalog new titles (auto-generates a placeholder cover if none given)
- Fully responsive layout (desktop, tablet, mobile) with a mobile hamburger nav
- Card-catalog inspired visual design (wood/brass/paper palette, Playfair Display + Source Sans fonts)

## File Structure
```
book-library/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── books-data.js   (seed catalog data)
│   └── app.js          (app logic: render, search, borrow, form, modal)
└── images/
    └── books/          (generated book cover art, 12 titles)
```

## Running
Just open `index.html` in any browser — no build step or server required.
(For best results with local storage, serve via a simple local server, e.g. `python3 -m http.server`.)

## Tech
- HTML5, CSS3 (Grid/Flexbox, CSS variables, responsive media queries)
- Vanilla JavaScript (no frameworks)
- Browser localStorage for persistence
