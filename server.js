const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors'); // Importar cors

const { exec } = require('child_process');
const util = require('util');
const path = require('path');

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

const execPromise = util.promisify(exec);
// Endpoint para ejecutar el script de Python
app.post('/api/procesar-dbf', async (req, res) => {
  try {
    // Path to the Python script
    const scriptPath = path.join('C:', 'Users', 'Rodrigo', 'PyCharmMiscProject', 'script1.py');

    // Execute the Python script
    const { stdout, stderr } = await execPromise(`py "${scriptPath}"`);

    if (stderr) {
      console.error('Error in Python script:', stderr);
      return res.status(500).json({ error: 'Error executing Python script' });
    }

    // Log the script output for debugging (optional)
    console.log('Python script output:', stdout);

    // Send success response to Angular
    res.json({ status: 'success', message: 'Python script executed successfully, data inserted into database' });
  } catch (err) {
    console.error('Error executing script:', err);
    res.status(500).json({ error: 'Error processing the DBF file' });
  }
});

app.get('/api/movimientos', (req, res) => {
  // Soporte para múltiples años con ?years=2025,2024,2023
  if (req.query.years) {
    const years = req.query.years.split(',').map(year => year.trim());
    const conditions = years.map(year => `DOCFEC BETWEEN '${year}-01-01' AND '${year}-12-31'`).join(' OR ');

    pool.getConnection()
      .then(conn => {
        console.log('Conectado a la base de datos');
        const query = `
          SELECT
            CODTER, DOCFEC, BASEBAS.
            YEAR(DOCFEC) AS year
          FROM
            movalmc
          WHERE ${conditions}
        `;

        conn.query(query)
          .then(rows => {
            const groupedByYear = rows.reduce((acc, row) => {
              const year = row.year;
              if (!acc[year]) acc[year] = [];
              acc[year].push({
                CODTER: row.CODTER,
                DOCFEC: row.DOCFEC,
                BASEBAS: row.BASEBAS,

              });
              return acc;
            }, {});
            res.json(groupedByYear); // Ej: { "2025": [...], "2024": [...], "2023": [...] }
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
  } else {

    // Soporte para el comportamiento actual con ?year=2024
    const year = req.query.year || '2024';
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    pool.getConnection()
      .then(conn => {
        console.log('Conectado a la base de datos');
        const query = `
          SELECT
            CODTER, DOCFEC, BASEBAS
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
  }
});

// para coger los años del selector multiple
app.get('/api/years', (req, res) => {
  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
       SELECT DISTINCT YEAR(DOCFEC) AS year
        FROM movalmc
        WHERE DOCFEC IS NOT NULL
    		ORDER BY year DESC

      `;

      conn.query(query)
        .then(rows => {
          const years = rows.map(row => row.year); // Extrae solo el valor del año
          res.json(years); // Ej: [2025, 2024, 2023, 2022, 2021, ...]
        })
        .catch(err => {
          console.error('Error en la consulta:', err);
          res.status(500).json({ error: 'Error al obtener los años' });
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

app.get('/api/codigoCliente', (req, res) => {
  const year = req.query.year || '2024';
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  pool.getConnection()
    .then(conn => {
      console.log('Conectado a la base de datos');
      const query = `
        SELECT
          CODTER
        FROM
          movalmc
          where docfec >= ? and docfec <= ?
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


// IMPORTANTE, se usa esta api para sacar los datos de cada cliente por fecha
app.get('/api/movimientos/cliente/:codigo', (req, res) => {
  const codigo = req.params.codigo;

  if (req.query.years) {
    const years = req.query.years.split(',').map(year => parseInt(year.trim())).filter(year => !isNaN(year));

    if (years.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron años válidos' });
    }

    pool.getConnection()
      .then(conn => {
        const query = `
          SELECT CODTER, DOCFEC, BASEBAS, YEAR(DOCFEC) AS year
          FROM movalmc
          WHERE CODTER = ? AND YEAR(DOCFEC) IN (?)
          ORDER BY DOCFEC
        `;

        console.log('Consulta SQL:', query.replace('?', `'${codigo}'`).replace('?', years.join(',')));
        conn.query(query, [codigo, years])
          .then(rows => {
            const groupedByYear = rows.reduce((acc, row) => {
              const year = row.year;
              if (!acc[year]) acc[year] = [];
              acc[year].push({
                CODTER: row.CODTER,
                DOCFEC: row.DOCFEC,
                BASEBAS: row.BASEBAS
              });
              return acc;
            }, {});
            res.json(groupedByYear);
          })
          .catch(err => {
            console.error('Error en la consulta:', err);
            res.status(500).json({ error: 'Error al obtener los datos del cliente' });
          })
          .finally(() => conn.end());
      })
      .catch(err => {
        console.error('Error de conexión:', err);
        res.status(500).json({ error: 'Error de conexión a la base de datos' });
      });
  } else {
    const year = req.query.year || '2024';
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    pool.getConnection()
      .then(conn => {
        const query = `
          SELECT CODTER, DOCFEC, BASEBAS
          FROM movalmc
          WHERE CODTER = ? AND DOCFEC BETWEEN ? AND ?
        `;

        conn.query(query, [codigo, startDate, endDate])
          .then(rows => {
            res.json(rows);
          })
          .catch(err => {
            console.error('Error en la consulta:', err);
            res.status(500).json({ error: 'Error al obtener los datos del cliente' });
          })
          .finally(() => conn.end());
      })
      .catch(err => {
        console.error('Error de conexión:', err);
        res.status(500).json({ error: 'Error de conexión a la base de datos' });
      });
  }
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://192.168.210.176:3000');
});
