import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from '@/components/ui/table';

const ExcelPreview = ({ file }) => {
  const [sheetData, setSheetData] = useState([]);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    const readExcelFile = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // First row as headers
        const headers = jsonData[0];
        setColumns(headers);
        
        // Rest of the rows as data
        setSheetData(jsonData.slice(1, 21)); // Limit to first 20 rows
      } catch (error) {
        console.error('Error reading Excel file:', error);
      }
    };

    if (file) {
      readExcelFile();
    }
  }, [file]);

  if (!file) return null;

  return (
    <div className="mt-4">
      <h4 className="font-bold text-orange-700 mb-2">File Preview: {file.name}</h4>
      <div className="max-h-96 overflow-auto border rounded">
        <table className="w-full">
          <thead className="sticky top-0 bg-orange-100">
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className="px-3 py-2 text-left text-orange-700 border-b"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheetData.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-orange-50'} hover:bg-orange-100`}
              >
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="px-3 py-2 text-orange-600 border-b text-sm"
                  >
                    {cell !== null && cell !== undefined ? String(cell) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-orange-500 mt-2">
        Showing first 20 rows. Total columns: {columns.length}
      </p>
    </div>
  );
};

export default ExcelPreview;
