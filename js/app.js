// ==========================================================================
// Martabak Manja — vanilla JS app logic
// (Konversi dari React state/useReducer ke state JS biasa + DOM manipulation)
// ==========================================================================

// ---- Util ----
function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

// ---- Cart state (menggantikan CartContext + useReducer) ----
const cart = {
  items: [], // { ...product, qty }

  get totalItems() {
    return this.items.reduce((sum, item) => sum + item.qty, 0)
  },
  get totalPrice() {
    return this.items.reduce((sum, item) => sum + item.qty * item.price, 0)
  },
  addItem(product) {
    const existing = this.items.find((item) => item.id === product.id)
    if (existing) {
      existing.qty += 1
    } else {
      this.items.push({ ...product, qty: 1 })
    }
    onCartChange()
  },
  increaseQty(id) {
    const item = this.items.find((i) => i.id === id)
    if (item) item.qty += 1
    onCartChange()
  },
  decreaseQty(id) {
    const item = this.items.find((i) => i.id === id)
    if (item) item.qty -= 1
    this.items = this.items.filter((i) => i.qty > 0)
    onCartChange()
  },
  removeItem(id) {
    this.items = this.items.filter((i) => i.id !== id)
    onCartChange()
  },
  clearCart() {
    this.items = []
    onCartChange()
  },
}

// ---- Render: Navbar cart count ----
function renderCartCount() {
  document.getElementById('mmCartCount').textContent = cart.totalItems
}

// ---- Render: Product cards ----
function productCardHTML(product) {
  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card-warm mm-product-card">
        ${product.badge ? `<span class="badge-corner">${product.badge}</span>` : ''}
        <div class="mm-product-img">
          <img src="${product.img}" alt="${product.name}" loading="lazy" />
        </div>
        <div class="mm-product-body">
          <span class="badge-pill">${product.category}</span>
          <h3 class="mm-product-name">${product.name}</h3>
          <p class="mm-product-desc">${product.desc}</p>
          <div class="mm-product-footer">
            <span class="price-tag">${formatRupiah(product.price)}</span>
            <button class="btn mm-add-btn" data-add-id="${product.id}">+ Keranjang</button>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderProducts(containerId, products) {
  const container = document.getElementById(containerId)
  container.innerHTML = products.map(productCardHTML).join('')

  container.querySelectorAll('[data-add-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = products.find((p) => p.id === btn.dataset.addId)
      cart.addItem(product)

      // Feedback "Ditambahkan ✓" sementara, meniru state justAdded di React
      btn.textContent = 'Ditambahkan ✓'
      btn.classList.add('is-added')
      clearTimeout(btn._resetTimer)
      btn._resetTimer = setTimeout(() => {
        btn.textContent = '+ Keranjang'
        btn.classList.remove('is-added')
      }, 1300)
    })
  })
}

// ---- Render: Cart offcanvas ----
function renderCart() {
  const body = document.getElementById('mmCartBody')

  if (cart.items.length === 0) {
    body.innerHTML = `
      <div class="mm-cart-empty">
        <p>Keranjang Anda masih kosong.</p>
        <p class="text-muted small">Yuk pilih martabak favorit di menu Best Seller atau Unggulan!</p>
      </div>
    `
    return
  }

  const itemsHTML = cart.items
    .map(
      (item) => `
    <li class="mm-cart-item">
      <img src="${item.img}" alt="${item.name}" />
      <div class="mm-cart-item-info">
        <p class="mm-cart-item-name">${item.name}</p>
        <span class="price-tag">${formatRupiah(item.price)}</span>
        <div class="mm-qty-control">
          <button data-decrease-id="${item.id}" aria-label="Kurangi ${item.name}">−</button>
          <span>${item.qty}</span>
          <button data-increase-id="${item.id}" aria-label="Tambah ${item.name}">+</button>
        </div>
      </div>
      <button class="mm-cart-remove" data-remove-id="${item.id}" aria-label="Hapus ${item.name} dari keranjang">✕</button>
    </li>
  `
    )
    .join('')

  body.innerHTML = `
    <ul class="list-unstyled flex-grow-1 mm-cart-list">${itemsHTML}</ul>
    <div class="mm-cart-summary">
      <div class="d-flex justify-content-between mb-3">
        <span>Total Bayar</span>
        <strong>${formatRupiah(cart.totalPrice)}</strong>
      </div>
      <button class="btn-brand w-100" id="mmCheckoutBtn">Checkout dengan QRIS</button>
    </div>
  `

  body.querySelectorAll('[data-increase-id]').forEach((btn) =>
    btn.addEventListener('click', () => cart.increaseQty(btn.dataset.increaseId))
  )
  body.querySelectorAll('[data-decrease-id]').forEach((btn) =>
    btn.addEventListener('click', () => cart.decreaseQty(btn.dataset.decreaseId))
  )
  body.querySelectorAll('[data-remove-id]').forEach((btn) =>
    btn.addEventListener('click', () => cart.removeItem(btn.dataset.removeId))
  )
  const checkoutBtn = document.getElementById('mmCheckoutBtn')
  if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout)
}

