"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { type Dispatch, type SetStateAction, startTransition, useActionState, useEffect, useState } from "react";
import { createAttendances } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  teacherAttendanceSchema,
  TeacherAttendanceSchema,
} from "@/lib/formValidationSchemas";

const TeacherAttendanceForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: {
    students: { id: string; name: string }[];
  };
}) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeacherAttendanceSchema>({
    resolver: zodResolver(teacherAttendanceSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      attendances:
        relatedData?.students.map((student) => ({
          studentId: student.id,
          present: false,
        })) || [],
    },
  });
  
  const { fields } = useFieldArray({
    control,
    name: "attendances",
  });

  const [state, formAction] = useActionState(createAttendances, {
    success: false,
    error: false,
    errorMessage: "",
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast("Attendances have been recorded!");
      setOpen(false);
      router.refresh();
    }
  }, [state, router, setOpen]);

  const { students = [] } = relatedData || {};

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData); 
    });
  },
  (formErrors) => {
    console.log("VALIDATION ERRORS", formErrors); 
  });

  // Watch all attendance values
  const attendances = watch("attendances");
  
  // Check if all students are selected
  const allSelected = attendances?.every(att => att.present) || false;

  // Toggle select all function
  const toggleSelectAll = () => {
    const newValue = !allSelected;
    fields.forEach((_, index) => {
      setValue(`attendances.${index}.present`, newValue);
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-semibold">Record Attendance for Students</h2>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-400">Attendance Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              {...register("date")}
              className="w-full p-2 border rounded"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
            {errors.date?.message && (
              <p className="text-red-500 text-xs mt-1">{errors.date.message.toString()}</p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <div className="flex justify-between items-center">
          <legend className="text-sm font-medium text-gray-400">Students</legend>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-hide">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Present
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, index) => {
                const student = students.find((s) => s.id === field.studentId);
                return (
                  <tr key={field.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Controller
                        name={`attendances.${index}.present`}
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        )}
                      />
                      <input
                        type="hidden"
                        {...register(`attendances.${index}.studentId`)}
                        value={field.studentId}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {errors.attendances?.message && (
          <p className="text-red-500 text-xs mt-1">{errors.attendances.message.toString()}</p>
        )}
      </fieldset>

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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Record Attendances
        </button>
      </div>
    </form>
  );
};

export default TeacherAttendanceForm;