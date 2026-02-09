import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      usuario: string;
      correo: string;
    };
  }
}

// Extender el tipo Request de Express
declare global {
  namespace Express {
    interface Request {
      session: import('express-session').Session & Partial<import('express-session').SessionData>;
    }
  }
}
