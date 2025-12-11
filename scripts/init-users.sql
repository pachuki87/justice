-- Inicialización de usuarios para Justice 2
-- Este script crea usuarios por defecto para testing

-- Verificar si el perfil 'admin' ya existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin') THEN
        INSERT INTO profiles (role) VALUES ('admin');
        RAISE NOTICE 'Perfil admin creado';
    END IF;
END $$;

-- Crear usuario administrador por defecto
INSERT INTO profiles (role, name, email, password_hash, created_at, updated_at)
VALUES (
    'admin',
    'Administrador Justice 2',
    'admin@justice2.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvOy', -- contraseña: admin123
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Crear usuario demo
INSERT INTO profiles (role, name, email, password_hash, created_at, updated_at)
VALUES (
    'user',
    'Usuario Demo',
    'user@justice2.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvOy', -- contraseña: user123
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verificar usuarios creados
SELECT
    id,
    name,
    email,
    role,
    created_at
FROM profiles
WHERE email IN ('admin@justice2.com', 'user@justice2.com');