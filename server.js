// 1. Importaciones y configuración básica

const express = require("express");       // Framework minimalista para construir APIs HTTP
const multer = require('multer');         // Middleware para manejar multipart/form-data (subida de archivos)
const path = require('path');             // Utilidades de rutas de archivo
const pool = require('./db');             // Cliente/configuración de PostgreSQL (pool de conexiones)
const cors = require("cors");             // Middleware para habilitar CORS (solicitudes desde otro origen)
const fs = require('fs');                 // Sistema de archivos de Node.js
const csv = require('csv-parser');        // Lector/parcer de archivos CSV
const format = require('pg-format');      // Ayuda a formatear consultas SQL con múltiples valores

const app = express();                    // Instancia principal de Express

// 2. Endpoints de prueba y Middlewares globales

// GET /test-db  
// Nos permite verificar que la conexión a la base de datos funcione correctamente
app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ now: result.rows[0].now });
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Habilitamos CORS para permitir peticiones desde el frontend  
app.use(cors());

// Permitimos recibir cuerpos JSON en las peticiones
app.use(express.json());

// Servimos archivos estáticos (HTML, CSS, JS) desde la carpeta /public
app.use(express.static(path.join(__dirname, "public")));


//Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


// 3. Configuración de Multer para subir CSVs
const upload = multer({
    dest: "uploads/", // Carpeta temporal donde se guarda el CSV
    limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5 MB por archivo
    fileFilter: (req, file, callback) => {
        // Aceptamos sólo archivos con mimetype text/csv o extensión .csv
        const isCsv = file.mimetype === "text/csv" || path.extname(file.originalname).toLowerCase() === ".csv";
        if (!isCsv) {
            // Rechaza el archivo y envía un error
            return callback(new Error("Solo se admiten archivos CSV"), false);
        }
        callback(null, true);
    }
});

// 4. Upload de CSV y parseo de sus filas

// POST /uploads  
// Recibe un CSV, lo valida, lo guarda temporalmente, lee cada fila y lo inserta en la base
app.post("/uploads", upload.single("file"), (req, res) => {
    // Si no llegó ningún archivo, devolvemos error 400
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo.');
    }
    const results = []; // Aquí guardaremos las filas válidas
    let invalid = false; // Flag para detectar datos inválidos en cualquier fila

      // Asegurarnos de que exista la carpeta 'uploads' en disco
    if (!fs.existsSync('./uploads')) {
        fs.mkdirSync('./uploads');
    }

      // Creamos un stream de lectura y lo encadenamos al parser CSV
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
            // Validamos cada fila: nombre, edad (entero positivo) y ciudad no vacíos
            const { name, age, city } = row;
            if (!name || name.trim() === "" || !Number.isInteger(+age) || +age <= 0 || !city || city.trim() === "") {
                invalid = true; // Marcamos como inválido y saltamos esta fila
                return;
            }
            // Si es válido, lo normalizamos y guardamos en el array
            results.push({ name: name.trim(), age: +age, city: city.trim() });
        })
        .on('end', async () => {
            // Una vez leído todo el CSV:
            if (invalid) {
                  // Si alguna fila fue inválida, borramos el archivo y respondemos 400
                fs.unlink(req.file.path, () => {
                    return res.status(400).send('Datos inválidos en alguna fila. Revisa el CSV.');
                });
                return; // Salimos aquí para no continuar
            }
            try {
                // 4.1 Insertamos un nuevo lote en la tabla uploads
                const uploadResult = await pool.query(
                    `INSERT INTO uploads (file_name, uploaded_at) VALUES ($1, NOW()) RETURNING id`,
                    [req.file.originalname]
                );
                const uploadId = uploadResult.rows[0].id;

                // 4.2 Preparamos inserción masiva en records
                const columns = ["name", "age", "city", "upload_id"];
                const values = results.map(row => [row.name, row.age, row.city, uploadId]);
                const query = format(
                    // pg-format nos ayuda a generar VALUES (%L) para múltiples filas
                    `INSERT INTO records (${columns.join(", ")}) VALUES %L RETURNING *`,
                    values
                );

                
                const { rowCount } = await pool.query(query);

                // 4.3 Borramos el CSV temporal y respondemos con cuántas filas se insertaron
                fs.unlink(req.file.path, () => {
                    res.send(`Archivo procesado: ${rowCount} filas insertadas.`);
                });

            } catch (error) {
                console.error("Error al insertar en la DB:", error);
                fs.unlink(req.file.path, () => {
                    res.status(500).send('Error al insertar datos en la DB.');
                });
            }
        })
        .on('error', (err) => {
            console.error("Error al leer el CSV:", err);
            fs.unlink(req.file.path, () => {
                res.status(500).send('Error al procesar el archivo.');
            });
        });
});

