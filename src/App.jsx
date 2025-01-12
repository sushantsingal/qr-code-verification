import React, { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsQR from 'jsqr'; // QR scanning library
import './App.css';

function App() {
  const [fileData, setFileData] = useState([]); // Store parsed file data
  const [fileType, setFileType] = useState(''); // To store the file type (Excel, CSV, JSON)
  const [loading, setLoading] = useState(false); // For loading status
  const [verificationStatus, setVerificationStatus] = useState(''); // For verification status
  const [showModal, setShowModal] = useState(false); // State for showing the modal
  const [showFileData, setShowFileData] = useState(true); // Toggle for showing/hiding file data
  const videoRef = useRef(null); // Video ref for accessing the camera
  const canvasRef = useRef(null); // Canvas ref for drawing video frame
  const [scannedSet, setScannedSet] = useState(new Set()); // Track scanned QR code data
  const [highlightedRows, setHighlightedRows] = useState(new Set()); // Track all matched rows to keep highlighted

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      setFileType(fileExtension);
      readFile(file, fileExtension);
    }
  };

  // Read and parse file data
  const readFile = (file, fileExtension) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target.result;

      if (fileExtension === 'xlsx') {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setFileData(jsonData);
      } else if (fileExtension === 'csv') {
        Papa.parse(data, {
          complete: (result) => {
            setFileData(result.data);
          },
          header: true,
        });
      } else if (fileExtension === 'json') {
        try {
          const jsonData = JSON.parse(data);
          setFileData(jsonData);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          setVerificationStatus('Invalid JSON file.');
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  // QR Code scanning function
  const scanQRCode = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);

    if (code) {
      const qrData = code.data;

      // Check if QR data has been scanned already
      if (!scannedSet.has(qrData)) {
        setScannedSet((prevSet) => new Set(prevSet).add(qrData)); // Add new data to the set
        verifyData(qrData); // Use scanned QR code data
      } else {
        showDuplicatePopup(qrData); // Show the duplicate popup
      }
    } else {
      requestAnimationFrame(scanQRCode); // Keep scanning
    }
  };

  // Show a popup when a duplicate QR code is detected
  const showDuplicatePopup = (qrData) => {
    setVerificationStatus(`Duplicate QR code detected: ${qrData}`);
    setShowModal(true); // Show the modal when a duplicate is found
  };

  // Initialize camera and start scanning QR codes
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  // Verify scanned QR code data
  const verifyData = (qrData) => {
    setLoading(true);
    try {
      console.log("Scanned QR Data:", qrData); // Log scanned QR code data
      let scannedData;

      try {
        scannedData = JSON.parse(qrData);
      } catch (error) {
        setVerificationStatus("Invalid QR Code: Could not parse JSON.");
        return;
      }

      // Check if all necessary fields are present in the QR code data
      if (!scannedData.token || !scannedData.name || !scannedData["rollNo"]) {
        setVerificationStatus("Invalid QR Code: Missing Token, Name, or Roll No.");
        return;
      }

      // Log the file data being used for comparison
      console.log("Uploaded File Data:", fileData);

      // Match QR code data with the file data based on Token, Name, and Roll No.
      const matchedData = fileData.find((entry) => {
        console.log("Comparing:", entry.Token, scannedData.token);
        return (
          entry.Token === scannedData.token
        );
      });

      if (matchedData) {
        setVerificationStatus(`Verification Successful! Matched data: ${JSON.stringify(matchedData)}`);
        const matchedIndex = fileData.findIndex(
          (entry) =>
            entry.Token === scannedData.token
        );
        setHighlightedRows((prevRows) => new Set(prevRows).add(matchedIndex)); // Add matched row to highlighted rows
      } else {
        setVerificationStatus("Data not found in the uploaded file.");
      }
    } catch (error) {
      console.error("Verification Error:", error);
      setVerificationStatus("Error in verification. Please try again.");
    } finally {
      setLoading(false);
      setShowModal(true); // Show modal when verification is complete
    }
  };

  // Close modal and reset the camera
  const closeModal = () => {
    setShowModal(false); // Close the verification modal
    refreshCamera(); // Reset the camera and restart scanning
  };

  // Refresh the camera and restart scanning
  const refreshCamera = () => {
    setTimeout(() => {
      startCamera(); // Ensure the startCamera is accessible outside the useEffect
      requestAnimationFrame(scanQRCode); // Resume QR code scanning
    }, 500); // Adjust the delay if necessary
  };

  // Start the camera function in useEffect
  useEffect(() => {
    startCamera();
    requestAnimationFrame(scanQRCode); // Begin scanning continuously

    return () => {
      videoRef.current?.srcObject?.getTracks()?.forEach(track => track.stop()); // Stop camera on unmount
    };
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Function to download the highlighted data as CSV
   // Download only highlighted rows as Excel file
   const downloadHighlightedData = () => {
    // Filter fileData to include only highlighted rows
    const highlightedData = fileData.filter((_, index) => highlightedRows.has(index));

    // Create a new workbook and add a worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(highlightedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Highlighted Data');

    // Trigger the file download
    XLSX.writeFile(wb, 'highlighted_data.xlsx');
  };

  return (
    <div className="App">
      <header className="App-header">
        
      </header>

      <h1>Event Check-In</h1>

        {/* File Upload */}
        <div className="form">
          <input type="file" accept=".xlsx, .xls, .csv, .json" onChange={handleFileUpload} />

          {/* Toggle Button for File Data
          {fileData.length > 0 && (
              <button onClick={() => setShowFileData((prev) => !prev)}>
                {showFileData ? "Hide Uploaded Data" : "Show Uploaded Data"}
              </button>
          )} */}

          {/* List of attendees from the uploaded file */}
          {fileData.length > 0 && showFileData && (
            <div className="file-data">
              <h3>Uploaded Data</h3>
              <table>
                <thead>
                  <tr>
                    <th>Token</th>  
                    <th>Name</th>
                    <th>Roll No.</th>
                  </tr>
                </thead>
                <tbody>
                  {fileData.map((entry, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: highlightedRows.has(index) ? 'green' : 'transparent', // Keep highlighted rows
                      }}
                    >
                      <td>{entry.Token}</td>
                      <td>{entry.Name}</td>
                      <td>{entry["Roll No."]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={downloadHighlightedData}>Download Highlighted Data</button>
            </div>
          )}
        </div>

        


        {/* QR Code Scanner */}
        <div className="qr-scanner">
          <video ref={videoRef} width="300" height="200" autoPlay></video>
          <canvas ref={canvasRef} width="300" height="200" style={{ display: "none" }}></canvas>
        </div>

        
        

        

        {/* Verification Modal */}
        {showModal && (
          <div className="modal">
            <div className="modal-content">
              <span className="close-btn" onClick={closeModal}>&times;</span>
              <h2
                className={
                  verificationStatus.includes('Duplicate')
                    ? 'modal-title duplicate'
                    : verificationStatus.includes('Successful')
                    ? 'modal-title success'
                    : 'modal-title'
                }
              >
                Verification Result
              <p>{verificationStatus}</p>
              </h2>
              <button onClick={closeModal}>Close</button>
            </div>
          </div>
        )}
    </div>
  );
}

export default App;
