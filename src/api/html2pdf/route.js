async function handler({ html, options = {} }) {
  if (!html) {
    return { error: "HTML content is required" };
  }

  try {
    const response = await fetch("https://api.html2pdf.app/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html,
        apiKey: process.env.HTML2PDF_API_KEY,
        options: {
          margin: {
            top: options.margin_top || 20,
            bottom: options.margin_bottom || 20,
            left: options.margin_left || 20,
            right: options.margin_right || 20,
          },
          filename: options.output_filename || "document.pdf",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PDF conversion failed: ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    return {
      base64: base64Pdf,
      mimeType: "application/pdf",
      filename: options.output_filename || "document.pdf",
    };
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return { error: error.message || "Failed to generate PDF" };
  }
}
export async function POST(request) {
  return handler(await request.json());
}