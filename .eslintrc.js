module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true,
    jest: true,
    netlify: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  globals: {
    fetch: 'readonly',
    Response: 'readonly',
    Request: 'readonly',
    Headers: 'readonly',
    URLSearchParams: 'readonly',
    FormData: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    document: 'readonly',
    window: 'readonly',
    console: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    prompt: 'readonly'
  },
  rules: {
    // Reglas de calidad de código
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    
    // Reglas de seguridad
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Reglas de estilo
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    
    // Reglas de complejidad
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 300],
    'max-lines-per-function': ['warn', 50],
    'max-params': ['warn', 4],
    
    // Reglas de mejores prácticas
    'eqeqeq': 'error',
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-await': 'error',
    'no-return-await': 'error',
    
    // Reglas específicas para Netlify Functions
    'no-process-exit': 'off'
  },
  overrides: [
    {
      files: ['netlify/functions/**/*.js'],
      env: {
        node: true,
        netlify: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['test*.js', '**/*.test.js'],
      env: {
        jest: true
      },
      rules: {
        'no-unused-expressions': 'off'
      }
    },
    {
      files: ['*.html'],
      parser: 'eslint-plugin-html'
    }
  ],
  plugins: [
    'html'
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'lib/'
  ]
};