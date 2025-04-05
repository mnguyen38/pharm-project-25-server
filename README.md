# Pharm Project 25 Server

## How to Start the App

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB

### Installation
```
npm install --include=dev
```
Create a .env file in the root directory and add your environment variables:

```
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
```
Start the server:
```
npm start
```
This will start the server on http://localhost:4000 with hot reload enabled using nodemon.

### Endpoints

#### Upload PDF and trigger PDF parsing
```
curl -X POST http://localhost:4000/uploadPdf -F "pdf=@/path/to/your/file.pdf"
```

#### Check PDF parsing status
```
curl http://localhost:4000/pdfStatus/:jobId
```

The PDF parsing process now supports:
- Large files by chunking PDFs into 5-page segments
- Progress tracking via status polling
- Asynchronous processing with status updates

### Error Handling

If you encounter "No job ID returned from server" errors:
1. Ensure the server is running
2. Check if the uploaded_files directory exists (it will be created automatically)
3. Verify that your .env file contains a valid GEMINI_API_KEY