// 5. Endpoints para listar uploads y sus records

// GET /uploads  
// Devuelve todos los lotes subidos, ordenados por fecha
app.get("/uploads", async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, file_name, uploaded_at, total_rows FROM uploads ORDER BY uploaded_at DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al obtener la lista de uploads.");
    }
});


// GET /uploads/:id/records  
// Dado un upload_id, devuelve todas las filas asociadas en records
app.get("/uploads/:id/records", async (req, res) => {
    const uploadId = req.params.id;
    try {
        const { rows } = await pool.query(
            "SELECT id, name, age, city FROM records WHERE upload_id = $1 ORDER BY id ASC",
            [uploadId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al obtener los registros del upload.");
    }
});


// 6. CRUD básico sobre /api/records

// GET  /api/records        → Leer todos los registros
app.get("/api/records", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, age, city FROM records ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener registros" });
  }
});


// PUT    /api/records/:id  → Actualizar un registro existente
app.put("/api/records/:id", async (req, res) => {
    const {id} = req.params;
    const { name, age, city } = req.body;
    try{
        const results = await pool.query(
            "UPDATE records SET name = $1, age = $2, city = $3 WHERE id = $4 RETURNING *",
            [name, age, city, id]
        );
        if (results.rowCount === 0) {
            return res.status(404).json({ error: "Registro no encontrado" });
        }
        res.json({message: "Registro actualizado", record: results.rows[0]});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar el registro" });
    }
});


// DELETE /api/records/:id  → Eliminar un registro
app.delete("/api/records/:id", async (req, res) => {
  console.log("DELETE /api/records/:id → params:", req.params);
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM records WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json({ message: "Registro eliminado", record: result.rows[0] });
  } catch (err) {
    console.error("Error al eliminar registro:", err);
    res.status(500).json({ error: "Error al eliminar el registro" });
  }
});

// POST /api/records        → Crear un registro manual
app.post("/api/records", async (req, res) => {
  const { name, age, city } = req.body;

  // Validaciones mínimas de los datos entrantes
  if (
    !name || !name.trim() ||
    !city || !city.trim() ||
    !Number.isInteger(age) || age <= 0
  ) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  try {
    // Inserción directa; si tu tabla exige upload_id NOT NULL deberías
    // crear primero un lote en uploads como vimos arriba
    const { rows } = await pool.query(
      "INSERT INTO records (name, age, city) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), age, city.trim()]
    );

    res.status(201).json({ message: "Registro creado", record: rows[0] });
  } catch (err) {
    console.error("Error al crear registro:", err);
    res.status(500).json({ error: "Error interno al crear el registro" });
  }
});

app.post("/api/records", async (req, res) => {
  const { name, age, city } = req.body;

  // Validaciones
  if (
    !name?.trim() ||
    !city?.trim() ||
    !Number.isInteger(age) ||
    age <= 0
  ) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  try {
    // 1) Crear entrada en uploads (puedes ajustar file_name a algo descriptivo)
    const upRes = await pool.query(
      "INSERT INTO uploads (file_name, uploaded_at, total_rows) VALUES ($1, NOW(), 1) RETURNING id",
      ["manual-entry"]
    );
    const uploadId = upRes.rows[0].id;

    // 2) Insertar el record con upload_id
    const recRes = await pool.query(
      `INSERT INTO records (name, age, city, upload_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), age, city.trim(), uploadId]
    );

    res.status(201).json({
      message: "Registro manual creado",
      record: recRes.rows[0]
    });
  } catch (err) {
    console.error("Error al crear registro manual:", err);
    res.status(500).json({ error: "Error interno al crear el registro" });
  }
});