# 📊 CSV Upload API


Una API en Node.js que permite subir archivos CSV, validar sus datos y almacenarlos en una base de datos PostgreSQL. Ideal para importar registros de transacciones, clientes, facturas y más.


---


## 🚀 Funcionalidades


- Subida de archivos CSV mediante `Multer`
- Validación de datos por fila
- Inserción masiva en múltiples tablas relacionales
- Limpieza automática de archivos temporales
- Manejo de errores robusto


---


## 🧰 Tecnologías


- Node.js + Express
- PostgreSQL + pg
- Multer (para manejo de archivos)
- csv-parser (para leer CSVs)
- pg-format (para inserciones masivas)


---


## 📁 Estructura del proyecto


Es posible que Copilot cometa errores. Tus conversaciones son personalizadas y ayudan a entrenar la inteligencia artificial. Optar por no recibir.
Hoy
Oyes me puedes dar el readme del archivo que hicimos ??
¡Claro que sí, Miguel! Como no tengo acceso directo a tus archivos, pero sé que estás trabajando en una app con CRUD, carga de CSV, entrada manual de registros y autenticación, puedo ayudarte a redactar un README.md completo y claro para tu proyecto. Aquí tienes una versión base que puedes adaptar según los detalles específicos:


markdown
# 📊 RegistroApp


Una aplicación web para gestionar registros de usuarios mediante carga de archivos CSV, entrada manual y autenticación segura.


## 🚀 Características


- Autenticación con JWT
- Operaciones CRUD completas
- Carga de archivos CSV con validación
- Entrada manual de registros
- API RESTful con Express.js
- Base de datos PostgreSQL
- Interfaz amigable con JavaScript puro


## 🛠️ Tecnologías


- Backend: Node.js + Express.js
- Base de datos: PostgreSQL
- Autenticación: JWT
- Frontend: HTML, CSS, JavaScript
- Otros: Multer (para subir archivos), CSV parser


## 📁 Estructura del proyecto


├── backend/ │ ├── controllers/ │ ├── routes/ │ ├── models/ │ ├── middleware/ │ └── app.js ├── frontend/ │ ├── index.html │ ├── styles.css │ └── script.js ├── uploads/ ├── README.md └── .env




## 🔐 Autenticación


Los usuarios deben iniciar sesión para acceder a las funcionalidades. Se utiliza JWT para proteger las rutas privadas.


## 📥 Carga de CSV


- Se aceptan archivos `.csv` con columnas específicas.
- Se validan columnas extra y errores de formato.
- Los datos se insertan en la base de datos de forma segura.


## ✍️ Entrada manual


Los usuarios pueden agregar registros directamente desde el frontend mediante formularios.


## 📦 Instalación


1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/registroapp.git
   cd registroapp
   bash
   Instala dependencias:
   npm install
   Configura el archivo .env:


   PORT=3000
   DB_URL=postgres://usuario:contraseña@localhost:5432/tu_db
   JWT_SECRET=tu_clave_secreta
   Ejecuta el servidor:
   

bash
npm start
🧪 Pruebas
Puedes usar herramientas como Postman para probar las rutas protegidas y públicas. También se incluye validación de errores comunes como columnas extra en CSV o datos faltantes.


🤝 Contribuciones
¡Bienvenidas! Siéntete libre de abrir issues o enviar pull requests.
