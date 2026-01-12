DO $$ 
DECLARE
    -- Declarar el user_id objetivo para que puedas reemplazarlo fácilmente
    target_user_id uuid := 'tu_usuario_id_aqui';  -- REEMPLAZAR CON EL ID DEL USUARIO

    -- Arrays de Bases, Proteínas, y Estilos/Salsas
    bases text[] := ARRAY['Arroz', 'Quinoa', 'Pasta', 'Calabacín', 'Patata', 'Cuscús'];
    proteinas text[] := ARRAY['Pollo', 'Ternera', 'Tofu', 'Lentejas', 'Salmón', 'Merluza', 'Huevo'];
    estilos text[] := ARRAY['Al Curry', 'Al Pesto', 'Con Tomate', 'Al Ajillo', 'Teriyaki', 'A las Finas Hierbas'];

    -- Tags dietéticos asociados a las Bases, Proteínas y Estilos
    base_tags jsonb[] := ARRAY[
        '{"gluten_free": true}', 
        '{"gluten_free": true}', 
        '{"gluten_free": false}', 
        '{"gluten_free": true}', 
        '{"gluten_free": true}', 
        '{"gluten_free": true}'
    ];
    proteina_tags jsonb[] := ARRAY[
        '{"gluten_free": true, "vegan": false, "vegetarian": false}', 
        '{"gluten_free": true, "vegan": false, "vegetarian": false}', 
        '{"gluten_free": true, "vegan": true, "vegetarian": true}', 
        '{"gluten_free": true, "vegan": true, "vegetarian": true}', 
        '{"gluten_free": true, "vegan": false, "vegetarian": false}', 
        '{"gluten_free": true, "vegan": false, "vegetarian": false}', 
        '{"gluten_free": true, "vegan": false, "vegetarian": false}'
    ];
    estilo_tags jsonb[] := ARRAY[
        '{"cuisine_type": "indian"}',
        '{"cuisine_type": "italian"}',
        '{"cuisine_type": "italian"}',
        '{"cuisine_type": "spanish"}',
        '{"cuisine_type": "japanese"}',
        '{"cuisine_type": "french"}'
    ];

    -- Variables auxiliares
    receta_title text;
    meal_category text;
    ingredients jsonb;
    dietary_tags jsonb;
    estilo jsonb;
    tags jsonb;

BEGIN
    -- Bucle principal para combinar bases, proteínas y estilos
    FOREACH base IN ARRAY bases
    LOOP
        FOREACH proteina IN ARRAY proteinas
        LOOP
            FOREACH estilo IN ARRAY estilos
            LOOP
                -- Generar el título de la receta
                receta_title := base || ' con ' || proteina || ' ' || estilo->>'cuisine_type';
                
                -- Determinar la categoría de la comida (almuerzo o cena)
                meal_category := CASE 
                                    WHEN random() > 0.5 THEN 'lunch'
                                    ELSE 'dinner' 
                                  END;

                -- Calcular los ingredientes en formato JSONB
                ingredients := jsonb_build_array(
                    jsonb_build_object('name', base, 'quantity', 100, 'unit', 'g', 'category', 'base'),
                    jsonb_build_object('name', proteina, 'quantity', 150, 'unit', 'g', 'category', 'protein'),
                    jsonb_build_object('name', estilo->>'cuisine_type', 'quantity', 50, 'unit', 'g', 'category', 'sauce')
                );

                -- Determinar los tags dietéticos
                tags := base_tags[array_position(bases, base) - 1] || proteina_tags[array_position(proteinas, proteina) - 1] || estilo_tags[array_position(estilos, estilo) - 1];
                
                -- Lógica para combinar tags dietéticos y eliminar contradicciones (ejemplo: pollo no es vegano)
                dietary_tags := jsonb_object_agg(key, value)
                    FROM jsonb_each(tags) AS tags(key, value)
                    WHERE NOT (
                        (key = 'vegan' AND value = 'true' AND (proteina = 'Pollo' OR proteina = 'Ternera'))
                    );

                -- Insertar la receta en la tabla
                INSERT INTO recipes (user_id, title, description, meal_category, cuisine_type, difficulty, prep_time, servings, calories, ingredients, instructions, dietary_tags, image_url)
                VALUES (
                    target_user_id, 
                    receta_title, 
                    'Receta deliciosa combinando ' || base || ' con ' || proteina || ' y salsa ' || estilo->>'cuisine_type', 
                    meal_category, 
                    estilo->>'cuisine_type', 
                    'medium',  -- Dificultad fija
                    30,        -- Tiempo de preparación fijo (en minutos)
                    2,         -- Porciones fijas
                    500,       -- Calorías estimadas (valor fijo por simplificación)
                    ingredients,
                    jsonb_build_array('Sigue estos pasos...', '1. Cocinar...', '2. Servir...', '3. Disfrutar...'),  -- Instrucciones fijas
                    dietary_tags,
                    'https://example.com/image.jpg'  -- URL de imagen fija (puedes cambiarla)
                );
            END LOOP;
        END LOOP;
    END LOOP;

    -- Generar 20 recetas de desayuno de manera especial
    FOR i IN 1..20 LOOP
        -- Títulos de desayuno simplificados (ej. Avena con Frutas)
        receta_title := CASE 
                           WHEN i % 2 = 0 THEN 'Avena con Frutas'
                           ELSE 'Tostadas con Aguacate'
                       END;

        -- Ingredientes de desayuno
        ingredients := jsonb_build_array(
            jsonb_build_object('name', 'Avena', 'quantity', 100, 'unit', 'g', 'category', 'base'),
            jsonb_build_object('name', 'Frutas', 'quantity', 50, 'unit', 'g', 'category', 'protein')
        );

        -- Tags de desayuno (sin gluten por ejemplo)
        dietary_tags := jsonb_build_array('gluten_free');

        -- Insertar recetas de desayuno
        INSERT INTO recipes (user_id, title, description, meal_category, cuisine_type, difficulty, prep_time, servings, calories, ingredients, instructions, dietary_tags, image_url)
        VALUES (
            target_user_id, 
            receta_title, 
            'Receta de desayuno rápido y saludable.', 
            'breakfast', 
            'continental',  -- Tipo de cocina para desayuno
            'easy',         -- Dificultad fácil
            10,             -- Tiempo de preparación más corto
            1,              -- Porción individual
            200,            -- Calorías para desayuno
            ingredients,
            jsonb_build_array('Mezcla la avena con las frutas y disfruta.', '1. Servir...', '2. Disfrutar...'),
            dietary_tags,
            'https://example.com/breakfast_image.jpg'  -- URL de imagen de desayuno
        );
    END LOOP;

END $$;
