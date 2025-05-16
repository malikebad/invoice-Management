async function handler({ id }) {
  try {
    const [invoice] = await sql`
      SELECT 
        i.*,
        json_agg(
          json_build_object(
            'id', ii.id,
            'description', ii.description,
            'quantity', ii.quantity,
            'unit_price', ii.unit_price,
            'total', ii.total
          )
        ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = ${id}
      GROUP BY i.id
    `;

    if (!invoice) {
      return { error: "Invoice not found" };
    }

    return { invoice };
  } catch (error) {
    return { error: error.message };
  }
}
export async function POST(request) {
  return handler(await request.json());
}