import { processExcelData } from "./utils";
import path from "path";

export default function handler(req, res) {
  const { name, rollNo } = req.query;

  if (!name || !rollNo) {
    return res.status(400).json({ status: "error", message: "Name and Roll No are required" });
  }

  try {
    // Corrected file path resolution
    const filePath = path.resolve(".", "data.xlsx");

    // Log file path to ensure it's correct
    console.log("Processing Excel file at:", filePath);

    const data = processExcelData(filePath);

    // Log the processed data to view its structure
    console.log("Processed Excel Data:", JSON.stringify(data, null, 2));

    // Find attendee by matching name and rollNo (case-insensitive comparison)
    const attendee = data.find((entry) =>
      entry.Name.toLowerCase() === name.toLowerCase() && entry["Roll No."].toLowerCase() === rollNo.toLowerCase()
    );

    if (attendee) {
      res.setHeader("Content-Type", "application/json"); // Make sure content type is JSON
      return res.status(200).json({
        status: "success",
        message: "Verification Successful",
        data: attendee,
      });
    } else {
      res.setHeader("Content-Type", "application/json"); // Ensure the content type remains JSON
      return res.status(404).json({
        status: "error",
        message: "Name or Roll No not found",
      });
    }
  } catch (error) {
    console.error("Error verifying data:", error);
    res.setHeader("Content-Type", "application/json"); // Ensure correct content type
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}
