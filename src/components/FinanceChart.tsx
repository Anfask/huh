"use client";

import Image from "next/image";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useEffect, useState, useCallback } from "react";

interface MonthlyData {
  name: string;
  collected: number;
  pending: number;
  overdue: number;
  total: number;
}

interface FinanceChartProps {
  userId?: string;
  role?: string;
}

const FinanceChart = ({ userId, role }: FinanceChartProps) => {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    // Academic year starts in July (month 6)
    return currentMonth >= 6 ? 
      `${currentYear}-${currentYear + 1}` : 
      `${currentYear - 1}-${currentYear}`;
  });

  const getDefaultData = useCallback((): MonthlyData[] => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      name: month,
      collected: Math.floor(Math.random() * 50000) + 20000,
      pending: Math.floor(Math.random() * 30000) + 10000,
      overdue: Math.floor(Math.random() * 15000) + 5000,
      total: 0,
    }));
  }, []);

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        academicYear: selectedYear,
        ...(userId && { userId }),
        ...(role && { role }),
      });

      const response = await fetch(`/api/finance/chart?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch finance data');
      }

      const chartData = await response.json();
      setData(chartData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(getDefaultData());
    } finally {
      setLoading(false);
    }
  }, [selectedYear, userId, role, getDefaultData]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const formatCurrency = useCallback((value: number) => {
    return `₹${value.toLocaleString()}`;
  }, []);

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border-0 rounded-xl shadow-2xl ring-1 ring-black/5">
          <p className="font-bold text-gray-900 text-base mb-2">{`${label}`}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="font-medium text-sm" style={{ color: entry.color }}>
                  {entry.name}: {formatCurrency(entry.value || 0)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <p className="font-bold text-gray-900">
                Total: {formatCurrency((payload[0]?.value || 0) + (payload[1]?.value || 0) + (payload[2]?.value || 0))}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, [formatCurrency]);

  const getYearOptions = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      const academicYear = `${year}-${year + 1}`;
      years.push(academicYear);
    }
    return years;
  }, []);

  const getTitle = useCallback(() => {
    if (role === "student") return "My Fee Payments";
    if (role === "parent") return "Children's Fee Payments";
    return "Financial Overview";
  }, [role]);

  const getTotalStats = useCallback(() => {
    return {
      collected: data.reduce((sum, item) => sum + item.collected, 0),
      pending: data.reduce((sum, item) => sum + item.pending, 0),
      overdue: data.reduce((sum, item) => sum + item.overdue, 0),
    };
  }, [data]);

  const stats = getTotalStats();

  const renderChart = useCallback(() => {
    const commonProps = {
      width: 500,
      height: 300,
      data: data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="collectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            tickMargin={15}
          />
          <YAxis 
            axisLine={false} 
            tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} 
            tickLine={false}
            tickMargin={20}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="collected"
            stackId="1"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#collectedGradient)"
            name="Collected"
          />
          <Area
            type="monotone"
            dataKey="pending"
            stackId="1"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#pendingGradient)"
            name="Pending"
          />
          <Area
            type="monotone"
            dataKey="overdue"
            stackId="1"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#overdueGradient)"
            name="Overdue"
          />
        </AreaChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
          tickLine={false}
          tickMargin={15}
        />
        <YAxis 
          axisLine={false} 
          tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} 
          tickLine={false}
          tickMargin={20}
          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="collected"
          stroke="#10b981"
          strokeWidth={3}
          name="Collected"
          dot={{ fill: "#10b981", strokeWidth: 2, r: 5 }}
          activeDot={{ r: 7, stroke: "#10b981", strokeWidth: 3, fill: "#fff" }}
        />
        <Line
          type="monotone"
          dataKey="pending"
          stroke="#f59e0b"
          strokeWidth={3}
          name="Pending"
          dot={{ fill: "#f59e0b", strokeWidth: 2, r: 5 }}
          activeDot={{ r: 7, stroke: "#f59e0b", strokeWidth: 3, fill: "#fff" }}
        />
        <Line
          type="monotone"
          dataKey="overdue"
          stroke="#ef4444"
          strokeWidth={3}
          name="Overdue"
          dot={{ fill: "#ef4444", strokeWidth: 2, r: 5 }}
          activeDot={{ r: 7, stroke: "#ef4444", strokeWidth: 3, fill: "#fff" }}
        />
      </LineChart>
    );
  }, [chartType, data, CustomTooltip]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl w-full h-full p-6 border border-gray-100/50 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{getTitle()}</h1>
            <p className="text-sm text-gray-500 mt-1">Academic Year {selectedYear}</p>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
        </div>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-2"></div>
            <div className="text-gray-400">Loading financial data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-xl sm:rounded-2xl w-full h-full p-3 sm:p-4 lg:p-6 border border-gray-100/50 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">{getTitle()}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Academic Year {selectedYear}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Chart Type Toggle */}
          <div className="hidden sm:flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-all ${
                chartType === 'area' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-all ${
                chartType === 'line' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Line
            </button>
          </div>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs sm:text-sm border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium min-w-0 flex-shrink-0"
          >
            {getYearOptions().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          
          <Link 
            href="/list/fees"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Image src="/moreDark.png" alt="View all fees" width={20} height={20} />
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <p className="text-red-700 text-sm font-medium">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-sm font-medium text-green-700">Collected</p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(stats.collected)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {((stats.collected / (stats.collected + stats.pending + stats.overdue)) * 100).toFixed(1)}% of total
          </p>
        </div>
        
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <p className="text-sm font-medium text-yellow-700">Pending</p>
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            {formatCurrency(stats.pending)}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            {((stats.pending / (stats.collected + stats.pending + stats.overdue)) * 100).toFixed(1)}% of total
          </p>
        </div>
        
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <p className="text-sm font-medium text-red-700">Overdue</p>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {formatCurrency(stats.overdue)}
          </p>
          <p className="text-xs text-red-600 mt-1">
            {((stats.overdue / (stats.collected + stats.pending + stats.overdue)) * 100).toFixed(1)}% of total
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <ResponsiveContainer width="100%" height={280}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FinanceChart;