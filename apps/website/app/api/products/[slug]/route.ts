import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const dataDir = path.join(process.cwd(), "data");
    const filePath = path.join(dataDir, "products.json");
    
    const data = await fs.readFile(filePath, "utf-8");
    const products = JSON.parse(data);

    const product = products.find((p: { slug: string }) => p.slug === slug);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("Failed to load product:", error);
    return NextResponse.json(
      { error: "Failed to load product" },
      { status: 500 }
    );
  }
}