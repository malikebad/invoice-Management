async function handler({ url }) {
  if (!url) {
    return {
      statusCode: 400,
      error: "URL parameter is required",
    };
  }

  try {
    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedUrl}`
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        error: "Failed to generate QR code",
      };
    }

    const imageBuffer = await response.arrayBuffer();

    return {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
      body: Buffer.from(imageBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      error: "Internal server error",
    };
  }
}
export async function POST(request) {
  return handler(await request.json());
}