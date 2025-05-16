"use client";
import React from "react";

import { useUpload } from "../utilities/runtime-helpers";

function MainComponent() {
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [type, setType] = useState("Invoice");
  const [currency, setCurrency] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [upload] = useUpload();

  // Load saved invoices on mount
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await fetch("/api/listinvoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setSavedInvoices(data.invoices || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      setError("Failed to load saved invoices");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { url, error } = await upload({ file });
      if (error) throw new Error(error);
      setCompanyLogo(url);
    } catch (error) {
      console.error("Error uploading logo:", error);
      setError("Failed to upload logo");
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      .toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/createinvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          companyName,
          companyLogo,
          clientName,
          invoiceDate: date,
          dueDate,
          currency,
          currencySymbol,
          notes,
          items: items.map((item) => ({
            description: item.description,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create invoice");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Reset form
      setCompanyName("");
      setCompanyLogo("");
      setClientName("");
      setDate("");
      setDueDate("");
      setNotes("");
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);

      // Reload invoices
      loadInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      setError("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (invoice) => {
    try {
      setError(null);
      // First get the invoice details
      const response = await fetch("/api/getinvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to get invoice details");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const { invoice: invoiceDetails } = data;

      // Create HTML content for PDF
      const itemsRows = invoiceDetails.items
        .map(
          (item) => `
        <tr>
          <td style="border:1px solid #ddd; padding:8px;">${item.description}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:center;">${item.quantity}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:right;">${invoiceDetails.currency_symbol}${item.unit_price}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:right;">${invoiceDetails.currency_symbol}${item.total}</td>
        </tr>
      `
        )
        .join("");

      const logoSrc = invoiceDetails.company_logo
        ? `<img src="${invoiceDetails.company_logo}" alt="Company Logo" style="max-height:60px; object-fit:contain;">`
        : "";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${invoiceDetails.type} - ${
        invoiceDetails.client_name
      }</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #eee;
              }
              .company-info {
                flex: 1;
              }
              .invoice-info {
                text-align: right;
              }
              h1, h2, h3 { 
                color: #2563eb;
                margin: 0 0 10px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #f8f9fa;
                font-weight: bold;
              }
              .total {
                font-size: 1.2em;
                font-weight: bold;
                text-align: right;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 2px solid #eee;
              }
              .notes {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
              }
              img {
                max-width: 200px;
                height: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="company-info">
                  ${logoSrc}
                  <h2>${invoiceDetails.company_name || ""}</h2>
                </div>
                <div class="invoice-info">
                  <h1>${invoiceDetails.type.toUpperCase()}</h1>
                  <p><strong>Date:</strong> ${new Date(
                    invoiceDetails.invoice_date
                  ).toLocaleDateString()}</p>
                  <p><strong>Due Date:</strong> ${new Date(
                    invoiceDetails.due_date
                  ).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <strong>Client:</strong> ${invoiceDetails.client_name}
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align:center">Quantity</th>
                    <th style="text-align:right">Unit Price</th>
                    <th style="text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <div class="total">
                Total: ${invoiceDetails.currency_symbol}${
        invoiceDetails.total_amount
      }
              </div>

              ${
                invoiceDetails.notes
                  ? `
                <div class="notes">
                  <strong>Notes:</strong>
                  <p>${invoiceDetails.notes}</p>
                </div>
              `
                  : ""
              }
            </div>
          </body>
        </html>
      `;

      try {
        // Generate PDF using HTML2PDF endpoint
        const pdfResponse = await fetch("/api/html2pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html: htmlContent,
            options: {
              margin_top: 20,
              margin_bottom: 20,
              margin_left: 20,
              margin_right: 20,
              output_filename: `${invoiceDetails.type}_${invoiceDetails.client_name}.pdf`,
            },
          }),
        });

        if (!pdfResponse.ok) {
          throw new Error("Failed to generate PDF");
        }

        const pdfData = await pdfResponse.json();

        if (pdfData.error) {
          throw new Error(pdfData.error);
        }

        // Convert base64 to blob
        const byteCharacters = atob(pdfData.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const pdfBlob = new Blob([byteArray], { type: pdfData.mimeType });

        // Create a URL for the blob
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = pdfData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        URL.revokeObjectURL(pdfUrl);
      } catch (error) {
        console.error("PDF Generation Error:", error);
        setError("Failed to generate PDF. Please try again.");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setError(error.message || "Failed to download PDF");
    }
  };

  const printInvoice = async (invoice) => {
    try {
      const response = await fetch("/api/getinvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to get invoice details");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const { invoice: invoiceDetails } = data;

      // Create a new window for printing
      const printWindow = window.open("", "", "width=800,height=600");
      const itemsRows = invoiceDetails.items
        .map(
          (item) => `
        <tr>
          <td style="border:1px solid #ddd; padding:8px;">${item.description}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:center;">${item.quantity}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:right;">${invoiceDetails.currency_symbol}${item.unit_price}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:right;">${invoiceDetails.currency_symbol}${item.total}</td>
        </tr>
      `
        )
        .join("");

      const logoSrc = invoiceDetails.company_logo
        ? `<img src="${invoiceDetails.company_logo}" alt="Company Logo" style="max-height:60px; object-fit:contain;">`
        : "";

      printWindow.document.write(`
        <html>
          <head>
            <title>${invoiceDetails.type} - ${
        invoiceDetails.client_name
      }</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2, h3 { color: #2563eb; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #e5e7eb; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .total { font-weight: bold; font-size: 1.2rem; margin-top: 20px; text-align: right; }
              .notes { margin-top: 20px; }
              @media print {
                body { margin: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>${logoSrc}<h2>${invoiceDetails.company_name}</h2></div>
              <div style="text-align:right;">
                <h3>${invoiceDetails.type.toUpperCase()}</h3>
                <p><strong>Date:</strong> ${new Date(
                  invoiceDetails.invoice_date
                ).toLocaleDateString()}</p>
                <p><strong>Due Date:</strong> ${new Date(
                  invoiceDetails.due_date
                ).toLocaleDateString()}</p>
              </div>
            </div>
            <p><strong>Client:</strong> ${invoiceDetails.client_name}</p>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-center">Quantity</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
            <div class="total">Total: ${invoiceDetails.currency_symbol}${
        invoiceDetails.total_amount
      }</div>
            ${
              invoiceDetails.notes
                ? `<div class="notes"><strong>Notes:</strong><p>${invoiceDetails.notes}</p></div>`
                : ""
            }
            <div style="margin-top: 30px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Print
              </button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Error printing invoice:", error);
      setError("Failed to print invoice");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="mb-4 sm:mb-0">
            <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Upload Logo
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="w-full text-sm"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="Invoice">Invoice</option>
                <option value="Quotation">Quotation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setCurrencySymbol(
                    e.target.options[e.target.selectedIndex].dataset.symbol
                  );
                }}
                className="w-full p-2 border rounded"
              >
                <option data-symbol="$" value="USD">
                  USD ($)
                </option>
                <option data-symbol="₨" value="PKR">
                  PKR (₨)
                </option>
                <option data-symbol="€" value="EUR">
                  EUR (€)
                </option>
                <option data-symbol="£" value="GBP">
                  GBP (£)
                </option>
                <option data-symbol="��" value="JPY">
                  JPY (¥)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items
            </label>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      placeholder="Description"
                      required
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      min="1"
                      required
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, "unitPrice", e.target.value)
                      }
                      min="0"
                      step="0.01"
                      required
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div className="w-32 p-2 text-right font-medium">
                    {currencySymbol}
                    {(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              + Add Item
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows="3"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xl font-bold">
              Total: {currencySymbol}
              {calculateTotal()}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>

          {error && <div className="text-red-600 mt-4">{error}</div>}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Saved Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Client</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Due Date</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-center p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {savedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                savedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t">
                    <td className="p-2">{invoice.type}</td>
                    <td className="p-2">{invoice.client_name}</td>
                    <td className="p-2">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-right">
                      {invoice.currency_symbol}
                      {invoice.total_amount}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => downloadPDF(invoice)}
                        className="text-blue-600 hover:text-blue-800 mx-2"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => printInvoice(invoice)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MainComponent;