// AccountantPage.tsx (Server Component)
import Announcements from "@/components/Announcements";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FinanceChart from "@/components/FinanceChart";
import FeeForm from "@/components/forms/FeeForm";
import UserCard from "@/components/UserCard";
import { auth } from "@clerk/nextjs/server";
import { getStudents, getFeeTypes, getCurrentAccountant } from "@/lib/data";

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const AccountantPage = async ({ searchParams }: Props) => {
  // Await the searchParams Promise
  const resolvedSearchParams = await searchParams;
  
  // Clerk auth
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Please log in to access this page.</div>;
  }

  // Get current accountant data
  const currentAccountant = await getCurrentAccountant(userId);
  
  if (!currentAccountant) {
    return <div>Accountant profile not found. Please contact administrator.</div>;
  }

  // Fetch related data for FeeForm
  const students = await getStudents();
  const feeTypes = await getFeeTypes();

  return (
    <div className="p-3 sm:p-4 lg:p-6 flex gap-4 sm:gap-6 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6 lg:gap-8">
        {/* USER CARDS - Financial Overview */}
        <div className="flex gap-3 sm:gap-4 justify-between flex-wrap">
          <UserCard type="student" />
          <UserCard type="fee" />
          <UserCard type="payment" />
          <UserCard type="pending" />
        </div>

        {/* FINANCE OVERVIEW */}
        <div className="w-full h-[400px] sm:h-[500px] lg:h-[550px] xl:h-[600px] bg-white rounded-md shadow-md p-4">
          <FinanceChart userId={currentAccountant.id} role="accountant" />
        </div>
        
        {/* FEE FORM */}
        <div className="w-full bg-white rounded-md shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">Create New Fee</h2>
          <FeeForm
            type="create"
            setOpen={() => {}}
            relatedData={{ students, feeTypes }}
          />
        </div>
      </div>
      
      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 lg:gap-8">
        <EventCalendarContainer searchParams={resolvedSearchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default AccountantPage;