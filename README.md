# Conexion-supabase

1. Autenticación en el servidor
1.1 Instala jsonwebtoken
bash
npm install jsonwebtoken
1.2 Define usuario y secreto
Agrega al inicio de tu server.js:

js
const jwt       = require("jsonwebtoken");
const JWT_SECRET = "cambiar_por_un_secreto_muy_seguro";  // o tócalo desde process.env
const ADMIN_USER = { email: "admin@admin.com", password: "admin" };
1.3 Endpoint de login (POST /api/login)
js
// Body: { email, password }
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_USER.email || password !== ADMIN_USER.password) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  // Firma un JWT válido por 1 hora
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ message: "Autenticado", token });
});
1.4 Middleware de protección
js
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No autorizado" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}
1.5 Aplica authenticate a tus rutas CRUD
Envuelve tus rutas /api/records así:

js
app.get   ("/api/records",   authenticate, async (req, res) => { … });
app.post  ("/api/records",   authenticate, async (req, res) => { … });
app.put   ("/api/records/:id", authenticate, async (req, res) => { … });
app.delete("/api/records/:id", authenticate, async (req, res) => { … });
2. Interfaz de login en el frontend
2.1 HTML mínimo
Coloca esto en tu index.html (antes del formulario de registro o tabla):

html
<div id="login-container">
  <h2>Iniciar Sesión</h2>
  <form id="login-form">
    <input id="login-email"    type="email"    placeholder="Email"    required>
    <input id="login-password" type="password" placeholder="Contraseña" required>
    <button type="submit">Entrar</button>
  </form>
  <div id="login-error" style="color:red"></div>
</div>

<div id="app-container" style="display:none">
  <!-- Aquí va tu form de agregar y la tabla de registros -->
</div>
2.2 Lógica de autenticación (app.js)
js
const BASE_URL = "http://localhost:3000";
let authToken = null;

// Al cargar la página, primero muestra login
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-form").addEventListener("submit", signIn);
});

// 1) Función signIn
async function signIn(evt) {
  evt.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const pwd   = document.getElementById("login-password").value;

  try {
    const resp = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || resp.status);
    
    authToken = data.token;
    // Oculta login, muestra app
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display   = "block";
    
    // Ahora que estamos logueados, inicializamos CRUD
    initializeApp();

  } catch (err) {
    document.getElementById("login-error").textContent = err.message;
  }
}

// 2) Inicializa la UI autenticada
function initializeApp() {
  // Lanza carga de registros y asocia eventos
  loadRecords();
  document
    .getElementById("add-record-form")
    .addEventListener("submit", addRecord);
}

// 3) Fetch helper que añade Authorization
async function authFetch(url, opts = {}) {
  opts.headers = {
    ...(opts.headers || {}),
    "Authorization": `Bearer ${authToken}`
  };
  return fetch(url, opts);
}

// 4) Ejemplo de loadRecords usando authFetch
async function loadRecords() {
  try {
    const res  = await authFetch(`${BASE_URL}/api/records`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // … tu lógica para renderizar la tabla …
  } catch (err) {
    console.error("Error cargando registros:", err);
    if (err.message.includes("401")) {
      alert("Sesión inválida. Por favor ingresa de nuevo.");
      location.reload(); // fuerza a login
    }
  }
}

// 5) addRecord, deleteRecord, enterEditMode, etc., usan authFetch igual que loadRecords
async function addRecord(evt) {
  evt.preventDefault();
  // … lectura de inputs …
  const resp = await authFetch(`${BASE_URL}/api/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, age, city })
  });
  // … resto de la lógica …
}
3. Resumen de flujo
Usuario abre la app → solo ve el login form.

Al enviar credenciales correctas, recibe un JWT y se muestra el app-container.

Todas las llamadas a la API usan authFetch() que inyecta el token.

El servidor valida el token en cada endpoint y solo permite operaciones si está autenticado.

Si en cualquier llamada recibe 401, redirige al login.

Con esto tendrás un perfil de administrador seguro (admin@admin.com/admin) que debe autenticarse antes de crear, leer, editar o borrar registros.