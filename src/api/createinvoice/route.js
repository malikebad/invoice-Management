async function handler({
  type,
  companyName,
  companyLogo,
  clientName,
  invoiceDate,
  dueDate,
  currency,
  currencySymbol,
  notes,
  items,
}) {
  try {
    // Transform items to match database column names
    const transformedItems = items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice, // Match the database column name
      total: item.quantity * item.unitPrice,
    }));

    // Calculate total amount
    const totalAmount = transformedItems.reduce(
      (sum, item) => sum + item.total,
      0
    );

    // Create the invoice and items in a transaction
    const result = await sql.transaction([
      sql`
        INSERT INTO invoices (
          type,
          company_name,
          company_logo,
          client_name,
          invoice_date,
          due_date,
          currency,
          currency_symbol,
          notes,
          total_amount
        ) VALUES (
          ${type},
          ${companyName},
          ${companyLogo},
          ${clientName},
          ${invoiceDate},
          ${dueDate},
          ${currency},
          ${currencySymbol},
          ${notes},
          ${totalAmount}
        ) RETURNING *
      `,
      sql`
        WITH new_invoice AS (
          SELECT id FROM invoices 
          ORDER BY created_at DESC 
          LIMIT 1
        )
        INSERT INTO invoice_items (
          invoice_id,
          description,
          quantity,
          unit_price,
          total
        )
        SELECT 
          new_invoice.id,
          item.description,
          item.quantity::integer,
          item.unit_price::numeric,
          item.total::numeric
        FROM new_invoice,
        json_to_recordset(${JSON.stringify(transformedItems)}::json) AS item(
          description text,
          quantity integer,
          unit_price numeric,
          total numeric
        )
        RETURNING *
      `,
    ]);

    const [invoice, insertedItems] = result;
    return { invoice: invoice[0], items: insertedItems };
  } catch (error) {
    console.error("Error creating invoice:", error);
    return { error: error.message };
  }
}
export async function POST(request) {
  return handler(await request.json());
}