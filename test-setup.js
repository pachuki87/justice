// Configuración global para pruebas de Jest
import 'jest-dom/extend-expect';

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

// Mock de fetch
global.fetch = jest.fn();

// Mock de Response
global.Response = {
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  blob: jest.fn().mockResolvedValue(new Blob()),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  clone: jest.fn(),
  headers: new Headers(),
  ok: true,
  redirected: false,
  status: 200,
  statusText: 'OK',
  type: 'basic',
  url: 'http://localhost'
};

// Mock de Request
global.Request = jest.fn();

// Mock de Headers
global.Headers = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  forEach: jest.fn(),
  keys: jest.fn(),
  values: jest.fn()
}));

// Mock de URLSearchParams
global.URLSearchParams = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  sort: jest.fn(),
  toString: jest.fn().mockReturnValue(''),
  entries: jest.fn(),
  forEach: jest.fn(),
  keys: jest.fn(),
  values: jest.fn()
}));

// Mock de FormData
global.FormData = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  forEach: jest.fn(),
  keys: jest.fn(),
  values: jest.fn()
}));

// Mock de console methods para evitar ruido en pruebas
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock de alert, confirm, prompt
global.alert = jest.fn();
global.confirm = jest.fn().mockReturnValue(true);
global.prompt = jest.fn().mockReturnValue('');

// Configurar localStorage y sessionStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock de IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock de ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock de MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn().mockReturnValue([])
}));

// Mock de requestAnimationFrame
global.requestAnimationFrame = jest.fn().mockImplementation((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn().mockImplementation((id) => clearTimeout(id));

// Mock de setTimeout y setInterval para pruebas
jest.useFakeTimers();

// Configuración de variables de entorno para pruebas
process.env.NODE_ENV = 'test';
process.env.API_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Helper functions para pruebas
global.testHelpers = {
  // Crear mock de evento DOM
  createMockEvent: (type, properties = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    ...properties
  }),

  // Crear mock de fetch response
  createMockFetchResponse: (data, options = {}) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    ...options
  }),

  // Limpiar todos los mocks
  clearAllMocks: () => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
    sessionStorageMock.clear.mockClear();
  }
};

// Configuración de matchers personalizados
expect.extend({
  // Matcher para verificar si un elemento es visible
  toBeVisible(received) {
    const pass = received.style && 
                received.style.display !== 'none' && 
                received.style.visibility !== 'hidden' &&
                received.style.opacity !== '0';
    
    return {
      message: () => `expected ${received} to ${pass ? 'not ' : ''}be visible`,
      pass
    };
  },

  // Matcher para verificar si un elemento tiene una clase
  toHaveClass(received, className) {
    const pass = received.classList && received.classList.contains(className);
    
    return {
      message: () => `expected ${received} to ${pass ? 'not ' : ''}have class ${className}`,
      pass
    };
  }
});

// Limpiar después de cada prueba
afterEach(() => {
  testHelpers.clearAllMocks();
  jest.clearAllTimers();
});

// Configuración global de timeouts
jest.setTimeout(10000);

// Exportar configuración para uso en otros archivos
module.exports = {
  localStorageMock,
  sessionStorageMock,
  testHelpers
};