const express = require("express");
const multer = require('multer');
const path = require('path');
const pool = require('./db');
const cors = require("cors");
const fs = require('fs');
const csv = require('csv-parser');
const format = require('pg-format');

const app = express();

app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ now: result.rows[0].now });
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const isCsv = file.mimetype === "text/csv" || path.extname(file.originalname).toLowerCase() === ".csv";
        if (!isCsv) {
            return callback(new Error("Solo se admiten archivos CSV"), false);
        }
        callback(null, true);
    }
});

app.post("/uploads", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo.');
    }
    const results = [];
    let invalid = false;

    if (!fs.existsSync('./uploads')) {
        fs.mkdirSync('./uploads');
    }

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
            const { name, age, city } = row;
            if (!name || name.trim() === "" || !Number.isInteger(+age) || +age <= 0 || !city || city.trim() === "") {
                invalid = true;
                return;
            }
            results.push({ name: name.trim(), age: +age, city: city.trim() });
        })
        .on('end', async () => {
            if (invalid) {
                fs.unlink(req.file.path, () => {
                    return res.status(400).send('Datos inválidos en alguna fila. Revisa el CSV.');
                });
                return; // Salimos aquí para no continuar
            }
            try {
                // Inserta en uploads
                const uploadResult = await pool.query(
                    `INSERT INTO uploads (file_name, uploaded_at) VALUES ($1, NOW()) RETURNING id`,
                    [req.file.originalname]
                );
                const uploadId = uploadResult.rows[0].id;

                // Inserta en records
                const columns = ["name", "age", "city", "upload_id"];
                const values = results.map(row => [row.name, row.age, row.city, uploadId]);
                const query = format(
                    `INSERT INTO records (${columns.join(", ")}) VALUES %L RETURNING *`,
                    values
                );

                const { rowCount } = await pool.query(query);

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

app.get("/api/records", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, age, city FROM records ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener registros" });
  }
});

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