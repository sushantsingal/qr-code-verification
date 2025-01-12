import { processExcelData } from "./utils";
import path from "path";

export default function handler(req, res) {
  const { token } = req.query;

  // Check if token is provided
  if (!token) {
    return res.status(400).json({ status: "error", message: "No token provided" });
  }

  try {
    // Corrected file path resolution
    const filePath = path.resolve("public", "data.xlsx");

    // Log file path to ensure it's correct
    console.log("Processing Excel file at:", filePath);
    
    // Process the Excel data
    const data = processExcelData(filePath);

    // Log the processed data to view its structure
    console.log("Processed Excel Data:", JSON.stringify(data, null, 2)); // Pretty print the data for clarity

    // Find attendee by matching token (ensure token comparison is type-safe)
    const attendee = data.find((entry) => entry.Token.toString() === token.toString());

    if (attendee) {
      return res.status(200).json({
        status: "success",
        message: "Token verified",
        data: attendee,
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "Invalid Token",
      });
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

