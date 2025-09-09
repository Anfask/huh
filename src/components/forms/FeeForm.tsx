"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useTransition } from "react";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import InputField from "../InputField";
import { feeSchema, type FeeSchema } from "@/lib/formValidationSchemas";
import { createFee, updateFee } from "@/lib/actions";
import Select from "react-select";

const FeeForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  // Helper function to format Date to date input format
  const formatDate = (date: Date | string) => {
    if (!date) return "";
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return "";
    
    // Format as YYYY-MM-DD (date input format)
    return dateObj.toISOString().split('T')[0];
  };

  // Get current academic year
  const getCurrentAcademicYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    // Academic year starts in July (month 6)
    return currentMonth >= 6 ? 
      `${currentYear}-${currentYear + 1}` : 
      `${currentYear - 1}-${currentYear}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FeeSchema>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      studentId: data?.studentId || "",
      feeTypeId: data?.feeTypeId?.toString() || "",
      amount: data?.amount || "",
      dueDate: formatDate(data?.dueDate) || "",
      academicYear: data?.academicYear || getCurrentAcademicYear(),
      semester: data?.semester || "1",
      description: data?.description || "",
      status: data?.status || "pending",
      paidAmount: data?.paidAmount || "",
      paidDate: formatDate(data?.paidDate) || "",
      paymentMethod: data?.paymentMethod || "",
      transactionId: data?.transactionId || "",
      ...(data?.id && { id: data.id }),
    },
  });

  const [state, formAction] = useActionState(
    type === "create" ? createFee : updateFee,
    { success: false, error: false, errorMessage: "" }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Watch status to conditionally show payment fields
  const watchedStatus = watch("status");
  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast(`Fee ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && state.errorMessage) {
      toast.error(state.errorMessage);
    }
  }, [state, type, setOpen, router]);

  // Get data from relatedData with fallbacks
  const students = relatedData?.students || [];
  const feeTypes = relatedData?.feeTypes || [];

  // Generate academic year options
  const getAcademicYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  };

  // Prepare student options for react-select
  const studentOptions = students.map((student: any) => ({
    value: student.id,
    label: `${student.name} ${student.surname || ''}`.trim(),
  }));

  // Handle student selection change
  const handleStudentChange = (selectedOption: any) => {
    setValue("studentId", selectedOption ? selectedOption.value : "", {
      shouldValidate: true,
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">
        {type === "create" ? "Create a new fee" : "Update the fee"}
      </h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Fee Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Selection with react-select */}
          <div>
            <label className="block text-sm font-medium mb-1">Student *</label>
            <Select
              options={studentOptions}
              onChange={handleStudentChange}
              placeholder="Select a student..."
              className="text-sm"
              defaultValue={studentOptions.find(
                (option: any) => option.value === data?.studentId
              )}
              styles={{
                control: (base) => ({
                  ...base,
                  border: '1px solid rgb(209 213 219)',
                  borderRadius: '0.25rem',
                  padding: '0.25rem',
                  '&:hover': {
                    border: '1px solid rgb(209 213 219)',
                  },
                }),
              }}
            />
            {errors.studentId?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.studentId.message.toString()}</p>
            )}
          </div>

          {/* Fee Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Fee Type *</label>
            <select
              className="w-full p-2 border rounded"
              {...register("feeTypeId")}
            >
              <option value="">Select fee type...</option>
              {feeTypes.map((feeType: any) => (
                <option key={feeType.id} value={feeType.id.toString()}>
                  {feeType.name}
                  {feeType.defaultAmount && ` - ₹${feeType.defaultAmount.toLocaleString()}`}
                </option>
              ))}
            </select>
            {errors.feeTypeId?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.feeTypeId.message.toString()}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              {...register("amount")}
            />
            {errors.amount?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.amount.message.toString()}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Due Date *</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              {...register("dueDate")}
            />
            {errors.dueDate?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.dueDate.message.toString()}</p>
            )}
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium mb-1">Academic Year *</label>
            <select
              className="w-full p-2 border rounded"
              {...register("academicYear")}
            >
              {getAcademicYearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {errors.academicYear?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.academicYear.message.toString()}</p>
            )}
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium mb-1">Semester *</label>
            <select
              className="w-full p-2 border rounded"
              {...register("semester")}
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="annual">Annual</option>
            </select>
            {errors.semester?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.semester.message.toString()}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Payment Status *</label>
            <select
              className="w-full p-2 border rounded"
              {...register("status")}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {errors.status?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.status.message.toString()}</p>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full p-2 border rounded"
              rows={3}
              {...register("description")}
              placeholder="Optional description or notes..."
            />
            {errors.description?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message.toString()}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Payment Details Section - Show only if status is paid or partial */}
      {(watchedStatus === "paid" || watchedStatus === "partial") && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-gray-400">Payment Details</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paid Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Paid Amount (₹) {watchedStatus === "paid" ? "*" : ""}
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                {...register("paidAmount")}
              />
              {errors.paidAmount?.message && (
                <p className="text-red-500 text-xs mt-1">{errors.paidAmount.message.toString()}</p>
              )}
            </div>

            {/* Paid Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Payment Date {watchedStatus === "paid" ? "*" : ""}
              </label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                {...register("paidDate")}
              />
              {errors.paidDate?.message && (
                <p className="text-red-500 text-xs mt-1">{errors.paidDate.message.toString()}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Payment Method {watchedStatus === "paid" ? "*" : ""}
              </label>
              <select
                className="w-full p-2 border rounded"
                {...register("paymentMethod")}
              >
                <option value="">Select method...</option>
                <option value="cash">Cash</option>
                <option value="card">Debit/Credit Card</option>
                <option value="upi">UPI</option>
                <option value="netbanking">Net Banking</option>
                <option value="cheque">Cheque</option>
                <option value="demand_draft">Demand Draft</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
              {errors.paymentMethod?.message && (
                <p className="text-red-500 text-xs mt-1">{errors.paymentMethod.message.toString()}</p>
              )}
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium mb-1">Transaction ID / Reference</label>
              <input
                className="w-full p-2 border rounded"
                {...register("transactionId")}
              />
              {errors.transactionId?.message && (
                <p className="text-red-500 text-xs mt-1">{errors.transactionId.message.toString()}</p>
              )}
            </div>
          </div>
        </fieldset>
      )}

      {/* Hidden ID field for updates */}
      {data?.id && (
        <input type="hidden" {...register("id")} defaultValue={data.id} />
      )}
      
      {state.error && state.errorMessage && (
        <p className="text-red-500 text-sm">{state.errorMessage}</p>
      )}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isPending
            ? type === "create" ? "Creating..." : "Updating..."
            : type === "create" ? "Create" : "Update"}
        </button>
      </div>
    </form>
  );
};

export default FeeForm;