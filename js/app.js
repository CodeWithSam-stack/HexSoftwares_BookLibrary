const STORAGE_KEY = "reading_room_books_v1";
const BORROW_DAYS = 14;

let books = [];
let activeGenreChip = "all";


function loadBooks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      books = JSON.parse(raw);
      return;
    } catch (e) {
      console.warn("Corrupt storage, reseeding.", e);
    }
  }
  books = JSON.parse(JSON.stringify(SEED_BOOKS));
  saveBooks();
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}


function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function starString(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}

function slugFallbackCover(title) {
  
  const colors = ["#2f5d4c","#6b4a34","#a13d3d","#4b3763","#b8895a","#2c3e50"];
  const hash = [...title].reduce((a,c)=>a+c.charCodeAt(0),0);
  return colors[hash % colors.length];
}


function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.view === view);
  });
  document.getElementById("mainNav").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (view === "catalog") renderCatalog();
  if (view === "borrowed") renderBorrowed();
  if (view === "home") renderHome();
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    switchView(link.dataset.view);
  });
});

document.querySelectorAll("[data-goto]").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.goto));
});

document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("mainNav").classList.toggle("open");
});


function renderHome() {
  const total = books.length;
  const available = books.filter(b => b.status === "available").length;
  const borrowed = books.filter(b => b.status === "borrowed").length;
  const genres = new Set(books.map(b => b.genre)).size;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statAvailable").textContent = available;
  document.getElementById("statBorrowed").textContent = borrowed;
  document.getElementById("statGenres").textContent = genres;

  const featured = [...books]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  const row = document.getElementById("featuredRow");
  row.innerHTML = featured.map(b => bookCardHTML(b)).join("");
  attachCardListeners(row);
}


function populateGenreOptions() {
  const genres = [...new Set(books.map(b => b.genre))].sort();
  const select = document.getElementById("genreFilter");
  select.innerHTML = `<option value="all">All Genres</option>` +
    genres.map(g => `<option value="${g}">${g}</option>`).join("");

  const chips = document.getElementById("genreChips");
  chips.innerHTML = `<button class="chip ${activeGenreChip==='all'?'active':''}" data-genre="all">All</button>` +
    genres.map(g => `<button class="chip ${activeGenreChip===g?'active':''}" data-genre="${g}">${g}</button>`).join("");

  chips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      activeGenreChip = chip.dataset.genre;
      document.getElementById("genreFilter").value = activeGenreChip;
      renderCatalog();
    });
  });
}

function getFilteredSortedBooks() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const genre = document.getElementById("genreFilter").value;
  const status = document.getElementById("statusFilter").value;
  const sort = document.getElementById("sortFilter").value;

  let result = books.filter(b => {
    const matchesSearch = !search ||
      b.title.toLowerCase().includes(search) ||
      b.author.toLowerCase().includes(search);
    const matchesGenre = genre === "all" || b.genre === genre;
    const matchesStatus = status === "all" || b.status === status;
    return matchesSearch && matchesGenre && matchesStatus;
  });

  switch (sort) {
    case "title-asc": result.sort((a,b) => a.title.localeCompare(b.title)); break;
    case "title-desc": result.sort((a,b) => b.title.localeCompare(a.title)); break;
    case "author-asc": result.sort((a,b) => a.author.localeCompare(b.author)); break;
    case "year-desc": result.sort((a,b) => b.year - a.year); break;
    case "year-asc": result.sort((a,b) => a.year - b.year); break;
  }
  return result;
}

function renderCatalog() {
  populateGenreOptions();
  const filtered = getFilteredSortedBooks();
  const grid = document.getElementById("bookGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("resultCount");

  count.textContent = `${filtered.length} book${filtered.length !== 1 ? "s" : ""} found`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    grid.innerHTML = filtered.map(b => bookCardHTML(b)).join("");
    attachCardListeners(grid);
  }
}

