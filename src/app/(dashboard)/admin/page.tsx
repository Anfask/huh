// AdminPage.tsx (Server Component)
import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import CountChartContainer from "@/components/CountChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FinanceChart from "@/components/FinanceChart";
import UserCard from "@/components/UserCard";
import Events from "@/components/Events";

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const AdminPage = async ({ searchParams }: Props) => {
  // Await the searchParams Promise
  const resolvedSearchParams = await searchParams;

  return (
    <div className="p-3 sm:p-4 lg:p-6 flex gap-4 sm:gap-6 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6 lg:gap-8">
        {/* USER CARDS */}
        <div className="flex gap-3 sm:gap-4 justify-between flex-wrap">
          <UserCard type="admin" />
          <UserCard type="teacher" />
          <UserCard type="student" />
          <UserCard type="parent" />
        </div>
        
        {/* MIDDLE CHARTS */}
        <div className="flex gap-4 sm:gap-6 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[350px] sm:h-[400px] lg:h-[450px]">
            <CountChartContainer />
          </div>
          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[350px] sm:h-[400px] lg:h-[450px]">
            <AttendanceChartContainer />
          </div>
        </div>
        
        {/* BOTTOM CHART - FINANCE */}
        <div className="w-full h-[450px] sm:h-[500px] lg:h-[550px] xl:h-[600px]">
          <FinanceChart />
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 lg:gap-8">
        <EventCalendarContainer searchParams={resolvedSearchParams} />
        <Announcements />
        <Events />
      </div>
    </div>
  );
};

export default AdminPage;