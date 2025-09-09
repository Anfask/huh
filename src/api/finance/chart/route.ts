// app/api/finance/chart/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { sessionClaims, userId } = await auth();
    const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const requestedRole = searchParams.get("role");
    const requestedUserId = searchParams.get("userId");

    // Use provided parameters or fallback to auth data
    const effectiveRole = requestedRole || role;
    const effectiveUserId = requestedUserId || userId;

    // Determine the academic year to query
    // Determine the academic year to query
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const defaultAcademicYear = currentMonth >= 6
  ? `${currentYear}-${currentYear + 1}`
  : `${currentYear - 1}-${currentYear}`;

const queryAcademicYear = academicYear || defaultAcademicYear;


    // Build base query
    let whereClause: any = {
      academicYear: queryAcademicYear,
    };

    // Apply role-based restrictions
    if (effectiveRole === "student" && effectiveUserId) {
      whereClause.studentId = effectiveUserId;
    } else if (effectiveRole === "parent" && effectiveUserId) {
      // Get parent's children
      const parent = await prisma.parent.findUnique({
        where: { id: effectiveUserId },
        include: {
          students: {
            select: { id: true }
          }
        }
      });
      
      if (parent && parent.students.length > 0) {
        const studentIds = parent.students.map(student => student.id);
        whereClause.studentId = {
          in: studentIds
        };
      } else {
        // Parent has no children, return empty data
        return NextResponse.json(getEmptyMonthlyData());
      }
    }

    // Fetch all fees for the academic year
    const fees = await prisma.fee.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        paidDate: true,
        createdAt: true,
      },
    });

    // Process data by month
    const monthlyData = processFeesIntoMonthlyData(fees, queryAcademicYear);

    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error("Finance chart API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function processFeesIntoMonthlyData(fees: any[], academicYear: string) {
  // Academic year months in order (July to June)
  const months = [
    { name: 'Jul', month: 6 },
    { name: 'Aug', month: 7 },
    { name: 'Sep', month: 8 },
    { name: 'Oct', month: 9 },
    { name: 'Nov', month: 10 },
    { name: 'Dec', month: 11 },
    { name: 'Jan', month: 0 },
    { name: 'Feb', month: 1 },
    { name: 'Mar', month: 2 },
    { name: 'Apr', month: 3 },
    { name: 'May', month: 4 },
    { name: 'Jun', month: 5 },
  ];

  // Get the years from academic year string (e.g., "2024-2025")
  const [startYear, endYear] = academicYear.split('-').map(Number);
  
  const monthlyStats = months.map(({ name, month }) => {
    // Determine which calendar year this month belongs to
    const year = month >= 6 ? startYear : endYear;
    
    // Filter fees for this specific month
    const monthFees = fees.filter(fee => {
      const dueDate = new Date(fee.dueDate);
      const paidDate = fee.paidDate ? new Date(fee.paidDate) : null;
      
      // Check if fee is due in this month or was paid in this month
      const isDueThisMonth = dueDate.getFullYear() === year && dueDate.getMonth() === month;
      const wasPaidThisMonth = paidDate && paidDate.getFullYear() === year && paidDate.getMonth() === month;
      
      return isDueThisMonth || wasPaidThisMonth;
    });

    let collected = 0;
    let pending = 0;
    let overdue = 0;

    const currentDate = new Date();

    monthFees.forEach(fee => {
      const dueDate = new Date(fee.dueDate);
      const paidAmount = fee.paidAmount || 0;
      const totalAmount = fee.amount;
      const remainingAmount = totalAmount - paidAmount;

      if (fee.status === 'paid') {
        collected += paidAmount;
      } else if (fee.status === 'pending') {
        if (dueDate < currentDate) {
          overdue += remainingAmount;
        } else {
          pending += remainingAmount;
        }
      }

      // Also count partial payments
      if (paidAmount > 0 && fee.status !== 'paid') {
        collected += paidAmount;
      }
    });

    return {
      name,
      collected: Math.round(collected),
      pending: Math.round(pending),
      overdue: Math.round(overdue),
      total: Math.round(collected + pending + overdue),
    };
  });

  return monthlyStats;
}

function getEmptyMonthlyData() {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map(name => ({
    name,
    collected: 0,
    pending: 0,
    overdue: 0,
    total: 0,
  }));
}