// ---- Render: Transaction CTA text ----
function renderTransactionCta() {
  const title = document.getElementById('mmTransactionCtaTitle')
  const hint = document.getElementById('mmTransactionCtaHint')
  const payBtn = document.getElementById('mmPayQrisBtn')

  if (cart.totalItems > 0) {
    title.textContent = `Ada ${cart.totalItems} item siap dibayar.`
    hint.textContent = 'Lanjutkan ke simulasi pembayaran QRIS sekarang.'
    payBtn.disabled = false
    payBtn.style.opacity = '1'
    payBtn.style.cursor = 'pointer'
  } else {
    title.textContent = 'Keranjang masih kosong.'
    hint.textContent = 'Tambahkan minimal satu produk ke keranjang untuk membuka pembayaran QRIS.'
    payBtn.disabled = true
    payBtn.style.opacity = '0.45'
    payBtn.style.cursor = 'not-allowed'
  }
}

// ---- Called whenever cart state changes ----
function onCartChange() {
  renderCartCount()
  renderCart()
  renderTransactionCta()
}

// ---- Offcanvas cart show/hide ----
const cartOffcanvas = document.getElementById('mmCartOffcanvas')
const cartBackdrop = document.getElementById('mmCartBackdrop')

function openCart() {
  cartOffcanvas.classList.add('show')
  cartOffcanvas.setAttribute('aria-hidden', 'false')
  cartBackdrop.classList.remove('d-none')
  document.body.classList.add('mm-no-scroll')
}
function closeCart() {
  cartOffcanvas.classList.remove('show')
  cartOffcanvas.setAttribute('aria-hidden', 'true')
  cartBackdrop.classList.add('d-none')
  document.body.classList.remove('mm-no-scroll')
}

document.getElementById('mmCartOpenBtn').addEventListener('click', openCart)
document.getElementById('mmCartCloseBtn').addEventListener('click', closeCart)
cartBackdrop.addEventListener('click', closeCart)

// ---- QRIS Modal show/hide ----
const qrisModal = document.getElementById('mmQrisModal')
const qrisBackdrop = document.getElementById('mmQrisBackdrop')

function resetQrisModal() {
  document.getElementById('mmQrisPayView').classList.remove('d-none')
  document.getElementById('mmQrisSuccessView').classList.add('d-none')
}

function openQris() {
  if (cart.totalItems === 0) return
  closeCart()
  resetQrisModal()
  document.getElementById('mmQrisTotalItems').textContent = `Total tagihan (${cart.totalItems} item)`
  document.getElementById('mmQrisTotalPrice').textContent = formatRupiah(cart.totalPrice)
  qrisModal.classList.add('show')
  qrisBackdrop.classList.remove('d-none')
  document.body.classList.add('mm-no-scroll')
}
function closeQris() {
  qrisModal.classList.remove('show')
  qrisBackdrop.classList.add('d-none')
  document.body.classList.remove('mm-no-scroll')
}
function handleCheckout() {
  openQris()
}

document.getElementById('mmPayQrisBtn').addEventListener('click', handleCheckout)
document.getElementById('mmQrisCloseBtn').addEventListener('click', closeQris)
qrisBackdrop.addEventListener('click', closeQris)

document.getElementById('mmQrisConfirmBtn').addEventListener('click', () => {
  document.getElementById('mmQrisPayView').classList.add('d-none')
  document.getElementById('mmQrisSuccessView').classList.remove('d-none')
})
document.getElementById('mmQrisDoneBtn').addEventListener('click', () => {
  cart.clearCart()
  closeQris()
})

// ---- Navbar mobile toggle ----
document.getElementById('mmNavToggler').addEventListener('click', () => {
  document.getElementById('mmNavContent').classList.toggle('show')
})
// Close mobile nav when a link is clicked
document.querySelectorAll('#mmNavContent .mm-nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.getElementById('mmNavContent').classList.remove('show')
  })
})

// ---- Video play/pause ----
const promoVideo = document.getElementById('mmPromoVideo')
const videoPlayBtn = document.getElementById('mmVideoPlayBtn')

if (promoVideo && videoPlayBtn) {
  videoPlayBtn.addEventListener('click', () => {
    if (promoVideo.paused) {
      promoVideo.play()
      promoVideo.setAttribute('controls', '')
      videoPlayBtn.classList.add('d-none')
    } else {
      promoVideo.pause()
    }
  })
  promoVideo.addEventListener('pause', () => {
    videoPlayBtn.classList.remove('d-none')
  })
  promoVideo.addEventListener('play', () => {
    videoPlayBtn.classList.add('d-none')
  })
  promoVideo.addEventListener('error', () => {
    document.getElementById('mmVideoFrameWrap').classList.add('mm-video-error')
  })
}

// ---- Footer year ----
document.getElementById('mmFooterYear').textContent = new Date().getFullYear()

// ---- Initial render ----
renderProducts('mmBestSellerGrid', bestSellerProducts)
renderProducts('mmUnggulanGrid', unggulanProducts)
onCartChange()
