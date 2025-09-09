// components/MonthlyAttendance.tsx
"use client";
import React, { useState, useEffect } from "react";
import * as XLSX from "exceljs";

interface AttendanceRecord {
  id: number;
  date: Date;
  present: boolean;
  studentId: string;
}

interface MonthlyAttendanceProps {
  studentId: string;
  studentName: string;
  attendances: AttendanceRecord[];
}

const MonthlyAttendance: React.FC<MonthlyAttendanceProps> = ({
  studentId,
  studentName,
  attendances,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(1 - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    // Generate 42 days (6 weeks) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      const dayAttendance = attendances.find(
        (record) => record.date.toDateString() === currentDate.toDateString()
      );

      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === selectedMonth,
        attendance: dayAttendance,
        isToday:
          currentDate.toDateString() ===
          new Date().toLocaleDateString("en-GB").split("/").reverse().join("-"),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // Get attendance status for a day
  const getAttendanceStatus = (day: any) => {
    if (!day.isCurrentMonth || !day.attendance) return null;
    return day.attendance.present ? "P" : "A";
  };

  // Get cell styling based on attendance
  const getCellStyle = (day: any) => {
    const baseStyle =
      "w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg border transition-colors";

    if (!day.isCurrentMonth) {
      return `${baseStyle} text-gray-300 bg-gray-50`;
    }

    if (day.isToday) {
      return `${baseStyle} border-blue-500 bg-blue-50 text-blue-700`;
    }

    if (day.attendance) {
      if (day.attendance.present) {
        return `${baseStyle} bg-green-100 text-green-800 border-green-200`;
      } else {
        return `${baseStyle} bg-red-100 text-red-800 border-red-200`;
      }
    }

    return `${baseStyle} border-gray-200 hover:bg-gray-50`;
  };

  // Calculate attendance statistics
  const calculateStats = () => {
    const currentMonthAttendance = attendances.filter(
      (record) =>
        record.date.getMonth() === selectedMonth &&
        record.date.getFullYear() === selectedYear
    );

    const totalDays = currentMonthAttendance.length;
    const presentDays = currentMonthAttendance.filter(
      (record) => record.present
    ).length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage =
      totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "0";

    return { totalDays, presentDays, absentDays, attendancePercentage };
  };

  // Export to Excel
  const exportToExcel = () => {
    const stats = calculateStats();
    const monthName = months[selectedMonth];

    // Prepare data for Excel
    const calendarDays = generateCalendarDays();
    const excelData = [];

    // Add header information
    excelData.push(["Student Monthly Attendance Report"]);
    excelData.push(["Student Name:", studentName]);
    excelData.push(["Month:", `${monthName} ${selectedYear}`]);
    excelData.push(["Total Days:", stats.totalDays]);
    excelData.push(["Present Days:", stats.presentDays]);
    excelData.push(["Absent Days:", stats.absentDays]);
    excelData.push(["Attendance Percentage:", `${stats.attendancePercentage}%`]);
    excelData.push([""]); // Empty row

    // Add calendar header
    excelData.push(["Date", "Day", "Status", "Mark"]);

    // Add calendar data
    calendarDays
      .filter((day) => day.isCurrentMonth && day.attendance)
      .forEach((day) => {
        excelData.push([
          day.date.toLocaleDateString(),
          weekDays[day.date.getDay()],
          day.attendance?.present ? "Present" : "Absent",
          day.attendance?.present ? "P" : "A",
        ]);
      });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    ws["!cols"] = [
      { width: 15 },
      { width: 10 },
      { width: 10 },
      { width: 8 },
    ];

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    // Save the file
    const fileName = `${studentName}_Attendance_${monthName}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const calendarDays = generateCalendarDays();
  const stats = calculateStats();

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Monthly Attendance</h3>
        <button
          onClick={exportToExcel}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export Excel
        </button>
      </div>

      {/* Month/Year selector */}
      <div className="flex gap-2 items-center">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {months.map((month, index) => (
            <option key={index} value={index}>
              {month}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {Array.from({ length: 5 }, (_, i) =>
            new Date().getFullYear() - 2 + i
          ).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-600">Total Days</p>
          <p className="text-lg font-bold text-blue-800">{stats.totalDays}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-green-600">Present</p>
          <p className="text-lg font-bold text-green-800">{stats.presentDays}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <p className="text-xs text-red-600">Absent</p>
          <p className="text-lg font-bold text-red-800">{stats.absentDays}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-purple-600">Percentage</p>
          <p className="text-lg font-bold text-purple-800">
            {stats.attendancePercentage}%
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-center font-semibold text-gray-800 mb-4">
          {months[selectedMonth]} {selectedYear}
        </h4>

        {/* Week days header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={getCellStyle(day)}
              title={
                day.attendance
                  ? day.attendance.present
                    ? "Present"
                    : "Absent"
                  : "No data"
              }
            >
              <div className="text-center">
                <div className="text-xs">{day.date.getDate()}</div>
                {getAttendanceStatus(day) && (
                  <div className="text-xs font-bold">
                    {getAttendanceStatus(day)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
          <span>Present (P)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
          <span>Absent (A)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-blue-500 bg-blue-50 rounded"></div>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAttendance;