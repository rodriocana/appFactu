const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');
const { spawn } = require('child_process'); // Usamos spawn en lugar de exec para mejor control
const path = require('path');
const fs = require('fs'); // Agregar esta línea

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Endpoint para procesar el archivo DBF
app.post('/api/procesar-dbf', async (req, res) => {
  try {
    const { dbf_path } = req.body;
    console.log('Solicitud recibida:', req.body);

    // Validar que se proporcionó la ruta del DBF
    if (!dbf_path) {
      console.error('Falta dbf_path en la solicitud');
      return res.status(400).json({ error: 'Se requiere la ruta del archivo DBF.' });
    }

    // Validar que la ruta sea segura
    // const baseDir = 'f:\\conta32\\temp';
    const baseDir = 'c:\\conta32_lekue\\temp'; // Cambiar a la nueva ruta
    const normalizedPath = path.normalize(dbf_path.replace(/\//g, '\\'));
    console.log('Ruta normalizada:', normalizedPath);
    if (!normalizedPath.startsWith(baseDir) || !normalizedPath.toLowerCase().endsWith('.dbf')) {
      console.error('Ruta inválida:', normalizedPath);
      return res.status(400).json({ error: 'Ruta de archivo inválida o no permitida.' });
    }

    // Verificar que el archivo DBF existe
    if (!fs.existsSync(normalizedPath)) {
      console.error('Archivo DBF no encontrado:', normalizedPath);
      return res.status(400).json({ error: `El archivo DBF ${normalizedPath} no existe.` });
    }

    // Ruta al script de Python
    const pythonScript = path.join('C:', 'Users', 'Rodrigo', 'PyCharmMiscProject', 'dbf_to_sql.py');
    const jsonOutputPath = normalizedPath.replace(/\.dbf$/i, '.json');

    // Verificar que el script de Python existe
    if (!fs.existsSync(pythonScript)) {
      console.error('Script de Python no encontrado:', pythonScript);
      return res.status(500).json({ error: `El script de Python ${pythonScript} no existe.` });
    }

    console.log('Ejecutando script:', pythonScript, 'con argumentos:', [normalizedPath, jsonOutputPath]);

    // Usar la ruta completa de py.exe
    const pythonExecutable = 'C:\\Users\\Rodrigo\\AppData\\Local\\Programs\\Python\\Launcher\\py.exe';
    const pythonProcess = spawn(pythonExecutable, [pythonScript, normalizedPath, jsonOutputPath]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Python stdout:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log('Código de salida del script:', code);
      if (code === 0) {
        console.log('Script ejecutado exitosamente:', stdout);
        res.json({
          status: 'success',
          message: `Archivo ${normalizedPath} procesado correctamente, datos insertados en la base de datos.`
        });
      } else {
        console.error('Error en el script de Python (código:', code, '):', stderr);
        res.status(500).json({ error: `Error ejecutando el script de Python: ${stderr}` });
      }
    });

  } catch (err) {
    console.error('Error procesando el archivo DBF:', err);
    res.status(500).json({ error: `Error procesando el archivo DBF: ${err.message}` });
  }
});

// Endpoint para obtener movimientos
app.get('/api/movimientos', (req, res) => {
  if (req.query.years) {
    const years = req.query.years.split(',').map(year => year.trim());
    const conditions = years.map(year => `DOCFEC BETWEEN '${year}-01-01' AND '${year}-12-31'`).join(' OR ');

    pool.getConnection()
      .then(conn => {
        console.log('Conectado a la base de datos');
        const query = `
          SELECT
            CODTER, DOCFEC, BASEBAS,
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
            res.json(groupedByYear);
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

// Endpoint para obtener años disponibles
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
          const years = rows.map(row => row.year);
          res.json(years);
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

// Endpoint para obtener código de cliente
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

// Endpoint para obtener movimientos por cliente
app.get('/api/movimientos/cliente/:codigo', (req, res) => {
  const nomfich = req.query.nomfich; // Obtener nomfich desde los query params

  if (!nomfich) {
    return res.status(400).json({ error: 'El parámetro nomfich es requerido' });
  }

  if (req.query.years) {
    const years = req.query.years
      .split(',')
      .map(year => parseInt(year.trim()))
      .filter(year => !isNaN(year));

    if (years.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron años válidos' });
    }

    pool.getConnection()
      .then(conn => {
        // Consulta SQL actualizada sin CODTER
        const query = `
          SELECT CODTER, DOCFEC, BASEBAS, YEAR(DOCFEC) AS year
          FROM movalmc
          WHERE YEAR(DOCFEC) IN (?) AND nomfich = ?
          ORDER BY DOCFEC
        `;
        const queryParams = [years, nomfich];

        console.log('Consulta SQL:', query.replace('(?)', `(${years.join(',')})`));
        console.log('Parámetros:', queryParams);

        conn.query(query, queryParams)
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
        // Consulta SQL para un solo año sin CODTER
        const query = `
          SELECT CODTER, DOCFEC, BASEBAS
          FROM movalmc
          WHERE DOCFEC BETWEEN ? AND ? AND nomfich = ?
          ORDER BY DOCFEC
        `;
        const queryParams = [startDate, endDate, nomfich];

        console.log('Consulta SQL:', query);
        console.log('Parámetros:', queryParams);

        conn.query(query, queryParams)
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
