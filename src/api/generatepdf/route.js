async function handler({ html, options = {} }) {
  if (!html) {
    return { error: "HTML content is required" };
  }

  try {
    const response = await fetch("https://api.ilovepdf.com/v1/html2pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ILOVEPDF_API_KEY}`,
      },
      body: JSON.stringify({
        html,
        margin_top: options.margin_top || 20,
        margin_bottom: options.margin_bottom || 20,
        margin_left: options.margin_left || 20,
        margin_right: options.margin_right || 20,
        page_size: options.page_size || "A4",
        orientation: options.orientation || "portrait",
        single_page: options.single_page || false,
        remove_links: options.remove_links || false,
        grayscale: options.grayscale || false,
        base_url: options.base_url || null,
        output_filename: options.output_filename || "document.pdf",
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
    return { error: error.message || "Failed to generate PDF" };
  }
}
export async function POST(request) {
  return handler(await request.json());
}