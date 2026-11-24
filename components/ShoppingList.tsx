
CREATE OR REPLACE FUNCTION public.get_categorized_shopping_list(
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    ingredient text,
    total_quantity numeric,
    unit text,
    category text,
    category_order integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        s.ingredient,
        s.total_quantity,
        s.unit,
        COALESCE(c.name, 'Otros'),
        COALESCE(c.sort_order, 10)

    FROM public.get_shopping_list(
        p_start_date,
        p_end_date
    ) s

    LEFT JOIN LATERAL (
        SELECT ic.category_id
        FROM public.ingredient_catalog ic
        WHERE ic.user_id = auth.uid()
        AND LOWER(TRIM(ic.name)) =
            LOWER(TRIM(s.ingredient))
        ORDER BY ic.name
        LIMIT 1
    ) i ON true

    LEFT JOIN public.ingredient_categories c
        ON c.id = i.category_id

    ORDER BY
        COALESCE(c.sort_order, 10),
        s.ingredient;
$$;

REVOKE ALL ON FUNCTION
    public.get_categorized_shopping_list(date, date)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
    public.get_categorized_shopping_list(date, date)
TO authenticated;
