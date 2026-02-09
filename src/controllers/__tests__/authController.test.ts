import { Request, Response } from 'express';
import { showLogin, register } from '../authController';
import { Usuario } from '../../models';

// Mock the Usuario model
jest.mock('../../models', () => ({
  Usuario: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Authentication Controller - Registration Redirect', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockRedirect: jest.Mock;
  let mockRender: jest.Mock;

  beforeEach(() => {
    mockRedirect = jest.fn();
    mockRender = jest.fn();
    
    mockRequest = {
      body: {},
      query: {},
    };
    
    mockResponse = {
      redirect: mockRedirect,
      render: mockRender,
    };

    jest.clearAllMocks();
  });

  describe('showLogin', () => {
    test('should display success message when success parameter is "registro_exitoso"', () => {
      mockRequest.query = { success: 'registro_exitoso' };

      showLogin(mockRequest as Request, mockResponse as Response);

      expect(mockRender).toHaveBeenCalledWith('login', {
        title: 'Iniciar Sesión',
        error: null,
        success: '¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.',
      });
    });

    test('should not display success message when success parameter is not present', () => {
      mockRequest.query = {};

      showLogin(mockRequest as Request, mockResponse as Response);

      expect(mockRender).toHaveBeenCalledWith('login', {
        title: 'Iniciar Sesión',
        error: null,
        success: null,
      });
    });

    test('should not display success message when success parameter has different value', () => {
      mockRequest.query = { success: 'other_value' };

      showLogin(mockRequest as Request, mockResponse as Response);

      expect(mockRender).toHaveBeenCalledWith('login', {
        title: 'Iniciar Sesión',
        error: null,
        success: null,
      });
    });
  });

  describe('register', () => {
    test('should redirect to login with success parameter after successful registration', async () => {
      const mockUser = {
        id: 1,
        usuario: 'testuser',
        correo: 'test@example.com',
        password: 'hashedpassword',
      };

      mockRequest.body = {
        usuario: 'testuser',
        correo: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      (Usuario.findOne as jest.Mock).mockResolvedValue(null);
      (Usuario.create as jest.Mock).mockResolvedValue(mockUser);

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockRedirect).toHaveBeenCalledWith('/login?success=registro_exitoso');
      expect(mockRender).not.toHaveBeenCalled();
    });

    test('should render error when validation fails', async () => {
      mockRequest.body = {
        usuario: '',
        correo: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockRender).toHaveBeenCalledWith('registro', {
        title: 'Crear Cuenta',
        error: 'Por favor complete todos los campos',
        success: null,
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    test('should render error when passwords do not match', async () => {
      mockRequest.body = {
        usuario: 'testuser',
        correo: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different',
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockRender).toHaveBeenCalledWith('registro', {
        title: 'Crear Cuenta',
        error: 'Las contraseñas no coinciden',
        success: null,
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    test('should render error when user already exists', async () => {
      const existingUser = {
        id: 1,
        usuario: 'testuser',
        correo: 'test@example.com',
        password: 'hashedpassword',
      };

      mockRequest.body = {
        usuario: 'testuser',
        correo: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      (Usuario.findOne as jest.Mock).mockResolvedValue(existingUser);

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockRender).toHaveBeenCalledWith('registro', {
        title: 'Crear Cuenta',
        error: 'El nombre de usuario ya está en uso',
        success: null,
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
