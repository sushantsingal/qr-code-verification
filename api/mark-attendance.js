const fs = require('fs');
const XLSX = require('xlsx');

module.exports = async (req, res) => {
  const { token } = req.query;

  // Read the Excel file
  try {
    const workbook = XLSX.readFile('./data.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Assuming the data is in the first sheet
    let data = XLSX.utils.sheet_to_json(sheet); // Convert sheet to JSON

    const attendee = data.find(item => item.token === token);

    if (attendee && !attendee.attended) {
      attendee.attended = true;

      // Write back the updated data to the Excel file
      const updatedSheet = XLSX.utils.json_to_sheet(data); // Convert JSON back to sheet
      workbook.Sheets[workbook.SheetNames[0]] = updatedSheet; // Replace the sheet with updated data
      XLSX.writeFile(workbook, './data.xlsx'); // Write the changes to the Excel file

      res.status(200).send('Attendance marked');
    } else {
      res.status(404).json({ error: 'Attendee not found or already marked attended' });
    }
  } catch (error) {
    console.error("Error reading or updating Excel file:", error);
    res.status(500).json({ error: 'Error reading or updating the Excel file' });
  }
};
