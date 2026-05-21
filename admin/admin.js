import {
  db,
  storage,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL
} from "../firebase.js";

const statuses = ["Нове", "В роботі", "Відправлено", "Завершено"];

let products = [];
let orders = [];

const productForm = document.getElementById("productForm");
const productImageFile = document.getElementById("productImageFile");
const productImageUrl = document.getElementById("productImageUrl");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");
const saveProductBtn = document.getElementById("saveProductBtn");
const adminProducts = document.getElementById("adminProducts");
const ordersTable = document.getElementById("ordersTable");
const exportOrders = document.getElementById("exportOrders");

function money(value) {
  return new Intl.NumberFormat("uk-UA").format(Number(value || 0)) + " грн";
}

productImageFile.addEventListener("change", () => {
  const file = productImageFile.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreviewWrap.classList.remove("hidden");
});

productImageUrl.addEventListener("input", () => {
  if (!productImageUrl.value) return;
  imagePreview.src = productImageUrl.value;
  imagePreviewWrap.classList.remove("hidden");
});

productForm.addEventListener("submit", async event => {
  event.preventDefault();

  saveProductBtn.disabled = true;
  saveProductBtn.textContent = "Завантажую...";

  try {
    let imageUrl = productImageUrl.value.trim();
    const file = productImageFile.files?.[0];

    if (file) {
      const fileName = `${Date.now()}-${file.name}`;
      const imageRef = ref(storage, `products/${fileName}`);
      await uploadBytes(imageRef, file);
      imageUrl = await getDownloadURL(imageRef);
    }

    if (!imageUrl) {
      alert("Додай фото файлом або посиланням.");
      return;
    }

    const product = {
      id: Date.now(),
      name: document.getElementById("productName").value.trim(),
      category: document.getElementById("productCategory").value,
      price: Number(document.getElementById("productPrice").value),
      oldPrice: Number(document.getElementById("productOldPrice").value || document.getElementById("productPrice").value),
      sizes: document.getElementById("productSizes").value.split(",").map(item => item.trim()).filter(Boolean),
      colors: document.getElementById("productColors").value.split(",").map(item => item.trim()).filter(Boolean),
      tag: document.getElementById("productTag").value.trim() || "Новинка",
      image: imageUrl,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "products"), product);

    productForm.reset();
    document.getElementById("productSizes").value = "S,M,L";
    document.getElementById("productTag").value = "Новинка";
    imagePreviewWrap.classList.add("hidden");
  } catch (error) {
    console.error(error);
    alert("Помилка додавання товару. Перевір firebaseConfig, Firestore і Storage rules.");
  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.textContent = "Додати товар";
  }
});

function listenProducts() {
  const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));

  onSnapshot(productsQuery, snapshot => {
    products = snapshot.docs.map(docItem => ({
      firebaseId: docItem.id,
      ...docItem.data()
    }));

    renderProducts();
  });
}

function renderProducts() {
  if (!products.length) {
    adminProducts.innerHTML = `<p class="empty">Товарів ще немає. Додай перший товар вище.</p>`;
    return;
  }

  adminProducts.innerHTML = products.map(product => `
    <div class="admin-product">
      <img src="${product.image}" alt="${product.name}" />
      <div class="admin-product-info">
        <strong>${product.name}</strong>
        <span>${money(product.price)}</span>
      </div>
      <button class="delete-btn" data-id="${product.firebaseId}">×</button>
    </div>
  `).join("");

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Видалити товар?")) return;
      await deleteDoc(doc(db, "products", btn.dataset.id));
    });
  });
}

function listenOrders() {
  const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));

  onSnapshot(ordersQuery, snapshot => {
    orders = snapshot.docs.map(docItem => ({
      firebaseId: docItem.id,
      ...docItem.data()
    }));

    renderOrders();
    renderCounts();
  });
}

function renderCounts() {
  document.getElementById("countNew").textContent = orders.filter(o => o.status === "Нове").length;
  document.getElementById("countWork").textContent = orders.filter(o => o.status === "В роботі").length;
  document.getElementById("countSent").textContent = orders.filter(o => o.status === "Відправлено").length;
  document.getElementById("countDone").textContent = orders.filter(o => o.status === "Завершено").length;
}

function renderOrders() {
  if (!orders.length) {
    ordersTable.innerHTML = `<p class="empty">Замовлень ще немає.</p>`;
    return;
  }

  ordersTable.innerHTML = `
    <div class="order-head">
      <span>ID</span>
      <span>Клієнт</span>
      <span>Телефон</span>
      <span>Сума</span>
      <span>Місто</span>
      <span>Статус</span>
    </div>
    ${orders.map(order => `
      <div class="order-row">
        <span>#${order.id || order.firebaseId.slice(0, 6)}</span>
        <div class="order-client">
          <strong>${order.name || "Без імені"}</strong>
          <small>${order.product || "Товар"} • ${order.size || "-"} • ${order.qty || 1} шт.</small>
        </div>
        <span>${order.phone || "-"}</span>
        <strong>${money(order.total)}</strong>
        <span>${order.city || "-"}</span>
        <select class="order-status" data-id="${order.firebaseId}">
          ${statuses.map(status => `<option ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </div>
    `).join("")}
  `;

  document.querySelectorAll(".order-status").forEach(select => {
    select.addEventListener("change", async () => {
      await updateDoc(doc(db, "orders", select.dataset.id), {
        status: select.value
      });
    });
  });
}

exportOrders.addEventListener("click", () => {
  const header = "ID;Ім'я;Телефон;Товар;Кількість;Розмір;Місто;Статус;Сума\n";
  const rows = orders.map(o => [
    o.id || o.firebaseId,
    o.name || "",
    o.phone || "",
    o.product || "",
    o.qty || "",
    o.size || "",
    o.city || "",
    o.status || "",
    o.total || ""
  ].join(";")).join("\n");

  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tviy-odyag-orders.csv";
  a.click();
  URL.revokeObjectURL(url);
});

listenProducts();
listenOrders();
