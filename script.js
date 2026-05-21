import {
  db,
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "./firebase.js";

const fallbackProducts = [
  {
    id: 1,
    name: "Літня сукня Candy Pink",
    category: "Жіноче",
    price: 799,
    oldPrice: 1099,
    sizes: ["S", "M", "L"],
    colors: ["Рожевий", "Білий"],
    tag: "Хіт Reels",
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: 2,
    name: "Сорочка Oversize Lemon",
    category: "Жіноче",
    price: 650,
    oldPrice: 890,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Жовтий", "Білий"],
    tag: "Новинка",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: 3,
    name: "Джинси Blue Street",
    category: "Жіноче",
    price: 1190,
    oldPrice: 1490,
    sizes: ["XS", "S", "M", "L"],
    colors: ["Синій"],
    tag: "Топ продажів",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1200&auto=format&fit=crop"
  },
  {
    id: 4,
    name: "Біла базова футболка",
    category: "Чоловіче",
    price: 420,
    oldPrice: 590,
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Білий", "Чорний"],
    tag: "База",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop"
  }
];

const categories = ["Всі", "Новинки", "Жіноче", "Чоловіче", "Акції"];

let products = [...fallbackProducts];
let activeCategory = "Всі";
let selectedProduct = null;
let qty = 1;

const productGrid = document.getElementById("productGrid");
const categoryTabs = document.getElementById("categoryTabs");
const searchInput = document.getElementById("searchInput");

const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const customerSize = document.getElementById("customerSize");
const qtyValue = document.getElementById("qtyValue");
const orderForm = document.getElementById("orderForm");
const toast = document.getElementById("toast");

function money(value) {
  return new Intl.NumberFormat("uk-UA").format(Number(value || 0)) + " грн";
}

function renderTabs() {
  categoryTabs.innerHTML = categories.map(category => `
    <button class="tab ${activeCategory === category ? "active" : ""}" data-category="${category}">
      ${category}
    </button>
  `).join("");

  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderTabs();
      renderProducts();
    });
  });
}

function getVisibleProducts() {
  const search = searchInput.value.trim().toLowerCase();

  return products.filter(product => {
    const byCategory =
      activeCategory === "Всі" ||
      product.category === activeCategory ||
      (activeCategory === "Новинки" && product.tag === "Новинка");

    const bySearch = product.name.toLowerCase().includes(search);

    return byCategory && bySearch;
  });
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();

  if (!visibleProducts.length) {
    productGrid.innerHTML = `<div class="empty">Товарів не знайдено</div>`;
    return;
  }

  productGrid.innerHTML = visibleProducts.map(product => `
    <article class="product">
      <div class="product-img">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <span class="product-tag">${product.tag || "Новинка"}</span>
      </div>
      <div class="product-body">
        <div class="product-title-row">
          <div>
            <h3>${product.name}</h3>
            <div class="product-meta">${product.category || "Товар"} • ${(product.sizes || []).join(" / ")}</div>
          </div>
          <div>
            <div class="price">${money(product.price)}</div>
            <div class="old-price">${money(product.oldPrice || product.price)}</div>
          </div>
        </div>
        <button class="btn btn-primary order-btn" data-id="${product.firebaseId || product.id}">
          Замовити
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const product = products.find(item => String(item.firebaseId || item.id) === String(id));
      openModal(product);
    });
  });
}

function openModal(product) {
  selectedProduct = product;
  qty = 1;

  modalImage.src = product.image;
  modalTitle.textContent = product.name;
  qtyValue.textContent = qty;
  updateModalPrice();

  customerSize.innerHTML = (product.sizes || ["One size"]).map(size => `
    <option value="${size}">${size}</option>
  `).join("");

  modal.classList.remove("hidden");
}

function closeModalWindow() {
  modal.classList.add("hidden");
  selectedProduct = null;
  orderForm.reset();
}

function updateModalPrice() {
  if (!selectedProduct) return;
  modalPrice.textContent = money(selectedProduct.price * qty);
}

document.getElementById("minusQty").addEventListener("click", () => {
  qty = Math.max(1, qty - 1);
  qtyValue.textContent = qty;
  updateModalPrice();
});

document.getElementById("plusQty").addEventListener("click", () => {
  qty++;
  qtyValue.textContent = qty;
  updateModalPrice();
});

closeModal.addEventListener("click", closeModalWindow);

modal.addEventListener("click", event => {
  if (event.target.dataset.close) closeModalWindow();
});

searchInput.addEventListener("input", renderProducts);

orderForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!selectedProduct) return;

  const order = {
    id: Date.now(),
    productId: selectedProduct.firebaseId || selectedProduct.id,
    product: selectedProduct.name,
    productImage: selectedProduct.image,
    price: Number(selectedProduct.price),
    qty,
    total: Number(selectedProduct.price) * qty,
    size: document.getElementById("customerSize").value,
    name: document.getElementById("customerName").value,
    phone: document.getElementById("customerPhone").value,
    city: document.getElementById("customerCity").value,
    delivery: document.getElementById("customerDelivery").value,
    comment: document.getElementById("customerComment").value,
    status: "Нове",
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "orders"), order);
    showToast("Замовлення створено ✅");
    closeModalWindow();
  } catch (error) {
    console.error(error);
    alert("Помилка збереження замовлення. Перевір firebaseConfig і правила Firestore.");
  }
});

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

function loadProductsFromFirebase() {
  try {
    const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));

    onSnapshot(productsQuery, snapshot => {
      const firebaseProducts = snapshot.docs.map(docItem => ({
        firebaseId: docItem.id,
        ...docItem.data()
      }));

      products = firebaseProducts.length ? firebaseProducts : fallbackProducts;
      renderProducts();
    }, error => {
      console.warn(error);
      products = fallbackProducts;
      renderProducts();
    });
  } catch (error) {
    console.warn(error);
    products = fallbackProducts;
    renderProducts();
  }
}

renderTabs();
renderProducts();
loadProductsFromFirebase();
