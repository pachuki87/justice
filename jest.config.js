module.exports = {
  // Entorno de prueba
  testEnvironment: 'jsdom',
  
  // Archivos de configuración previa a las pruebas
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  
  // Patrones de archivos de prueba
  testMatch: [
    '**/test*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Archivos a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // Archivos de cobertura
  collectCoverageFrom: [
    'js/**/*.js',
    'components/**/*.js',
    'netlify/functions/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.min.js',
    '!**/lib/**',
    '!test-setup.js'
  ],
  
  // Directorio de cobertura
  coverageDirectory: 'coverage',
  
  // Formatos de reporte de cobertura
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Umbrales de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Transformaciones de archivos
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Módulos a transformar
  transformIgnorePatterns: [
    'node_modules/(?!(module-to-transform)/)'
  ],
  
  // Variables globales
  globals: {
    'process.env': {}
  },
  
  // Mapeo de módulos
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@js/(.*)$': '<rootDir>/js/$1',
    '^@netlify/(.*)$': '<rootDir>/netlify/$1'
  },
  
  // Archivos estáticos para pruebas
  staticDirs: ['<rootDir>/images', '<rootDir>/css', '<rootDir>/lib'],
  
  // Configuración verbose
  verbose: true,
  
  // Tiempo de espera máximo
  testTimeout: 10000,
  
  // Máximo de workers
  maxWorkers: '50%',
  
  // Clear mocks entre pruebas
  clearMocks: true,
  
  // Restore mocks entre pruebas
  restoreMocks: true,
  
  // Error si no se encuentran pruebas
  passWithNoTests: false,
  
  // Reporters personalizados
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Proyectos de prueba múltiples
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test-setup.js']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/test-*.js'],
      setupFilesAfterEnv: ['<rootDir>/test-setup.js']
    }
  ],
  
  // Configuración para pruebas de componentes
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    resources: 'usable',
    runScripts: 'dangerously'
  }
};