// app/api/finance/chart/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  console.log(' Finance Chart API called');
  
  try {
    // Auth check
    console.log(' Checking authentication...');
    const { sessionClaims, userId } = await auth();
    const role = (sessionClaims?.publicMetadata as { role?: string })?.role;
    
    console.log('👤 Auth data:', { userId, role });

    if (!userId) {
      console.log(' No userId found, returning 401');
      return NextResponse.json({ error: "Unauthorized" }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const requestedRole = searchParams.get("role");
    const requestedUserId = searchParams.get("userId");

    console.log(' Query params:', { academicYear, requestedRole, requestedUserId });

    // Use provided parameters or fallback to auth data
    const effectiveRole = requestedRole || role;
    const effectiveUserId = requestedUserId || userId;

    console.log(' Effective params:', { effectiveRole, effectiveUserId });

    // Determine the academic year to query
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const defaultAcademicYear = currentMonth >= 6 ? 
      `${currentYear}-${currentYear + 1}` : 
      `${currentYear - 1}-${currentYear}`;
    
    const queryAcademicYear = academicYear || defaultAcademicYear;
    console.log(' Academic year to query:', queryAcademicYear);

    // Validate academic year format
    if (!queryAcademicYear || !queryAcademicYear.includes('-')) {
      console.log(' Invalid academic year format:', queryAcademicYear);
      return NextResponse.json(getEmptyMonthlyData(), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build base query
    let whereClause: any = {
      academicYear: queryAcademicYear,
    };

    console.log(' Initial where clause:', whereClause);

    // Apply role-based restrictions
    if (effectiveRole === "student" && effectiveUserId) {
      whereClause.studentId = effectiveUserId;
      console.log(' Applied student filter:', whereClause);
    } else if (effectiveRole === "parent" && effectiveUserId) {
      console.log(' Fetching parent data...');
      
      try {
        // Get parent's children
        const parent = await prisma.parent.findUnique({
          where: { id: effectiveUserId },
          include: {
            students: {
              select: { id: true }
            }
          }
        });
        
        console.log(' Parent data:', parent ? `Found with ${parent.students.length} children` : 'Not found');
        
        if (parent && parent.students.length > 0) {
          const studentIds = parent.students.map(student => student.id);
          whereClause.studentId = {
            in: studentIds
          };
          console.log(' Applied parent filter for students:', studentIds);
        } else {
          // Parent has no children, return empty data
          console.log(' Parent has no children, returning empty data');
          return NextResponse.json(getEmptyMonthlyData(), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (parentError) {
        console.error(' Error fetching parent data:', parentError);
        return NextResponse.json(getEmptyMonthlyData(), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(' Final where clause:', whereClause);

    // Fetch all fees for the academic year
    console.log(' Fetching fees from database...');
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

    console.log(' Fetched fees:', fees.length, 'records');
    
    if (fees.length > 0) {
      console.log(' Sample fee:', {
        id: fees[0].id,
        amount: fees[0].amount,
        status: fees[0].status,
        dueDate: fees[0].dueDate
      });
    }

    // Process data by month
    console.log(' Processing fees into monthly data...');
    const monthlyData = processFeesIntoMonthlyData(fees, queryAcademicYear);
    
    console.log(' Processed monthly data:', monthlyData.length, 'months');
    console.log(' Sample month data:', monthlyData[0]);

    const response = NextResponse.json(monthlyData, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(' Returning successful response');
    return response;

  } catch (error) {
    console.error(" Finance chart API error:", error);
    console.error(" Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // Ensure we always return JSON, even for errors
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

function processFeesIntoMonthlyData(fees: any[], academicYear: string) {
  console.log(' Processing', fees.length, 'fees for academic year:', academicYear);
  
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

  // Validate academicYear format
  if (!academicYear || !academicYear.includes('-')) {
    console.warn(' Invalid academic year format:', academicYear);
    return getEmptyMonthlyData();
  }

  // Get the years from academic year string (e.g., "2024-2025")
  const yearParts = academicYear.split('-');
  if (yearParts.length !== 2) {
    console.warn(' Invalid academic year format:', academicYear);
    return getEmptyMonthlyData();
  }

  const [startYear, endYear] = yearParts.map(year => {
    const parsed = parseInt(year, 10);
    if (isNaN(parsed)) {
      console.warn(' Invalid year in academic year:', year);
      return new Date().getFullYear();
    }
    return parsed;
  });
  
  console.log(' Academic year range:', startYear, 'to', endYear);
  
  const monthlyStats = months.map(({ name, month }) => {
    // Determine which calendar year this month belongs to
    const year = month >= 6 ? startYear : endYear;
    
    // Filter fees for this specific month
    const monthFees = fees.filter(fee => {
      if (!fee.dueDate) return false;
      
      const dueDate = new Date(fee.dueDate);
      const paidDate = fee.paidDate ? new Date(fee.paidDate) : null;
      
      // Validate dates
      if (isNaN(dueDate.getTime())) {
        console.warn(' Invalid due date for fee:', fee.id, fee.dueDate);
        return false;
      }
      if (paidDate && isNaN(paidDate.getTime())) {
        console.warn(' Invalid paid date for fee:', fee.id, fee.paidDate);
        return false;
      }
      
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
      const totalAmount = fee.amount || 0;
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

    const monthData = {
      name,
      collected: Math.round(collected),
      pending: Math.round(pending),
      overdue: Math.round(overdue),
      total: Math.round(collected + pending + overdue),
    };

    if (monthFees.length > 0) {
      console.log(` ${name} ${year}:`, monthData, `(${monthFees.length} fees)`);
    }

    return monthData;
  });

  const totals = monthlyStats.reduce((acc, month) => ({
    collected: acc.collected + month.collected,
    pending: acc.pending + month.pending,
    overdue: acc.overdue + month.overdue,
    total: acc.total + month.total
  }), { collected: 0, pending: 0, overdue: 0, total: 0 });

  console.log(' Total stats:', totals);
  
  return monthlyStats;
}

function getEmptyMonthlyData() {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const emptyData = months.map(name => ({
    name,
    collected: 0,
    pending: 0,
    overdue: 0,
    total: 0,
  }));
  
  console.log(' Returning empty monthly data');
  return emptyData;
}