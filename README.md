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
#### Upload pdf and trigger pdf parsing
```
curl -X POST http://localhost:4000/uploadPdf -F "pdf=@/path/to/your/file.pdf"
```