import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const filePath = path.join(dataDir, "products.json");
    
    const data = await fs.readFile(filePath, "utf-8");
    const products = JSON.parse(data);

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Failed to load products:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}
