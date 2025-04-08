const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors'); // Importar cors

const app = express();

// Middleware para permitir el parseo de solicitudes JSON
app.use(cors());
app.use(express.json()); // Este middleware es crucial para procesar req.body como JSON
app.use(express.urlencoded({ extended: true })); // Para procesar datos de formularios si es necesario


// Configuración de la base de datos MariaDB
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'facturacion',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5,
  acquireTimeout: 5000
});

// ACCEDER A TARJETA SOCIO DESDE LA TABLA SOCIO
app.get('/api/movimientos', (req, res) => {
  const year = req.query.year || '2024';
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          CODTER, DOCFEC, BASEBAS, IMPTBAS, RECBAS
        FROM
          movalmc
        WHERE DOCFEC >= ? AND DOCFEC <= ?
      `;

      conn.query(query, [startDate, endDate])
        .then(rows => {
          res.json(rows);
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los datos' });
        })
        .finally(() => {
          conn.end();
        });
    })
    .catch(err => {
      console.error('Error de conexión:', err);
      res.status(500).json({ error: 'Error de conexión a la base de datos' });
    });
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://192.168.210.176:3000');
});