["searchInput"].forEach(id =>
  document.getElementById(id).addEventListener("input", renderCatalog)
);
["genreFilter", "statusFilter", "sortFilter"].forEach(id =>
  document.getElementById(id).addEventListener("change", () => {
    activeGenreChip = document.getElementById("genreFilter").value;
    renderCatalog();
  })
);
document.getElementById("clearFiltersBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("genreFilter").value = "all";
  document.getElementById("statusFilter").value = "all";
  document.getElementById("sortFilter").value = "title-asc";
  activeGenreChip = "all";
  renderCatalog();
});


function renderBorrowed() {
  const mine = books.filter(b => b.status === "borrowed");
  const grid = document.getElementById("borrowedGrid");
  const empty = document.getElementById("borrowedEmpty");

  if (mine.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    grid.innerHTML = mine.map(b => bookCardHTML(b, true)).join("");
    attachCardListeners(grid);
  }
}


function bookCardHTML(b, showDue = false) {
  const dueInfo = showDue && b.dueDate
    ? `<div class="book-meta"><span>Due ${formatDate(b.dueDate)}</span></div>`
    : "";
  return `
    <div class="book-card" data-id="${b.id}">
      <div class="book-cover-wrap">
        <img src="${b.cover}" alt="${b.title} cover"
             onerror="this.onerror=null; this.style.background='${slugFallbackCover(b.title)}'; this.src='';">
        <span class="badge ${b.status}">${b.status === "available" ? "Available" : "Borrowed"}</span>
      </div>
      <div class="book-info">
        <span class="book-title">${b.title}</span>
        <span class="book-author">${b.author}</span>
        <div class="book-meta">
          <span class="book-genre-tag">${b.genre}</span>
          <span class="stars">${starString(b.rating || 0)}</span>
        </div>
        ${dueInfo}
      </div>
    </div>
  `;
}

function attachCardListeners(container) {
  container.querySelectorAll(".book-card").forEach(card => {
    card.addEventListener("click", () => openModal(card.dataset.id));
  });
}


const overlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");

function openModal(id) {
  const b = books.find(x => x.id === id);
  if (!b) return;

  const isBorrowed = b.status === "borrowed";
  const dueSoon = isBorrowed && b.dueDate && daysUntil(b.dueDate) <= 3;

  modalBody.innerHTML = `
    <div class="modal-cover">
      <img src="${b.cover}" alt="${b.title} cover"
           onerror="this.onerror=null; this.style.background='${slugFallbackCover(b.title)}'; this.src='';">
    </div>
    <div class="modal-details">
      <span class="modal-genre">${b.genre}</span>
      <h2>${b.title}</h2>
      <p class="modal-author">by ${b.author}</p>

      <div class="modal-stats-row">
        <div class="modal-stat"><strong>${b.year}</strong>Published</div>
        <div class="modal-stat"><strong>${b.pages || "—"}</strong>Pages</div>
        <div class="modal-stat"><strong>${b.rating ? b.rating.toFixed(1) : "—"} / 5</strong>Rating</div>
      </div>

      <p class="modal-desc">${b.description || "No description available for this title yet."}</p>

      <div class="modal-status-line">
        <span class="dot ${b.status}"></span>
        ${isBorrowed
          ? `On your shelf — due ${formatDate(b.dueDate)} ${dueSoon ? "⚠️ (due soon)" : ""}`
          : "Available on the shelf"}
      </div>

      <div class="modal-actions">
        ${isBorrowed
          ? `<button class="btn btn-danger" id="returnBtn">Return Book</button>`
          : `<button class="btn btn-primary" id="borrowBtn">Borrow This Book</button>`}
        <button class="btn btn-ghost" id="deleteBtn">Remove from Catalog</button>
      </div>
    </div>
  `;

  overlay.classList.add("open");

  const borrowBtn = document.getElementById("borrowBtn");
  const returnBtn = document.getElementById("returnBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  if (borrowBtn) borrowBtn.addEventListener("click", () => borrowBook(b.id));
  if (returnBtn) returnBtn.addEventListener("click", () => returnBook(b.id));
  if (deleteBtn) deleteBtn.addEventListener("click", () => deleteBook(b.id));
}

function closeModal() {
  overlay.classList.remove("open");
}

document.getElementById("modalClose").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});


