import express, { Application } from 'express';
import session from 'express-session';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import { testConnection } from './config/database';
import { initDatabase } from './config/initDatabase';
import { logger } from './utils/logger';

const app: Application = express();
const PORT = process.env.PORT || 3005;

// Configurar middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configurar express-session
const sessionConfig = {
  secret: 'cdce-sala-situacional-guarico-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 horas
  }
};

logger.info('Configurando express-session', {
  action: 'session_config',
  details: {
    secret: sessionConfig.secret.substring(0, 10) + '...',
    resave: sessionConfig.resave,
    saveUninitialized: sessionConfig.saveUninitialized,
    cookieMaxAge: sessionConfig.cookie.maxAge
  }
});

app.use(session(sessionConfig));

// Middleware para verificar que la sesión está disponible
app.use((req, res, next) => {
  if (!req.session) {
    logger.warn('Sesión no disponible en request', {
      action: 'session_check',
      details: {
        path: req.path,
        method: req.method
      }
    });
  }
  next();
});

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware para pasar información de sesión a las vistas
app.use((req, res, next) => {
  res.locals.user = (req.session as any).user || null;
  next();
});

// Inicializar base de datos y servidor
const startServer = async () => {
  try {
    logger.info('Iniciando servidor', { action: 'server_start' });

    // Probar conexión a la base de datos
    await testConnection();
    logger.info('Conexión a base de datos exitosa', { action: 'db_connection_success' });
    
    // Inicializar base de datos con datos iniciales
    await initDatabase();
    logger.info('Base de datos inicializada', { action: 'db_init_success' });
    
    // Importar rutas
    const authRoutes = require('./routes/auth').default;
    const tareasRoutes = require('./routes/tareas').default;
    const evaluacionRoutes = require('./routes/evaluacion').default;
    const divisionesRoutes = require('./routes/divisiones').default;
    const municipiosRoutes = require('./routes/municipios').default;
    
    // Usar rutas
    app.use('/', authRoutes);
    app.use('/tareas', tareasRoutes);
    app.use('/evaluacion', evaluacionRoutes);
    app.use('/divisiones', divisionesRoutes);
    app.use('/municipios', municipiosRoutes);
    
    logger.info('Rutas configuradas', { action: 'routes_configured' });
    
    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en http://localhost:${PORT}`, {
        action: 'server_listening',
        details: { port: PORT }
      });
      console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor', error as Error, {
      action: 'server_start_error'
    });
    console.error('✗ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

export default app;