function borrowBook(id) {
  const b = books.find(x => x.id === id);
  if (!b || b.status !== "available") return;

  const today = new Date();
  const due = new Date();
  due.setDate(today.getDate() + BORROW_DAYS);

  b.status = "borrowed";
  b.borrowedDate = today.toISOString().slice(0, 10);
  b.dueDate = due.toISOString().slice(0, 10);

  saveBooks();
  closeModal();
  showToast(`📚 "${b.title}" is now on your shelf — due ${formatDate(b.dueDate)}.`);
  refreshCurrentView();
}

function returnBook(id) {
  const b = books.find(x => x.id === id);
  if (!b || b.status !== "borrowed") return;

  b.status = "available";
  b.borrowedDate = null;
  b.dueDate = null;

  saveBooks();
  closeModal();
  showToast(`✅ "${b.title}" has been returned. Thank you!`);
  refreshCurrentView();
}

function deleteBook(id) {
  const b = books.find(x => x.id === id);
  if (!b) return;
  if (!confirm(`Remove "${b.title}" from the catalog permanently?`)) return;

  books = books.filter(x => x.id !== id);
  saveBooks();
  closeModal();
  showToast(`🗑️ "${b.title}" removed from catalog.`);
  refreshCurrentView();
}

function refreshCurrentView() {
  const activeView = document.querySelector(".view.active").id.replace("view-", "");
  if (activeView === "home") renderHome();
  if (activeView === "catalog") renderCatalog();
  if (activeView === "borrowed") renderBorrowed();
}


document.getElementById("addBookForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("fTitle").value.trim();
  const author = document.getElementById("fAuthor").value.trim();
  const genre = document.getElementById("fGenre").value;
  const year = parseInt(document.getElementById("fYear").value, 10);
  const pages = parseInt(document.getElementById("fPages").value, 10) || null;
  const rating = parseFloat(document.getElementById("fRating").value) || 4.0;
  const coverInput = document.getElementById("fCover").value.trim();
  const description = document.getElementById("fDesc").value.trim();

  const msg = document.getElementById("formMsg");

  if (!title || !author || !genre || !year) {
    msg.textContent = "Please fill in all required fields marked with *.";
    msg.className = "form-msg error";
    return;
  }

  const newBook = {
    id: "b" + Date.now(),
    title, author, genre, year, pages,
    rating,
    cover: coverInput || placeholderDataURI(title),
    description: description || "No description provided.",
    status: "available",
    borrowedDate: null,
    dueDate: null
  };

  books.unshift(newBook);
  saveBooks();

  msg.textContent = `✅ "${title}" was added to the catalog!`;
  msg.className = "form-msg success";
  e.target.reset();

  showToast(`📗 "${title}" added to the catalog.`);
});


function placeholderDataURI(title) {
  const colors = ["#2f5d4c","#6b4a34","#a13d3d","#4b3763","#b8895a","#2c3e50"];
  const hash = [...title].reduce((a,c)=>a+c.charCodeAt(0),0);
  const color = colors[hash % colors.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="750">
      <rect width="500" height="750" fill="${color}"/>
      <rect x="0" y="0" width="20" height="750" fill="black" opacity="0.25"/>
      <circle cx="250" cy="310" r="55" fill="none" stroke="white" stroke-opacity="0.5" stroke-width="2"/>
      <text x="250" y="470" font-family="Georgia,serif" font-size="30" fill="white" text-anchor="middle" font-weight="bold">
        ${escapeXML(truncate(title, 24))}
      </text>
    </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
function truncate(str, n) { return str.length > n ? str.slice(0, n - 1) + "…" : str; }
function escapeXML(str) { return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }


function init() {
  loadBooks();
  renderHome();
  populateGenreOptions();
  renderCatalog();
  renderBorrowed();
}

document.addEventListener("DOMContentLoaded", init);
